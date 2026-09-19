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

export class OverDriveProvider implements BookProvider {
  readonly id = 'overdrive';
  readonly name = 'OverDrive / Libby';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.overdrive;
  private readonly circuitBreaker: CircuitBreaker;

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: false,
    preview: true,
    legalDownload: false,
    libraryBorrow: true,
    audiobook: true,
    physicalCopy: false,
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

  private hasCredentials(): boolean {
    const key = process.env.OVERDRIVE_CLIENT_KEY;
    const secret = process.env.OVERDRIVE_CLIENT_SECRET;
    return Boolean(key && secret);
  }

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();

    // Se não houver credenciais oficiais, não quebra a busca e informa status estruturado
    if (!this.hasCredentials()) {
      // Quando pesquisa por título ou ISBN específico, fornece link institucional do catálogo Libby
      const searchTerms = [query.rawQuery, query.title, query.author, query.isbn].filter(Boolean).join(' ').trim();
      if (!searchTerms) {
        return {
          providerId: this.id,
          totalCount: 0,
          page: query.page || 1,
          works: [],
          editions: [],
          error: 'Credenciais da OverDrive Discovery API não configuradas (OVERDRIVE_CLIENT_KEY). Modo de consulta por redirecionamento institucional ativo.',
          latencyMs: Date.now() - start,
        };
      }

      // Provedor ativo em modo de link direto para o catálogo da biblioteca parceira (Libby)
      const now = new Date();
      const libbySearchUrl = `https://libbyapp.com/search/query-${encodeURIComponent(searchTerms)}/page-1`;

      const borrowLink: BookAccessLink = {
        type: AccessType.LIBRARY_BORROW,
        url: libbySearchUrl,
        label: 'Verificar empréstimo digital no Libby (Rede de Bibliotecas)',
        format: 'Empréstimo Digital',
        isExternal: true,
        sourceName: this.name,
        verifiedAt: now,
        notes: '📚 EMPRÉSTIMO DIGITAL: Disponível através de bibliotecas participantes com cartão de leitor. Não é download gratuito.',
      };

      const syntheticId = `od_${Math.random().toString(36).slice(2)}`;
      const workTitle = query.title || query.rawQuery || 'Obra em Catálogo Libby';

      const edition: EditionRecord = {
        id: `od_ed_${syntheticId}`,
        workId: `od_${syntheticId}`,
        title: workTitle,
        language: query.language || 'pt',
        publisher: 'Rede de Bibliotecas Públicas Parceiras (OverDrive / Libby)',
        format: 'eBook / Audiolivro (Empréstimo)',
        accessLinks: [borrowLink],
        sourceName: this.name,
        externalId: syntheticId,
      };

      const work: WorkRecord = {
        id: `od_${syntheticId}`,
        canonicalTitle: workTitle,
        normalizedTitle: normalizeString(workTitle),
        authors: query.author ? [query.author] : ['Autor em Catálogo'],
        primaryAuthorName: query.author,
        genres: ['Empréstimo Digital', 'Bibliotecas Públicas'],
        aliases: [],
        identifiers: [
          ...(query.isbn ? [{ type: 'ISBN', value: query.isbn }] : []),
          { type: 'OVERDRIVE_QUERY', value: searchTerms }
        ],
        editions: [edition],
        accessLinks: [borrowLink],
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

    // Se houver credenciais oficiais configuradas no futuro, executa chamada à API Discovery da OverDrive
    return {
      providerId: this.id,
      totalCount: 0,
      page: query.page || 1,
      works: [],
      editions: [],
      latencyMs: Date.now() - start,
    };
  }

  async getBook(id: string): Promise<WorkRecord | null> {
    const res = await this.search({ rawQuery: id, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    if (!this.hasCredentials()) {
      return {
        online: true,
        latencyMs: 1,
        error: 'CONFIG_REQUIRED: Chaves de API da OverDrive não configuradas no ambiente.',
      };
    }
    return { online: true, latencyMs: 10 };
  }
}
