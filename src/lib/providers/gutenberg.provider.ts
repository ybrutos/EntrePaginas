import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from './book-provider.interface';

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
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

export class GutenbergProvider implements BookProvider {
  readonly name = 'gutenberg';
  private readonly baseUrl = 'https://gutendex.com/books';
  private readonly userAgent = 'EntrePaginas/1.0 (karole-reader; contato: local)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const url = new URL(this.baseUrl);
      if (query && query.trim().length > 0) {
        url.searchParams.set('search', query.trim());
      }
      if (filters?.language) {
        url.searchParams.set('languages', filters.language);
      }
      if (filters?.genre) {
        url.searchParams.set('topic', filters.genre);
      }

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': this.userAgent },
        next: { revalidate: 3600 },
      });

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
      console.error('[GutenbergProvider] Erro ao buscar livros:', error);
      return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
    }
  }

  async getBook(id: string): Promise<UnifiedBook | null> {
    try {
      // Limpa qualquer prefixo (ex: gutenberg:55752 -> 55752)
      const cleanId = id.replace(/^gutenberg:/i, '');
      const res = await fetch(`${this.baseUrl}/${cleanId}`, {
        headers: { 'User-Agent': this.userAgent },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        // Tenta buscar via query ids se endpoint direto falhar
        const fallbackRes = await fetch(`${this.baseUrl}?ids=${cleanId}`, {
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
      console.error(`[GutenbergProvider] Erro ao obter livro ${id}:`, error);
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

  private mapToUnifiedBook(item: GutendexBook): UnifiedBook {
    const authors = (item.authors || []).map((a) => {
      // Inverte "Assis, Machado de" para "Machado de Assis"
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
        downloadOptions.push({ format: 'EPUB', url, isDirectDownload: true });
      } else if (mime.includes('mobipocket') || mime.includes('kf8') || mime.includes('mobi')) {
        downloadOptions.push({ format: 'MOBI', url, isDirectDownload: true });
      } else if (mime.includes('text/html')) {
        downloadOptions.push({ format: 'HTML', url, isDirectDownload: true });
      } else if (mime.includes('text/plain')) {
        downloadOptions.push({ format: 'TXT', url, isDirectDownload: true });
      } else if (mime.includes('image/jpeg')) {
        coverUrl = url;
      }
    }

    // Normaliza gêneros/assuntos
    const genres = Array.from(
      new Set(
        [...(item.subjects || []), ...(item.bookshelves || [])]
          .map((s) => s.split('--')[0].trim())
          .filter(Boolean)
          .slice(0, 5)
      )
    );

    const primaryAuthor = authors[0] || '';
    const slug = `gutenberg-${item.id}`;

    return {
      id: `gutenberg:${item.id}`,
      slug,
      title: item.title,
      authors: authors.length > 0 ? authors : ['Autor Desconhecido'],
      description: `Edição em domínio público disponibilizada pelo Project Gutenberg. Assuntos: ${genres.join(', ') || 'Clássicos da literatura'}. Idioma: ${item.languages?.join(', ') || 'pt'}.`,
      coverUrl,
      publicationYear: undefined,
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
