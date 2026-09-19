import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface LibriVoxAuthor {
  id: string;
  first_name: string;
  last_name: string;
}

interface LibriVoxBook {
  id: string;
  title: string;
  description: string;
  url_text_source?: string;
  language?: string;
  copyright_year?: string;
  num_sections?: string;
  url_rss?: string;
  url_zip_file?: string;
  url_librivox?: string;
  totaltime?: string;
  totaltimesecs?: number;
  authors?: LibriVoxAuthor[];
}

interface LibriVoxResponse {
  books?: LibriVoxBook[];
}

export class LibriVoxProvider implements BookProvider {
  readonly name = 'librivox';
  private readonly config = PROVIDERS_CONFIG.librivox;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const url = new URL(this.config.baseUrl);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', String(filters?.limit || 8));

      if (query && query.trim().length > 0) {
        url.searchParams.set('title', query.trim());
      } else {
        url.searchParams.set('title', 'Casmurro');
      }

      if (filters?.author) {
        url.searchParams.set('author', filters.author);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data: LibriVoxResponse = await res.json();
      const booksList = Array.isArray(data.books) ? data.books : [];
      const items = booksList.map((item) => this.mapToUnifiedBook(item));

      return {
        totalCount: items.length,
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
      const cleanId = id.replace(/^librivox:/i, '');
      const url = `${this.config.baseUrl}/?format=json&id=${cleanId}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) return null;
      const data: LibriVoxResponse = await res.json();
      if (!data.books || !data.books[0]) return null;

      return this.mapToUnifiedBook(data.books[0]);
    } catch (error) {
      return null;
    }
  }

  async getDownloadOptions(id: string): Promise<DownloadOption[]> {
    const book = await this.getBook(id);
    return book?.downloadOptions || [];
  }

  async getCover(_id: string): Promise<string | null> {
    return null; // LibriVox não hospeda capas diretamente
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/?format=json&limit=1`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private mapToUnifiedBook(item: LibriVoxBook): UnifiedBook {
    const authors = (item.authors || []).map((a) => `${a.first_name || ''} ${a.last_name || ''}`.trim());
    const durationMinutes = item.totaltimesecs ? Math.round(item.totaltimesecs / 60) : undefined;

    const audioOption: DownloadOption = {
      format: 'AUDIOBOOK',
      url: item.url_zip_file || item.url_librivox || '',
      isDirectDownload: Boolean(item.url_zip_file),
      durationMinutes,
      narrator: 'Voluntários LibriVox',
      audioStreamingUrl: item.url_librivox,
    };

    return {
      id: `librivox:${item.id}`,
      slug: `librivox-${item.id}`,
      title: item.title,
      authors: authors.length > 0 ? authors : ['Autor Desconhecido'],
      description: item.description 
        ? item.description.replace(/<[^>]*>?/gm, '').trim() 
        : 'Audiolivro narrado por voluntários da comunidade LibriVox sob domínio público.',
      language: item.language?.toLowerCase()?.includes('portuguese') ? 'pt' : 'en',
      genres: ['Audiolivro', 'Domínio Público', 'Clássicos'],
      publicationYear: item.copyright_year ? parseInt(item.copyright_year, 10) : undefined,
      isPublicDomain: true,
      hasAudiobook: true,
      license: 'Domínio Público (LibriVox Free Audiobook)',
      officialSourceUrl: item.url_librivox || `https://librivox.org`,
      sources: [
        {
          sourceName: 'librivox',
          externalId: item.id,
          canonicalUrl: item.url_librivox,
          license: 'Public Domain',
          isLegalDownload: true,
          isAudiobook: true,
        },
      ],
      downloadOptions: [audioOption],
      audioOptions: [audioOption],
    };
  }
}
