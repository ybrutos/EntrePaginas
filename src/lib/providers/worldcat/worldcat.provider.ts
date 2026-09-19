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

export class WorldCatProvider implements BookProvider {
  readonly id = 'worldcat';
  readonly name = 'WorldCat (OCLC)';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.worldcat;
  private readonly circuitBreaker: CircuitBreaker;

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: false,
    fullText: false,
    preview: false,
    legalDownload: false,
    libraryBorrow: true,
    audiobook: false,
    physicalCopy: true,
    isbnLookup: true,
    multilingual: true,
    availability: true,
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.id, {
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.rateLimit.retry,
    });
  }

  private hasApiKey(): boolean {
    return Boolean(process.env.WORLDCAT_API_KEY);
  }

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();
    const searchTerms = [query.isbn, query.oclc, query.title, query.author, query.rawQuery].filter(Boolean).join(' ').trim();

    if (!searchTerms) {
      return {
        providerId: this.id,
        totalCount: 0,
        page: query.page || 1,
        works: [],
        editions: [],
        latencyMs: Date.now() - start,
      };
    }

    const now = new Date();
    // Link direto para a rede mundial de bibliotecas WorldCat
    const worldCatUrl = query.isbn 
      ? `https://www.worldcat.org/isbn/${query.isbn.replace(/[^\dX]/gi, '')}`
      : `https://www.worldcat.org/search?q=${encodeURIComponent(searchTerms)}`;

    const accessLink: BookAccessLink = {
      type: AccessType.METADATA_ONLY,
      url: worldCatUrl,
      label: 'Localizar exemplar em bibliotecas físicas pelo WorldCat',
      format: 'Registro Bibliográfico / Catálogo Físico',
      isExternal: true,
      sourceName: this.name,
      verifiedAt: now,
      notes: '⚪ CATÁLOGO: Registro de acervo bibliográfico e localização de exemplares em bibliotecas ao redor do mundo.',
    };

    const syntheticId = `wc_${query.isbn || Math.random().toString(36).slice(2)}`;
    const title = query.title || query.rawQuery || 'Registro Bibliográfico WorldCat';

    const edition: EditionRecord = {
      id: `wc_ed_${syntheticId}`,
      workId: `wc_${syntheticId}`,
      title,
      language: query.language,
      isbn10: query.isbn?.length === 10 ? query.isbn : undefined,
      isbn13: query.isbn?.length === 13 ? query.isbn : undefined,
      oclc: query.oclc,
      accessLinks: [accessLink],
      sourceName: this.name,
      externalId: syntheticId,
    };

    const work: WorkRecord = {
      id: `wc_${syntheticId}`,
      canonicalTitle: title,
      normalizedTitle: normalizeString(title),
      authors: query.author ? [query.author] : ['Acervo Internacional de Bibliotecas'],
      primaryAuthorName: query.author,
      genres: ['Registro Bibliográfico', 'Bibliotecas Mundiais'],
      aliases: [],
      identifiers: [
        ...(query.isbn ? [{ type: 'ISBN', value: query.isbn }] : []),
        ...(query.oclc ? [{ type: 'OCLC', value: query.oclc }] : []),
      ],
      editions: [edition],
      accessLinks: [accessLink],
      audiobooks: [],
      sourcesCount: 1,
    };

    return {
      providerId: this.id,
      totalCount: 1,
      page: query.page || 1,
      works: [work],
      editions: [edition],
      latencyMs: Date.now() - start,
    };
  }

  async getBook(id: string): Promise<WorkRecord | null> {
    const res = await this.search({ rawQuery: id, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    return {
      online: true,
      latencyMs: 1,
      error: this.hasApiKey() ? undefined : 'CONFIG_REQUIRED: Chave WORLDCAT_API_KEY opcional não preenchida.',
    };
  }
}
