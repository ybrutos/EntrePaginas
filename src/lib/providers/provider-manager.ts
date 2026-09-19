import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  SearchFilters 
} from './book-provider.interface';
import { GutenbergProvider } from './adapters/gutenberg.provider';
import { OpenLibraryProvider } from './adapters/open-library.provider';
import { LibriVoxProvider } from './adapters/librivox.provider';
import { InternetArchiveProvider } from './adapters/internet-archive.provider';
import { StandardEbooksProvider } from './adapters/standard-ebooks.provider';
import { WikisourceProvider } from './adapters/wikisource.provider';
import { GoogleBooksProvider } from './adapters/google-books.provider';
import { EuropeanaProvider } from './adapters/europeana.provider';
import { deduplicateBooks } from '../utils/deduplication';
import { db } from '../db';
import { PROVIDERS_CONFIG, ProviderConfig } from './provider.config';

interface MemoryCacheEntry {
  data: BookSearchResult;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

export class BookProviderManager {
  private providers: Map<string, BookProvider> = new Map();

  constructor() {
    this.registerProvider(new GutenbergProvider());
    this.registerProvider(new OpenLibraryProvider());
    this.registerProvider(new LibriVoxProvider());
    this.registerProvider(new InternetArchiveProvider());
    this.registerProvider(new StandardEbooksProvider());
    this.registerProvider(new WikisourceProvider());
    this.registerProvider(new GoogleBooksProvider());
    this.registerProvider(new EuropeanaProvider());
  }

  registerProvider(provider: BookProvider) {
    this.providers.set(provider.name, provider);
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  getProvider(name: string): BookProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): BookProvider[] {
    return Array.from(this.providers.values());
  }

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    const cleanQ = (query || 'Machado de Assis').trim().toLowerCase();
    const cacheKey = `search:${cleanQ}:${JSON.stringify(filters || {})}`;
    const now = Date.now();

    // 1. Camada de Cache em Memória
    const memCached = memoryCache.get(cacheKey);
    if (memCached && memCached.expiresAt > now) {
      return memCached.data;
    }

    // 2. Camada de Cache no Banco de Dados
    try {
      const dbCached = await db.searchCache.findUnique({
        where: { queryHash: cacheKey },
      });
      if (dbCached && dbCached.expiresAt > new Date()) {
        const parsed = JSON.parse(dbCached.responseJson) as BookSearchResult;
        memoryCache.set(cacheKey, { data: parsed, expiresAt: dbCached.expiresAt.getTime() });
        return parsed;
      }
    } catch (e) {
      // Falha silenciosa no cache
    }

    // 3. Determina provedores ativos
    let activeProviders: BookProvider[] = [];
    if (filters?.source && filters.source !== 'all') {
      const p = this.providers.get(filters.source);
      if (p) activeProviders.push(p);
    } else {
      activeProviders = Array.from(this.providers.values());
    }

    // Se o filtro exigir audiolivro, prioriza LibriVox
    if (filters?.hasAudiobook) {
      const librivox = this.providers.get('librivox');
      activeProviders = librivox ? [librivox] : [];
    }

    // 4. Execução em paralelo com tolerância a falhas (Promise.allSettled)
    const results = await Promise.allSettled(
      activeProviders.map(async (provider) => {
        const start = Date.now();
        try {
          const res = await provider.searchBooks(cleanQ, filters);
          const duration = Date.now() - start;

          // Gravação assíncrona de log de telemetria
          db.providerLog.create({
            data: {
              provider: provider.name,
              endpoint: 'searchBooks',
              status: 'OK',
              durationMs: duration,
            },
          }).catch(() => {});

          return res;
        } catch (err: any) {
          db.providerLog.create({
            data: {
              provider: provider.name,
              endpoint: 'searchBooks',
              status: 'ERROR',
              durationMs: Date.now() - start,
              errorMessage: err.message,
            },
          }).catch(() => {});
          return { totalCount: 0, items: [], page: 1, provider: provider.name };
        }
      })
    );

