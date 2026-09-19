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

export class WikisourceProvider implements BookProvider {
  readonly id = 'wikisource';
  readonly name = 'Wikisource';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.wikisource;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: false,
    fullText: true,
    preview: false,
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

  async search(query: BookSearchQuery): Promise<BookProviderResult> {
    const start = Date.now();
    try {
      return await this.circuitBreaker.execute(async (signal) => {
        // Seleção de idioma da Wikisource (default: pt, ou en se especificado)
        const lang = query.language === 'en' ? 'en' : 'pt';
        const baseUrl = `https://${lang}.wikisource.org/w/api.php`;

        const searchTerms = [query.title, query.author, query.rawQuery].filter(Boolean).join(' ').trim();
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'query');
        url.searchParams.set('list', 'search');
        url.searchParams.set('srsearch', searchTerms || 'Machado de Assis');
        url.searchParams.set('format', 'json');
        url.searchParams.set('srlimit', String(query.limit || 8));

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': this.userAgent },
          signal,
        });

        if (!res.ok) {
          return {
            providerId: this.id,
            totalCount: 0,
            page: 1,
            works: [],
            editions: [],
            error: `HTTP ${res.status}`,
            latencyMs: Date.now() - start,
          };
        }

        const data = await res.json();
        const items = data.query?.search || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const item of items) {
          const title = item.title;
          const pageId = String(item.pageid);
          const snippet = item.snippet ? item.snippet.replace(/<[^>]+>/g, '') : undefined;
          const pageUrl = `https://${lang}.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

          const accessLinks: BookAccessLink[] = [
            {
              type: AccessType.FULL_TEXT_ONLINE,
              url: pageUrl,
              label: 'Ler texto integral livre no Wikisource',
              format: 'Texto Online (Web / Wiki)',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: 'Texto integral livre da Fundação Wikimedia sob licença CC-BY-SA e Domínio Público.',
            }
          ];

          const edition: EditionRecord = {
            id: `ws_ed_${pageId}`,
            workId: `ws_${pageId}`,
            title,
            language: lang,
            publisher: 'Wikisource (Fundação Wikimedia)',
            accessLinks,
            sourceName: this.name,
            externalId: pageId,
          };

          const work: WorkRecord = {
            id: `ws_${pageId}`,
            canonicalTitle: title,
            normalizedTitle: normalizeString(title),
            authors: query.author ? [query.author] : ['Texto-fonte Livre'],
            primaryAuthorName: query.author,
            description: snippet,
            genres: ['Textos-Fonte Livres', 'Domínio Público'],
            aliases: [],
            identifiers: [
              { type: 'WIKISOURCE_PAGEID', value: pageId }
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
          totalCount: data.query?.searchinfo?.totalhits || works.length,
          page: 1,
          works,
          editions,
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
    const start = Date.now();
    try {
      const res = await fetch(`https://pt.wikisource.org/w/api.php?action=query&meta=siteinfo&format=json`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
