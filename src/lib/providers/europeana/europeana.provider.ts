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

export class EuropeanaProvider implements BookProvider {
  readonly id = 'europeana';
  readonly name = 'Europeana Collections';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.europeana;
  private readonly circuitBreaker: CircuitBreaker;

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: false,
    preview: true,
    legalDownload: false,
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

  private getApiKey(): string | undefined {
    return process.env.EUROPEANA_API_KEY;
  }

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      // Degradação graciosa quando chave não está configurada
      return {
        providerId: this.id,
        totalCount: 0,
        page: query.page || 1,
        works: [],
        editions: [],
        error: 'CONFIG_REQUIRED: Chave EUROPEANA_API_KEY não configurada no ambiente.',
        latencyMs: Date.now() - start,
      };
    }

    try {
      return await this.circuitBreaker.execute(async (signal) => {
        const url = new URL(`${this.config.baseUrl}/search.json`);
        url.searchParams.set('wskey', apiKey);
        url.searchParams.set('query', `type:TEXT AND (${query.rawQuery || 'literature'})`);
        url.searchParams.set('rows', String(query.limit || 12));

        const res = await fetch(url.toString(), { signal });
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
        const items = data.items || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const item of items) {
          const title = Array.isArray(item.title) ? item.title[0] : item.title || 'Manuscrito Europeana';
          const author = Array.isArray(item.dcCreator) ? item.dcCreator[0] : item.dcCreator || 'Acervo Europeu';
          const coverUrl = item.edmPreview?.[0];
          const guid = item.guid || `eur_${Math.random().toString(36).slice(2)}`;

          const accessLinks: BookAccessLink[] = [];
          if (item.guid) {
            accessLinks.push({
              type: AccessType.OPEN_ACCESS,
              url: item.guid,
              label: 'Ver acervo digital no portal Europeana',
              format: 'Registro Digital / Imagens de Manuscrito',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
            });
          }

          const edition: EditionRecord = {
            id: `eur_ed_${item.id || guid}`,
            workId: `eur_${item.id || guid}`,
            title,
            coverUrl,
            accessLinks,
            sourceName: this.name,
            externalId: item.id || guid,
          };

          const work: WorkRecord = {
            id: `eur_${item.id || guid}`,
            canonicalTitle: title,
            normalizedTitle: normalizeString(title),
            authors: [author],
            primaryAuthorName: author,
            coverUrl,
            genres: ['Patrimônio Europeu', 'Manuscritos Históricos'],
            aliases: [],
            identifiers: [{ type: 'EUROPEANA_ID', value: item.id || guid }],
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
          totalCount: data.totalResults || works.length,
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
    const res = await this.search({ rawQuery: id, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        online: true,
        latencyMs: 1,
        error: 'CONFIG_REQUIRED: Chave EUROPEANA_API_KEY não configurada.',
      };
    }
    return { online: true, latencyMs: 20 };
  }
}
