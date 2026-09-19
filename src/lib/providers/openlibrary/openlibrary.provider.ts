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

interface OLSearchDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  oclc?: string[];
  subject?: string[];
  language?: string[];
  publisher?: string[];
  edition_key?: string[];
  ebook_access?: string;
  has_fulltext?: boolean;
}

export class OpenLibraryProvider implements BookProvider {
  readonly id = 'openlibrary';
  readonly name = 'Open Library';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.openlibrary;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta; contato@entre-paginas.local)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: false,
    preview: true,
    legalDownload: false,
    libraryBorrow: true,
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
        const url = new URL(`${this.config.baseUrl}/search.json`);
        
        if (query.isbn) {
          url.searchParams.set('isbn', query.isbn);
        } else if (query.oclc) {
          url.searchParams.set('oclc', query.oclc);
        } else {
          url.searchParams.set('q', query.rawQuery || 'literatura');
          if (query.author) url.searchParams.set('author', query.author);
          if (query.title) url.searchParams.set('title', query.title);
          if (query.language) url.searchParams.set('language', query.language);
          if (query.genre) url.searchParams.set('subject', query.genre);
        }

        url.searchParams.set('limit', String(query.limit || 12));
        url.searchParams.set('page', String(query.page || 1));

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': this.userAgent },
          signal,
        });

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
        const docs: OLSearchDoc[] = data.docs || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];

        for (const doc of docs) {
          const workKey = doc.key ? doc.key.replace('/works/', '') : `ol_${Math.random().toString(36).slice(2)}`;
          const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined;

          // Extração de ISBNs e OCLC
          const isbn13 = doc.isbn?.find((i) => i.replace(/[^\d]/g, '').length === 13);
          const isbn10 = doc.isbn?.find((i) => i.replace(/[^\dX]/g, '').length === 10);
          const oclcVal = doc.oclc?.[0];

          // Determinação honesta de disponibilidade no Open Library
          const accessLinks: BookAccessLink[] = [];
          const now = new Date();

          if (doc.ebook_access === 'borrowable') {
            accessLinks.push({
              type: AccessType.LIBRARY_BORROW,
              url: `https://openlibrary.org${doc.key}/borrow`,
              label: 'Empréstimo digital na Open Library / Internet Archive',
              format: 'Leitor Web / Empréstimo',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: 'Requer conta gratuita na Open Library para empréstimo de 1 hora.',
            });
          } else if (doc.ebook_access === 'public') {
            accessLinks.push({
              type: AccessType.PUBLIC_DOMAIN,
              url: `https://openlibrary.org${doc.key}`,
              label: 'Visualização completa aberta',
              format: 'Web Reader',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
            });
          } else {
            accessLinks.push({
              type: AccessType.METADATA_ONLY,
              url: `https://openlibrary.org${doc.key}`,
              label: 'Ficha bibliográfica na Open Library',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: 'Apenas registro de catálogo; sem download integral autorizado nesta fonte.',
            });
          }

          const edition: EditionRecord = {
            id: `ol_ed_${workKey}`,
            workId: `ol_${workKey}`,
            title: doc.title,
            subtitle: doc.subtitle,
            language: doc.language?.[0] || 'und',
            publisher: doc.publisher?.[0],
            publicationYear: doc.first_publish_year,
            isbn10,
            isbn13,
            oclc: oclcVal,
            coverUrl,
            pageCount: doc.number_of_pages_median,
            accessLinks,
            sourceName: this.name,
            externalId: doc.key,
          };

          const work: WorkRecord = {
            id: `ol_${workKey}`,
            canonicalTitle: doc.title,
            normalizedTitle: normalizeString(doc.title),
            authors: doc.author_name || ['Autor desconhecido'],
            primaryAuthorName: doc.author_name?.[0],
            firstPublicationYear: doc.first_publish_year,
            coverUrl,
            genres: (doc.subject || []).slice(0, 5),
            aliases: [],
            identifiers: [
              ...(isbn13 ? [{ type: 'ISBN13', value: isbn13 }] : []),
              ...(isbn10 ? [{ type: 'ISBN10', value: isbn10 }] : []),
              ...(oclcVal ? [{ type: 'OCLC', value: oclcVal }] : []),
              { type: 'OPENLIBRARY_WORK', value: workKey },
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
          totalCount: data.numFound || works.length,
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
    const cleanId = id.replace('openlibrary:', '').replace('ol_', '');
    const res = await this.search({ rawQuery: cleanId, limit: 1 });
    return res.works[0] || null;
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
}
