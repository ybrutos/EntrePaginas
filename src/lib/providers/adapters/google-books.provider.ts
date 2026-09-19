import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
    infoLink?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
  accessInfo?: {
    publicDomain?: boolean;
    webReaderLink?: string;
  };
}

export class GoogleBooksProvider implements BookProvider {
  readonly name = 'google_books';
  private readonly config = PROVIDERS_CONFIG.google_books;

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const cleanQ = query && query.trim().length > 0 ? query.trim() : 'Machado de Assis';
      const url = new URL(this.config.baseUrl);
      url.searchParams.set('q', cleanQ);
      url.searchParams.set('maxResults', String(filters?.limit || 8));

      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (apiKey) {
        url.searchParams.set('key', apiKey);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        // Tolerância de cota sem quebrar a busca
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data = await res.json();
      const itemsList: GoogleVolume[] = data.items || [];
      const items = itemsList.map((item) => this.mapVolumeToUnified(item));

      return {
        totalCount: data.totalItems || items.length,
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
      const cleanId = id.replace(/^google_books:/i, '');
      const url = new URL(`${this.config.baseUrl}/${cleanId}`);
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (apiKey) url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data: GoogleVolume = await res.json();
      return this.mapVolumeToUnified(data);
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
    const start = Date.now();
    try {
      const url = new URL(this.config.baseUrl);
      url.searchParams.set('q', 'test');
      url.searchParams.set('maxResults', '1');
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (apiKey) url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private mapVolumeToUnified(volume: GoogleVolume): UnifiedBook {
    const info = volume.volumeInfo || {};
    const isbn = info.industryIdentifiers?.find((i) => i.type.includes('13') || i.type.includes('10'))?.identifier;
    const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://');
    const isPublicDomain = Boolean(volume.accessInfo?.publicDomain);

    return {
      id: `google_books:${volume.id}`,
      slug: `gb-${volume.id}`,
      title: info.title || 'Título Desconhecido',
      subtitle: info.subtitle,
      authors: info.authors && info.authors.length > 0 ? info.authors : ['Autor Desconhecido'],
      description: info.description ? info.description.replace(/<[^>]*>?/gm, '').trim() : 'Registro bibliográfico no Google Books.',
      coverUrl,
      publicationYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : undefined,
      language: info.language || 'pt',
      genres: info.categories || ['Literatura'],
      publisher: info.publisher,
      isbn,
      pageCount: info.pageCount,
      estimatedWords: info.pageCount ? info.pageCount * 250 : undefined,
      isPublicDomain,
      license: isPublicDomain ? 'Domínio Público (Google Books)' : 'Disponível apenas para consulta/metadados nesta fonte.',
      officialSourceUrl: info.infoLink || `https://books.google.com/books?id=${volume.id}`,
      sources: [
        {
          sourceName: 'google_books',
          externalId: volume.id,
          canonicalUrl: info.infoLink,
          license: isPublicDomain ? 'Public Domain' : 'Copyright',
          isLegalDownload: false,
        },
      ],
      downloadOptions: [],
    };
  }
}