    let allBooks: UnifiedBook[] = [];
    let successfulSourcesCount = 0;

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value?.items) {
        allBooks.push(...res.value.items);
        if (res.value.items.length > 0) successfulSourcesCount++;
      }
    }

    // 5. Deduplicação e Consolidação Canônica 2.0
    let consolidated = deduplicateBooks(allBooks);

    // 6. Filtros pós-agregação
    if (filters?.publicDomainOnly) {
      consolidated = consolidated.filter((b) => b.isPublicDomain);
    }
    if (filters?.hasLegalDownload) {
      consolidated = consolidated.filter((b) => b.downloadOptions.some((d) => d.isDirectDownload));
    }
    if (filters?.hasAudiobook) {
      consolidated = consolidated.filter((b) => b.hasAudiobook);
    }

    // 7. Ordenação
    if (filters?.sortBy === 'title') {
      consolidated.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters?.sortBy === 'author') {
      consolidated.sort((a, b) => (a.authors[0] || '').localeCompare(b.authors[0] || ''));
    } else if (filters?.sortBy === 'year') {
      consolidated.sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));
    } else if (filters?.sortBy === 'sources') {
      consolidated.sort((a, b) => b.sources.length - a.sources.length);
    } else {
      // Ordenação padrão por relevância, priorizando obras com download direto
      consolidated.sort((a, b) => {
        const aHasDownload = (a.downloadOptions?.length || 0) > 0 ? 1 : 0;
        const bHasDownload = (b.downloadOptions?.length || 0) > 0 ? 1 : 0;
        if (aHasDownload !== bHasDownload) return bHasDownload - aHasDownload;
        return (b.sourcesCount || b.sources.length) - (a.sourcesCount || a.sources.length);
      });
    }

    const finalResult: BookSearchResult = {
      totalCount: consolidated.length,
      items: consolidated,
      page: filters?.page || 1,
      provider: 'aggregated',
      sourcesCount: successfulSourcesCount,
    };

    // 8. Salva no Cache
    const ttlMs = 86400 * 1000;
    const expiresAtDate = new Date(now + ttlMs);
    memoryCache.set(cacheKey, { data: finalResult, expiresAt: expiresAtDate.getTime() });

    try {
      await db.searchCache.upsert({
        where: { queryHash: cacheKey },
        create: {
          queryHash: cacheKey,
          query: cleanQ,
          provider: 'aggregated',
          responseJson: JSON.stringify(finalResult),
          expiresAt: expiresAtDate,
        },
        update: {
          responseJson: JSON.stringify(finalResult),
          expiresAt: expiresAtDate,
        },
      });
    } catch (e) {}

    return finalResult;
  }

  async getBook(id: string): Promise<UnifiedBook | null> {
    // 1. Tenta no banco de dados local
    try {
      const dbBook = await db.book.findFirst({
        where: {
          OR: [{ id }, { slug: id }],
        },
        include: {
          authors: { include: { author: true } },
          genres: { include: { genre: true } },
          sources: true,
          formats: true,
        },
      });

      if (dbBook) {
        return {
          id: dbBook.id,
          slug: dbBook.slug,
          title: dbBook.title,
          subtitle: dbBook.subtitle || undefined,
          authors: dbBook.authors.map((a) => a.author.name),
          description: dbBook.description || undefined,
          coverUrl: dbBook.coverUrl || undefined,
          publicationYear: dbBook.publicationYear || undefined,
          language: dbBook.language,
          genres: dbBook.genres.map((g) => g.genre.name),
          publisher: dbBook.publisher || undefined,
          isbn: dbBook.isbn || undefined,
          pageCount: dbBook.pageCount || undefined,
          estimatedWords: dbBook.estimatedWords || undefined,
          isPublicDomain: dbBook.isPublicDomain,
          hasAudiobook: dbBook.hasAudiobook,
          license: dbBook.license || undefined,
          officialSourceUrl: dbBook.officialSourceUrl || undefined,
          sources: dbBook.sources.map((s) => ({
            sourceName: s.sourceName,
            externalId: s.externalId,
            canonicalUrl: s.canonicalUrl || undefined,
            license: s.license || undefined,
            isLegalDownload: s.isLegalDownload,
            isAudiobook: s.isAudiobook,
          })),
          downloadOptions: dbBook.formats.map((f) => ({
            format: f.format,
            url: f.downloadUrl,
            sizeBytes: f.fileSizeBytes ? Number(f.fileSizeBytes) : undefined,
            isDirectDownload: f.isDirectDownload,
            durationMinutes: f.durationMinutes || undefined,
            narrator: f.narrator || undefined,
            audioStreamingUrl: f.audioStreamingUrl || undefined,
          })),
        };
      }
    } catch (e) {}

    // 2. Encaminha para provedor específico caso haja prefixo conhecido
    for (const [name, provider] of this.providers.entries()) {
      if (id.startsWith(`${name}:`)) {
        return provider.getBook(id);
      }
    }

    // 3. Tenta em provedores registrados no ProviderRegistry V2
    try {
      const { providerRegistry } = await import('./provider-registry');
      for (const p of providerRegistry.list()) {
        if (id.startsWith(`${p.id}:`) || id.startsWith(p.id.slice(0, 3))) {
          const res = await p.getBook(id);
          if (res) {
            return {
              id: res.id,
              slug: res.id.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
              title: (res as any).canonicalTitle || (res as any).title,
              authors: (res as any).authors || [(res as any).primaryAuthorName || 'Autor Desconhecido'],
              description: (res as any).description,
              coverUrl: (res as any).coverUrl,
              publicationYear: (res as any).firstPublicationYear || (res as any).publicationYear,
              language: (res as any).editions?.[0]?.language || (res as any).language || 'pt',
              genres: (res as any).genres || [],
              publisher: (res as any).editions?.[0]?.publisher,
              isPublicDomain: (res as any).accessLinks?.some((l: any) => l.type === 'PUBLIC_DOMAIN') || false,
              hasAudiobook: Boolean((res as any).audiobooks?.length),
              sources: ((res as any).editions || []).map((e: any) => ({
                sourceName: e.sourceName,
                externalId: e.externalId,
                isLegalDownload: e.accessLinks?.some((l: any) => l.type === 'LEGAL_FREE_DOWNLOAD' || l.type === 'OPEN_ACCESS'),
              })),
              downloadOptions: ((res as any).accessLinks || []).map((l: any) => ({
                format: l.format || 'DIGITAL',
                url: l.url,
                isDirectDownload: Boolean(l.isDirectDownload),
                notes: l.notes,
                sourceName: l.sourceName || (res as any).editions?.[0]?.sourceName || 'Fonte Desconhecida',
              })),
              audioOptions: ((res as any).audiobooks || []).map((a: any) => ({
                format: 'MP3',
                url: a.streamUrl || a.downloadUrl || '',
                isDirectDownload: Boolean(a.downloadUrl),
                durationMinutes: a.durationMinutes,
                narrator: a.narrator,
                audioStreamingUrl: a.streamUrl,
              })),
              audiobookDetails: (res as any).audiobooks?.[0]
                ? {
                    durationMinutes: (res as any).audiobooks[0].durationMinutes,
                    narrator: (res as any).audiobooks[0].narrator,
                    streamUrl: (res as any).audiobooks[0].streamUrl,
                    sourceName: (res as any).audiobooks[0].sourceName,
                  }
                : undefined,
              ...( { workRecord: res } as any ),
            };
          }
        }
      }
    } catch {}

    // 4. Tenta em todos os provedores em sequência
    for (const provider of this.providers.values()) {
      const book = await provider.getBook(id);
      if (book) return book;
    }

    return null;
  }

  async checkAllProvidersHealth(): Promise<
    Array<{
      id: string;
      displayName: string;
      online: boolean;
      latencyMs: number;
      supportsDownload: boolean;
      supportsAudiobook: boolean;
      requiresApiKey: boolean;
      apiKeyConfigured: boolean;
      error?: string;
    }>
  > {
    const list = [];
    for (const [id, provider] of this.providers.entries()) {
      const cfg = PROVIDERS_CONFIG[id] || {
        displayName: id,
        supportsDownload: false,
        supportsAudiobook: false,
        requiresApiKey: false,
      };

      const apiKeyConfigured = cfg.apiKeyEnvVar ? Boolean(process.env[cfg.apiKeyEnvVar]) : true;

      let online = true;
      let latencyMs = 0;
      let error: string | undefined;

      if (provider.checkHealth) {
        const health = await provider.checkHealth();
        online = health.online;
        latencyMs = health.latencyMs;
        error = health.error;
      }

      list.push({
        id,
        displayName: cfg.displayName,
        online,
        latencyMs,
        supportsDownload: cfg.supportsDownload,
        supportsAudiobook: cfg.supportsAudiobook,
        requiresApiKey: cfg.requiresApiKey,
        apiKeyConfigured,
        error,
      });
    }

    return list;
  }
}

export const providerManager = new BookProviderManager();
