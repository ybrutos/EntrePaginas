import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

export class EuropeanaProvider implements BookProvider {
  readonly name = 'europeana';
  private readonly config = PROVIDERS_CONFIG.europeana;

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    const apiKey = process.env.EUROPEANA_API_KEY;
    if (!apiKey) {
      // Sem chave configurada no .env, não executa a chamada
      return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
    }

    try {
      const cleanQ = query && query.trim().length > 0 ? query.trim() : 'literature';
      const url = new URL(`${this.config.baseUrl}/search.json`);
      url.searchParams.set('wskey', apiKey);
      url.searchParams.set('query', cleanQ);
      url.searchParams.set('qf', 'TYPE:TEXT');
      url.searchParams.set('rows', String(filters?.limit || 6));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data = await res.json();
      const itemsList = data.items || [];

      const items: UnifiedBook[] = itemsList.map((item: any) => ({
        id: `europeana:${item.id}`,
        slug: `eu-${item.id.replace(/\//g, '-')}`,
        title: item.title?.[0] || 'Obra Histórica',
        authors: item.dcCreator ? (Array.isArray(item.dcCreator) ? item.dcCreator : [item.dcCreator]) : ['Acervo Europeu'],
        description: 'Registro histórico preservado no acervo cultural da Europeana.',
        coverUrl: item.edmPreview?.[0],
        language: item.language?.[0] || 'pt',
        genres: ['Patrimônio Cultural', 'Acervo Histórico', 'Europeana'],
        publicationYear: item.year?.[0] ? parseInt(item.year[0], 10) : undefined,
        isPublicDomain: true,
        license: 'Acesso Aberto / Domínio Público Europeu',
        officialSourceUrl: item.guid || `https://www.europeana.eu/item${item.id}`,
        sources: [
          {
            sourceName: 'europeana',
            externalId: item.id,
            canonicalUrl: item.guid,
            license: 'Open Access',
            isLegalDownload: false,
          },
        ],
        downloadOptions: [],
      }));

      return {
        totalCount: data.totalResults || items.length,
        items,
        page: filters?.page || 1,
        provider: this.name,
      };
    } catch (error) {
      return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
    }
  }

  async getBook(id: string): Promise<UnifiedBook | null> {
    const apiKey = process.env.EUROPEANA_API_KEY;
    if (!apiKey) return null;

    try {
      const cleanId = id.replace(/^europeana:/i, '');
      const url = `${this.config.baseUrl}/record/${cleanId}.json?wskey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const item = data.object;
      if (!item) return null;

      return {
        id: `europeana:${cleanId}`,
        slug: `eu-${cleanId.replace(/\//g, '-')}`,
        title: item.title?.[0] || cleanId,
        authors: item.proxies?.[0]?.dcCreator?.def ? [item.proxies[0].dcCreator.def[0]] : ['Acervo Europeu'],
        description: 'Registro patrimonial de domínio público preservado na Europeana.',
        coverUrl: item.aggregations?.[0]?.edmPreview,
        language: 'pt',
        genres: ['Patrimônio Cultural', 'Europeana'],
        isPublicDomain: true,
        license: 'Domínio Público Europeu',
        officialSourceUrl: `https://www.europeana.eu/item${cleanId}`,
        sources: [
          {
            sourceName: 'europeana',
            externalId: cleanId,
            canonicalUrl: `https://www.europeana.eu/item${cleanId}`,
            license: 'Public Domain',
            isLegalDownload: false,
          },
        ],
        downloadOptions: [],
      };
    } catch (e) {
      return null;
    }
  }

  async getDownloadOptions(_id: string): Promise<DownloadOption[]> {
    return [];
  }

  async getCover(id: string): Promise<string | null> {
    const book = await this.getBook(id);
    return book?.coverUrl || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const apiKey = process.env.EUROPEANA_API_KEY;
    if (!apiKey) {
      return { online: false, latencyMs: 0, error: 'Chave EUROPEANA_API_KEY não configurada no .env (opcional)' };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/search.json?wskey=${apiKey}&query=test&rows=1`);
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
