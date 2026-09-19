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

export class HathiTrustProvider implements BookProvider {
  readonly id = 'hathitrust';
  readonly name = 'HathiTrust Digital Library';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.hathitrust;
  private readonly circuitBreaker: CircuitBreaker;

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: false,
    fullText: true,
    preview: true,
    legalDownload: false,
    libraryBorrow: false,
    audiobook: false,
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

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();
    try {
      return await this.circuitBreaker.execute(async (signal) => {
        // Se a busca tiver ISBN, consulta a Brief API do HathiTrust
        const isbnClean = query.isbn?.replace(/[^\dX]/gi, '');
        if (isbnClean) {
          const url = `${this.config.baseUrl}/isbn/${isbnClean}.json`;
          const res = await fetch(url, { signal });
          if (res.ok) {
            const data = await res.json();
            const items = data.items || [];
            if (items.length > 0) {
              const item = items[0];
              const now = new Date();
              const usRights = item.usRightsString || '';
              const isFullView = usRights.toLowerCase().includes('public domain') || usRights.toLowerCase().includes('full view');

              const accessLinks: BookAccessLink[] = [];
              if (isFullView) {
                accessLinks.push({
                  type: AccessType.PUBLIC_DOMAIN,
                  url: item.itemURL,
                  label: 'Visualizar obra completa (HathiTrust Full View)',
                  format: 'Leitor Digital Acadêmico',
                  isExternal: true,
                  sourceName: this.name,
                  verifiedAt: now,
                });
              } else {
                accessLinks.push({
                  type: AccessType.SEARCH_ONLY,
                  url: item.itemURL,
                  label: 'Consulta limitada / Busca interna (Search-Only)',
                  format: 'Busca Interna de Texto',
                  isExternal: true,
                  sourceName: this.name,
                  verifiedAt: now,
                  notes: '⚠️ LIMITED / SEARCH-ONLY: Registro protegido com busca limitada no texto; sem download aberto.',
                });
              }

              const externalId = item.htid || isbnClean;
              const edition: EditionRecord = {
                id: `ht_ed_${externalId}`,
                workId: `ht_${externalId}`,
                title: query.title || 'Obra Digitalizada HathiTrust',
                isbn13: isbnClean.length === 13 ? isbnClean : undefined,
                isbn10: isbnClean.length === 10 ? isbnClean : undefined,
                accessLinks,
                sourceName: this.name,
                externalId,
              };

              const work: WorkRecord = {
                id: `ht_${externalId}`,
                canonicalTitle: edition.title,
                normalizedTitle: normalizeString(edition.title),
                authors: query.author ? [query.author] : ['Acervo Consórcio HathiTrust'],
                primaryAuthorName: query.author,
                genres: ['Acervo Acadêmico Digital'],
                aliases: [],
                identifiers: [
                  { type: 'ISBN', value: isbnClean },
                  { type: 'HATHITRUST_ID', value: externalId }
                ],
                editions: [edition],
                accessLinks,
                audiobooks: [],
                sourcesCount: 1,
              };

              return {
                providerId: this.id,
                totalCount: 1,
                page: 1,
                works: [work],
                editions: [edition],
                latencyMs: Date.now() - start,
              };
            }
          }
        }

        // Busca geral por termo com link de busca no catálogo oficial
        const searchTerms = [query.rawQuery, query.title, query.author].filter(Boolean).join(' ').trim();
        if (!searchTerms) {
          return {
            providerId: this.id,
            totalCount: 0,
            page: 1,
            works: [],
            editions: [],
            latencyMs: Date.now() - start,
          };
        }

        const now = new Date();
        const catalogSearchUrl = `https://catalog.hathitrust.org/Search/Home?lookfor=${encodeURIComponent(searchTerms)}&searchtype=all`;

        const accessLink: BookAccessLink = {
          type: AccessType.SEARCH_ONLY,
          url: catalogSearchUrl,
          label: 'Consultar acervo acadêmico no HathiTrust',
          format: 'Catálogo de Pesquisa',
          isExternal: true,
          sourceName: this.name,
          verifiedAt: now,
          notes: 'Acesso institucional de acervo de pesquisa (Full View e Limited View).',
        };

        const syntheticId = `ht_${Math.random().toString(36).slice(2)}`;
        const title = query.title || query.rawQuery || 'Acervo HathiTrust';

        const edition: EditionRecord = {
          id: `ht_ed_${syntheticId}`,
          workId: `ht_${syntheticId}`,
          title,
          accessLinks: [accessLink],
          sourceName: this.name,
          externalId: syntheticId,
        };

        const work: WorkRecord = {
          id: `ht_${syntheticId}`,
          canonicalTitle: title,
          normalizedTitle: normalizeString(title),
          authors: query.author ? [query.author] : ['Acervo Consórcio HathiTrust'],
          primaryAuthorName: query.author,
          genres: ['Acervo Digital Acadêmico'],
          aliases: [],
          identifiers: [],
          editions: [edition],
          accessLinks: [accessLink],
          audiobooks: [],
          sourcesCount: 1,
        };

        return {
          providerId: this.id,
          totalCount: 1,
          page: 1,
          works: [work],
          editions: [edition],
          latencyMs: Date.now() - start,
        };
      });
    } catch (err: any) {
      return {
        providerId: this.id,
        totalCount: 0,
        page: 1,
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
    return { online: true, latencyMs: 5 };
  }
}
