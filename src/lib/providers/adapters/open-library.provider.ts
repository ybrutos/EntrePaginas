import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface OpenLibraryDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  subject?: string[];
  language?: string[];
  publisher?: string[];
  ebook_access?: string;
  public_scan_b?: boolean;
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export class OpenLibraryProvider implements BookProvider {
  readonly name = 'openlibrary';
  private readonly config = PROVIDERS_CONFIG.openlibrary;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const url = new URL(`${this.config.baseUrl}/search.json`);
      url.searchParams.set('q', query || 'literatura');
      url.searchParams.set('limit', String(filters?.limit || 12));
      url.searchParams.set('page', String(filters?.page || 1));

      if (filters?.author) url.searchParams.set('author', filters.author);
      if (filters?.title) url.searchParams.set('title', filters.title);
      if (filters?.genre && filters.genre !== 'Todos') url.searchParams.set('subject', filters.genre);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data: OpenLibrarySearchResponse = await res.json();
      const items = (data.docs || []).map((doc) => this.mapDocToUnifiedBook(doc));

      return {
        totalCount: data.numFound || items.length,
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
      const cleanKey = id.replace(/^openlibrary:/i, '');
      const workKey = cleanKey.startsWith('/') ? cleanKey : `/works/${cleanKey}`;
      
      const res = await fetch(`${this.config.baseUrl}${workKey}.json`, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) return null;
      const work = await res.json();

      let description = '';
      if (typeof work.description === 'string') {
        description = work.description;
      } else if (work.description?.value) {
        description = work.description.value;
      }

      const coverId = work.covers?.[0];
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;
      const genres = (work.subjects || []).slice(0, 6);

      return {
        id: `openlibrary:${work.key.replace('/works/', '')}`,
        slug: `openlibrary-${work.key.replace('/works/', '')}`,
        title: work.title,
        subtitle: work.subtitle,
        authors: ['Autor Registrado na Open Library'],
        description: description || 'Registro bibliográfico catalogado pela Open Library.',
        coverUrl,
        language: 'pt',
        genres: genres.length > 0 ? genres : ['Literatura'],
        isPublicDomain: false,
        license: 'Informações do livro disponíveis — download não disponível nesta fonte.',
        officialSourceUrl: `${this.config.baseUrl}${work.key}`,
        sources: [
          {
            sourceName: 'openlibrary',
            externalId: work.key,
            canonicalUrl: `${this.config.baseUrl}${work.key}`,
            isLegalDownload: false,
          },
        ],
        downloadOptions: [],
      };
    } catch (error) {
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
      const res = await fetch(`${this.config.baseUrl}/search.json?q=test&limit=1`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private mapDocToUnifiedBook(doc: OpenLibraryDoc): UnifiedBook {
    const workId = doc.key.replace('/works/', '');
    const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined;
    const pageCount = doc.number_of_pages_median;
    const estimatedWords = pageCount ? pageCount * 250 : undefined;
    const genres = (doc.subject || []).slice(0, 5);
    const isPublicDomain = doc.ebook_access === 'public' || doc.public_scan_b === true;

    return {
      id: `openlibrary:${workId}`,
      slug: `openlibrary-${workId}`,
      title: doc.title,
      subtitle: doc.subtitle,
      authors: doc.author_name && doc.author_name.length > 0 ? doc.author_name : ['Autor Desconhecido'],
      description: `Registro bibliográfico da obra "${doc.title}". Metadados fornecidos via Open Library.`,
      coverUrl,
      publicationYear: doc.first_publish_year,
      language: doc.language?.[0] || 'pt',
      genres: genres.length > 0 ? genres : ['Literatura Geral'],
      publisher: doc.publisher?.[0],
      isbn: doc.isbn?.[0],
      pageCount,
      estimatedWords,
      isPublicDomain,
      license: isPublicDomain ? 'Domínio Público / Acesso Aberto' : 'Informações do livro disponíveis — download não disponível nesta fonte.',
      officialSourceUrl: `${this.config.baseUrl}${doc.key}`,
      sources: [
        {
          sourceName: 'openlibrary',
          externalId: workId,
          canonicalUrl: `${this.config.baseUrl}${doc.key}`,
          license: isPublicDomain ? 'Public Domain' : 'Copyright',
          isLegalDownload: false,
        },
      ],
      downloadOptions: [],
    };
  }
}
