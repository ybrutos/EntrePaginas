import { 
  BookProvider, 
  BookSearchQuery, 
  BookProviderResult, 
  WorkRecord, 
  EditionRecord, 
  BookAccessLink, 
  AccessType,
  ProviderCapabilities 
} from '../types';
import { CircuitBreaker } from '../circuit-breaker';
import { PROVIDERS_REGISTRY_CONFIG } from '../providers.config';
import { normalizeString } from '../../utils/text';

interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  formats: Record<string, string>;
  download_count: number;
}

export class GutenbergProvider implements BookProvider {
  readonly id = 'gutenberg';
  readonly name = 'Project Gutenberg';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.gutenberg;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: true,
    preview: false,
    legalDownload: true,
    libraryBorrow: false,
    audiobook: false,
    physicalCopy: false,
    isbnLookup: false,
    multilingual: true,
    availability: true,
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.id, {
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.rateLimit.retry,
    });
  }

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();
    try {
      return await this.circuitBreaker.execute(async (signal) => {
        const url = new URL(this.config.baseUrl);
        const searchTerms = [query.rawQuery, query.title, query.author].filter(Boolean).join(' ').trim();
        if (searchTerms) {
          url.searchParams.set('search', searchTerms);
        }
        if (query.language) {
          url.searchParams.set('languages', query.language);
        }
        if (query.genre) {
          url.searchParams.set('topic', query.genre);
        }

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': this.userAgent },
          signal,
        });

        if (!res.ok) {
          return {
            providerId: this.id,
            totalCount: 0,
            page: query.page || 1,
            works: [],
            editions: [],
            error: `HTTP ${res.status}`,
            latencyMs: Date.now() - start,
          };
        }

        const data = await res.json();
        const results: GutendexBook[] = data.results || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const item of results) {
          const externalId = String(item.id);
          const coverUrl = item.formats['image/jpeg'] || undefined;
          const authors = item.authors.map((a) => a.name);

          // Extração honesta de links de download direto em domínio público
          const accessLinks: BookAccessLink[] = [];

          if (item.formats['application/epub+zip']) {
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: item.formats['application/epub+zip'],
              label: 'Baixar EPUB completo (Domínio Público)',
              format: 'EPUB',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          }

          if (item.formats['text/html'] || item.formats['text/html; charset=utf-8']) {
            const htmlUrl = item.formats['text/html'] || item.formats['text/html; charset=utf-8'];
            accessLinks.push({
              type: AccessType.FULL_TEXT_ONLINE,
              url: htmlUrl,
              label: 'Ler online no navegador (HTML integral)',
              format: 'HTML',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
            });
          }

          if (item.formats['application/x-mobipocket-ebook']) {
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: item.formats['application/x-mobipocket-ebook'],
              label: 'Baixar formato Kindle (MOBI)',
              format: 'MOBI',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          }

          if (item.formats['text/plain; charset=utf-8'] || item.formats['text/plain']) {
            const txtUrl = item.formats['text/plain; charset=utf-8'] || item.formats['text/plain'];
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: txtUrl,
              label: 'Baixar Texto Puro (TXT)',
              format: 'TXT',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          }

          const edition: EditionRecord = {
            id: `gut_ed_${externalId}`,
            workId: `gut_${externalId}`,
            title: item.title,
            language: item.languages?.[0] || 'und',
            publisher: 'Project Gutenberg',
            coverUrl,
            format: 'EPUB / MOBI / HTML / TXT',
            accessLinks,
            sourceName: this.name,
            externalId,
          };

          const work: WorkRecord = {
            id: `gut_${externalId}`,
            canonicalTitle: item.title,
            normalizedTitle: normalizeString(item.title),
            authors: authors.length > 0 ? authors : ['Domínio Público'],
            primaryAuthorName: authors[0],
            coverUrl,
            genres: item.subjects.slice(0, 5),
            aliases: [],
            identifiers: [
              { type: 'GUTENBERG_ID', value: externalId }
            ],
            editions: [edition],
            accessLinks,
            audiobooks: [],
            sourcesCount: 1,
          };

          works.push(work);
          editions.push(edition);
        }

        return {
          providerId: this.id,
          totalCount: data.count || works.length,
          page: query.page || 1,
          works,
          editions,
          latencyMs: Date.now() - start,
        };
      });
    } catch (err: any) {
      return {
        providerId: this.id,
        totalCount: 0,
        page: query.page || 1,
        works: [],
        editions: [],
        error: err.message,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getBook(id: string): Promise<WorkRecord | null> {
    const cleanId = id.replace('gutenberg:', '').replace('gut_', '');
    const res = await this.search({ rawQuery: cleanId, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}?search=Machado`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
