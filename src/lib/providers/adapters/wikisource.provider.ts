import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

export class WikisourceProvider implements BookProvider {
  readonly name = 'wikisource';
  private readonly config = PROVIDERS_CONFIG.wikisource;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const cleanQ = query && query.trim().length > 0 ? query.trim() : 'Machado de Assis';
      const url = `https://pt.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&format=json&srlimit=${filters?.limit || 6}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data = await res.json();
      const searchList: WikiSearchResult[] = data.query?.search || [];

      const items: UnifiedBook[] = searchList.map((item) => {
        const cleanSnippet = item.snippet.replace(/<[^>]*>?/gm, '').trim();
        const pageUrl = `https://pt.wikisource.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;

        return {
          id: `wikisource:${item.pageid}`,
          slug: `wiki-${item.pageid}`,
          title: item.title,
          authors: ['Domínio Público / Wikisource'],
          description: cleanSnippet || 'Texto original integral arquivado e transcrito na Wikisource.',
          language: 'pt',
          genres: ['Texto Histórico', 'Domínio Público', 'Wikisource'],
          isPublicDomain: true,
          license: 'Creative Commons Atribuição-CompartilhaIgual (CC BY-SA) / Domínio Público',
          officialSourceUrl: pageUrl,
          sources: [
            {
              sourceName: 'wikisource',
              externalId: String(item.pageid),
              canonicalUrl: pageUrl,
              license: 'CC-BY-SA / Public Domain',
              isLegalDownload: false,
            },
          ],
          downloadOptions: [
            {
              format: 'HTML',
              url: pageUrl,
              isDirectDownload: false,
            },
          ],
        };
      });

      return {
        totalCount: data.query?.searchinfo?.totalhits || items.length,
        items,
        page: filters?.page || 1,
        provider: this.name,
      };
    } catch (error) {
      return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
    }
  }

  async getBook(id: string): Promise<UnifiedBook | null> {
    try {
      const cleanId = id.replace(/^wikisource:/i, '');
      const url = `https://pt.wikisource.org/w/api.php?action=query&pageids=${cleanId}&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
      if (!res.ok) return null;
      const data = await res.json();
      const page = data.query?.pages?.[cleanId];
      if (!page) return null;

      const pageUrl = `https://pt.wikisource.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;

      return {
        id: `wikisource:${page.pageid}`,
        slug: `wiki-${page.pageid}`,
        title: page.title,
        authors: ['Domínio Público / Wikisource'],
        description: 'Texto original de domínio público arquivado na Wikisource em língua portuguesa.',
        language: 'pt',
        genres: ['Domínio Público', 'Wikisource'],
        isPublicDomain: true,
        license: 'CC BY-SA / Domínio Público',
        officialSourceUrl: pageUrl,
        sources: [
          {
            sourceName: 'wikisource',
            externalId: String(page.pageid),
            canonicalUrl: pageUrl,
            license: 'Public Domain',
            isLegalDownload: false,
          },
        ],
        downloadOptions: [
          {
            format: 'HTML',
            url: pageUrl,
            isDirectDownload: false,
          },
        ],
      };
    } catch (e) {
      return null;
    }
  }

  async getDownloadOptions(_id: string): Promise<DownloadOption[]> {
    return [];
  }

  async getCover(_id: string): Promise<string | null> {
    return null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch('https://pt.wikisource.org/w/api.php?action=query&meta=siteinfo&format=json', {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
