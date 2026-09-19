import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface GutendexAuthor {
  name: string;
  birth_year?: number;
  death_year?: number;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  formats: Record<string, string>;
  download_count: number;
}

interface GutendexResponse {
  count: number;
  results: GutendexBook[];
}

export class GutenbergProvider implements BookProvider {
  readonly name = 'gutenberg';
  private readonly config = PROVIDERS_CONFIG.gutenberg;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const url = new URL(this.config.baseUrl);
      if (query && query.trim().length > 0) {
        url.searchParams.set('search', query.trim());
      }
      if (filters?.language) {
        url.searchParams.set('languages', filters.language);
      }
      if (filters?.genre && filters.genre !== 'Todos') {
        url.searchParams.set('topic', filters.genre);
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

      const data: GutendexResponse = await res.json();
      const items = (data.results || []).map((item) => this.mapToUnifiedBook(item));

      return {
        totalCount: data.count || items.length,
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
      const cleanId = id.replace(/^gutenberg:/i, '');
      const res = await fetch(`${this.config.baseUrl}/${cleanId}`, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) {
        const fallbackRes = await fetch(`${this.config.baseUrl}?ids=${cleanId}`, {
          headers: { 'User-Agent': this.userAgent },
        });
        if (!fallbackRes.ok) return null;
        const fallbackData: GutendexResponse = await fallbackRes.json();
        if (!fallbackData.results?.length) return null;
        return this.mapToUnifiedBook(fallbackData.results[0]);
      }

      const bookData: GutendexBook = await res.json();
      return this.mapToUnifiedBook(bookData);
    } catch (error) {
      return null;
    }
  }

  async getDownloadOptions(id: string): Promise<DownloadOption[]> {
    const book = await this.getBook(id);
    return book?.downloadOptions || [];
  }

  async getCover(id: string): Promise<string | null> {
    const book = await this.getBook(id);
    return book?.coverUrl || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}?search=test`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private mapToUnifiedBook(item: GutendexBook): UnifiedBook {
    const authors = (item.authors || []).map((a) => {
      if (a.name.includes(',')) {
        const parts = a.name.split(',').map((p) => p.trim());
        return `${parts[1]} ${parts[0]}`.trim();
      }
      return a.name;
    });

    const downloadOptions: DownloadOption[] = [];
    let coverUrl: string | undefined;

    for (const [mime, url] of Object.entries(item.formats || {})) {
      if (mime.includes('epub')) {
        downloadOptions.push({ format: 'EPUB', url, isDirectDownload: true, sourceName: 'Projeto Gutenberg' });
      } else if (mime.includes('mobipocket') || mime.includes('kf8') || mime.includes('mobi')) {
        downloadOptions.push({ format: 'MOBI', url, isDirectDownload: true, sourceName: 'Projeto Gutenberg' });
      } else if (mime.includes('text/html')) {
        downloadOptions.push({ format: 'HTML', url, isDirectDownload: true, sourceName: 'Projeto Gutenberg' });
      } else if (mime.includes('text/plain')) {
        downloadOptions.push({ format: 'TXT', url, isDirectDownload: true, sourceName: 'Projeto Gutenberg' });
      } else if (mime.includes('image/jpeg')) {
        coverUrl = url;
      }
    }

    const genres = Array.from(
      new Set(
        [...(item.subjects || []), ...(item.bookshelves || [])]
          .map((s) => s.split('--')[0].trim())
          .filter(Boolean)
          .slice(0, 5)
      )
    );

    return {
      id: `gutenberg:${item.id}`,
      slug: `gutenberg-${item.id}`,
      title: item.title,
      authors: authors.length > 0 ? authors : ['Autor Desconhecido'],
      description: `Edição em domínio público disponibilizada pelo Project Gutenberg. Assuntos: ${genres.join(', ') || 'Clássicos'}.`,
      coverUrl,
      language: item.languages?.[0] || 'pt',
      genres: genres.length > 0 ? genres : ['Clássicos', 'Domínio Público'],
      isPublicDomain: true,
      license: 'Domínio Público (Public Domain)',
      officialSourceUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
      sources: [
        {
          sourceName: 'gutenberg',
          externalId: item.id.toString(),
          canonicalUrl: `https://www.gutenberg.org/ebooks/${item.id}`,
          license: 'Public Domain',
          isLegalDownload: true,
        },
      ],
      downloadOptions,
    };
  }
}
