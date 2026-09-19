/**
 * LeLivros Provider — Agente de Descoberta de Fonte Pública
 *
 * Implementa a interface BookProvider do Entre Páginas V2.
 *
 * IMPORTANTE: Este provider foi criado para fins de demonstração técnica
 * da arquitetura de descoberta multi-estratégia. Todo conteúdo descoberto
 * é classificado obrigatoriamente como UNVERIFIED_DOWNLOAD e apresentado
 * ao usuário com aviso explícito. O Entre Páginas não endossa o acesso
 * a obras com direitos autorais ativos por fontes não autorizadas.
 *
 * O domínio é configurável via variável de ambiente LELIVROS_BASE_URL.
 * Padrão: https://lelivros.info (pode estar offline/parked).
 */

import type {
  BookProvider,
  BookSearchQuery,
  BookProviderResult,
  WorkRecord,
  EditionRecord,
  BookAccessLink,
  BookAvailabilityInfo,
  ProviderCapabilities,
  SourceAccess,
} from '../types';
import { AccessType } from '../types';
import { LeLivrosDiscoveryService, DiscoveredBook } from './lelivros-discovery.service';

const BASE_URL = process.env.LELIVROS_BASE_URL || 'https://dlivros.com';

const CAPABILITIES: ProviderCapabilities = {
  search: true,
  metadata: true,
  covers: true,
  fullText: false,        // Não oferece leitura online direta
  preview: false,
  legalDownload: false,   // Fonte não verificada — nunca classificado como legal
  libraryBorrow: false,
  audiobook: false,
  physicalCopy: false,
  isbnLookup: false,
  multilingual: true,     // Principalmente PT-BR
  availability: true,
};

/** Converte DiscoveredBook → WorkRecord para o sistema de busca global */
function discoveredBookToWorkRecord(book: DiscoveredBook, query: BookSearchQuery): WorkRecord {
  const workId = `lelivros:${encodeURIComponent((book.title || 'unknown').toLowerCase().replace(/\s+/g, '-'))}`;

  // Converte SourceAccess[] em BookAccessLink[]
  const accessLinks: BookAccessLink[] = book.sourceAccesses.map((sa): BookAccessLink => {
    const isFileFormat = sa.format && ['EPUB', 'MOBI', 'PDF'].includes(sa.format.toUpperCase());
    const isDirect = !!sa.downloadUrl && isFileFormat;

    return {
      type: AccessType.EXTERNAL_LINK,   // NUNCA LEGAL_FREE_DOWNLOAD para Le Livros (mantém-se)
      url: sa.downloadUrl || sa.accessPageUrl || sa.sourcePageUrl,
      label: buildAccessLabel(sa),
      format: sa.format,
      isExternal: true,
      sourceName: sa.providerLabel,
      isDirectDownload: isDirect,
      verifiedAt: new Date(),
      notes: buildAccessNotes(sa),
      // Campos de descoberta estendidos (disponíveis via cast)
      ...(sa as any),
    };
  });

  const identifiers: Array<{ type: string; value: string }> = [];
  if (book.isbn13) identifiers.push({ type: 'ISBN13', value: book.isbn13 });
  if (book.isbn10) identifiers.push({ type: 'ISBN10', value: book.isbn10 });
  if (book.isbn) identifiers.push({ type: 'ISBN', value: book.isbn });

  const edition: EditionRecord = {
    id: `${workId}:ed-1`,
    workId,
    title: book.title || query.rawQuery,
    subtitle: undefined,
    language: book.language || 'pt',
    publisher: book.publisher,
    publicationYear: book.year,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
    coverUrl: book.coverUrl,
    accessLinks,
    sourceName: 'lelivros',
    externalId: book.sourcePageUrl,
  };

  const work: WorkRecord = {
    id: workId,
    canonicalTitle: book.title || query.rawQuery,
    normalizedTitle: (book.title || query.rawQuery).toLowerCase().replace(/[^a-z0-9\s]/g, ''),
    authors: book.authors || (query.author ? [query.author] : ['Autor Desconhecido']),
    description: book.description,
    coverUrl: book.coverUrl,
    genres: book.categories || [],
    aliases: [],
    identifiers,
    editions: [edition],
    accessLinks,
    audiobooks: [],
    sourcesCount: 1,
    matchConfidence: 0.6,
    matchReasons: ['lelivros_discovery'],
  };

  // Anexa sourceAccesses para uso pelo frontend
  (work as any).sourceAccesses = book.sourceAccesses;

  return work;
}

function buildAccessLabel(sa: SourceAccess): string {
  const format = sa.format ? ` ${sa.format}` : '';
  switch (sa.accessType) {
    case 'UNVERIFIED_DOWNLOAD':
      return `⚠️ Download não verificado${format} (Le Livros)`;
    case 'EXTERNAL_DOWNLOAD':
      return `🌐 Acessar${format} no Le Livros`;
    case 'ACCESS_PAGE':
      return '🌐 Abrir página no Le Livros';
    case 'METADATA_ONLY':
      return '📋 Ver no Le Livros';
    default:
      return `🌐 Le Livros${format}`;
  }
}

function buildAccessNotes(sa: SourceAccess): string {
  const parts: string[] = [];

  if (sa.accessType === 'UNVERIFIED_DOWNLOAD') {
    parts.push('⚠️ Fonte não verificada. A autorização dos titulares de direitos não foi confirmada.');
  }

  if (sa.backendDownloadStatus === 'BLOCKED') {
    parts.push('O Entre Páginas não conseguiu baixar diretamente. Use o link externo.');
  } else if (sa.backendDownloadStatus === 'FAILED') {
    parts.push('Falha ao acessar o arquivo. O link externo pode ainda funcionar.');
  }

  if (sa.discoveryChain && sa.discoveryChain.length > 1) {
    parts.push(`Encontrado via ${sa.discoveryChain.length} página(s).`);
  }

  return parts.join(' ');
}

export class LeLivrosProvider implements BookProvider {
  readonly id = 'lelivros';
  readonly name = 'Le Livros (Descoberta)';
  readonly capabilities = CAPABILITIES;

  private readonly discovery: LeLivrosDiscoveryService;

  constructor() {
    this.discovery = new LeLivrosDiscoveryService(BASE_URL);
  }

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();

    try {
      const books = await this.discovery.discover({
        rawQuery: query.rawQuery,
        title: query.title,
        author: query.author,
        isbn: query.isbn,
      });

      const works = books.map((b) => discoveredBookToWorkRecord(b, query));

      return {
        providerId: this.id,
        totalCount: works.length,
        page: query.page || 1,
        works,
        editions: works.flatMap((w) => w.editions),
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        totalCount: 0,
        page: query.page || 1,
        works: [],
        editions: [],
        error: `LeLivros discovery falhou: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getBook(id: string): Promise<WorkRecord | EditionRecord | null> {
    // Para busca por ID, tenta abrir a URL diretamente (o ID é a URL da página)
    try {
      const decoded = decodeURIComponent(id.replace('lelivros:', ''));
      if (!decoded.startsWith('http')) return null;

      const { scrapeBookPage } = await import('./lelivros-page-scraper');
      const { resolveAllCandidates, makeMetadataOnlyAccess } = await import('./lelivros-link-resolver');

      const page = await scrapeBookPage(decoded);
      if (!page) return null;

      let sourceAccesses: SourceAccess[] = [];
      if (page.candidateLinks.length > 0) {
        sourceAccesses = await resolveAllCandidates(page.candidateLinks, decoded);
      }
      if (sourceAccesses.length === 0) {
        sourceAccesses = [makeMetadataOnlyAccess(decoded)];
      }

      const book: DiscoveredBook = {
        ...page.metadata,
        sourcePageUrl: decoded,
        sourceAccesses,
      };

      return discoveredBookToWorkRecord(book, { rawQuery: page.metadata.title || decoded });
    } catch {
      return null;
    }
  }

  async getWork(id: string): Promise<WorkRecord | null> {
    const result = await this.getBook(id);
    if (!result || !('editions' in result)) return null;
    return result as WorkRecord;
  }

  async getDownloadLinks(id: string): Promise<BookAccessLink[]> {
    const work = await this.getWork(id);
    return work?.accessLinks || [];
  }

  async getAvailability(_id: string): Promise<BookAvailabilityInfo> {
    return {
      accessType: AccessType.EXTERNAL_LINK,
      summary: '⚠️ Fonte não verificada — autorização dos titulares não confirmada',
      isAvailableNow: false,
      verifiedAt: new Date(),
    };
  }

  async getCover(id: string): Promise<string | null> {
    const work = await this.getWork(id);
    return work?.coverUrl || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${BASE_URL}/`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      });
      clearTimeout(tid);
      return {
        online: res.status < 500,
        latencyMs: Date.now() - start,
        error: res.status >= 400 ? `HTTP ${res.status}` : undefined,
      };
    } catch (err: any) {
      return {
        online: false,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}
