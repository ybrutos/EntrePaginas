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

interface GBVolumeItem {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      extraLarge?: string;
    };
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  saleInfo?: {
    country?: string;
    saleability?: 'FOR_SALE' | 'NOT_FOR_SALE' | 'FREE';
    isEbook?: boolean;
    listPrice?: { amount: number; currencyCode: string };
    retailPrice?: { amount: number; currencyCode: string };
    buyLink?: string;
  };
  accessInfo?: {
    country?: string;
    viewability?: 'FULL' | 'PARTIAL' | 'ALL_PAGES' | 'NO_PAGES';
    embeddable?: boolean;
    publicDomain?: boolean;
    textToSpeechPermission?: string;
    epub?: { isAvailable: boolean; acsTokenLink?: string; downloadLink?: string };
    pdf?: { isAvailable: boolean; acsTokenLink?: string; downloadLink?: string };
    webReaderLink?: string;
    accessViewStatus?: string;
  };
}

export class GoogleBooksProvider implements BookProvider {
  readonly id = 'google_books';
  readonly name = 'Google Books';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.google_books;
  private readonly circuitBreaker: CircuitBreaker;

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: false,
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
        const url = new URL(this.config.baseUrl);

        let q = query.rawQuery || '';
        if (query.isbn) {
          q = `isbn:${query.isbn}`;
        } else if (query.title && query.author) {
          q = `intitle:${query.title} inauthor:${query.author}`;
        } else if (query.title) {
          q = `intitle:${query.title}`;
        } else if (query.author) {
          q = `inauthor:${query.author}`;
        }

        url.searchParams.set('q', q || 'livros');
        url.searchParams.set('maxResults', String(Math.min(query.limit || 12, 40)));
        if (query.page && query.page > 1) {
          url.searchParams.set('startIndex', String((query.page - 1) * (query.limit || 12)));
        }

        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        if (apiKey) {
          url.searchParams.set('key', apiKey);
        }

        const res = await fetch(url.toString(), { signal });

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
        const items: GBVolumeItem[] = data.items || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const item of items) {
          const v = item.volumeInfo;
          const s = item.saleInfo;
          const a = item.accessInfo;

          const coverUrl = v.imageLinks?.extraLarge || v.imageLinks?.thumbnail?.replace('&edge=curl', '');
          const isbn13 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier;
          const isbn10 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier;

          const accessLinks: BookAccessLink[] = [];

          // CLASSIFICAÇÃO HONESTA DE DISPONIBILIDADE
          // 1. Caso comercial (compra)
          if (s?.saleability === 'FOR_SALE' && s.buyLink) {
            const price = s.retailPrice || s.listPrice;
            const priceStr = price ? `${price.currencyCode} ${price.amount.toFixed(2)}` : 'Preço sob consulta';
            accessLinks.push({
              type: AccessType.COMMERCIAL_PURCHASE,
              url: s.buyLink,
              label: `Comprar eBook Comercial (${priceStr})`,
              format: 'eBook Comercial',
              isExternal: true,
              sourceName: 'Google Play Livros',
              price: priceStr,
              verifiedAt: now,
              notes: 'Edição comercial protegida; sem download gratuito autorizado.',
            });
          }

          // 2. Caso prévia parcial
          if (a?.viewability === 'PARTIAL' && v.previewLink) {
            accessLinks.push({
              type: AccessType.PREVIEW,
              url: v.previewLink,
              label: 'Visualizar Prévia Parcial (Amostra de leitura)',
              format: 'Prévia Web',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: '⚠️ PRÉVIA PARCIAL: Esta fonte fornece apenas amostra das páginas. O restante é comercial.',
            });
          } else if (a?.viewability === 'ALL_PAGES' || a?.publicDomain) {
            // Domínio público ou visualização completa
            accessLinks.push({
              type: AccessType.PUBLIC_DOMAIN,
              url: v.previewLink || v.canonicalVolumeLink || `https://books.google.com/books?id=${item.id}`,
              label: 'Visualização completa autorizada',
              format: 'Leitor Web Integral',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
            });
          } else {
            // Metadados apenas
            accessLinks.push({
              type: AccessType.METADATA_ONLY,
              url: v.canonicalVolumeLink || v.infoLink || `https://books.google.com/books?id=${item.id}`,
              label: 'Registro bibliográfico no Google Books',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: 'Apenas registro bibliográfico de catálogo.',
            });
          }

          let pubYear: number | undefined;
          if (v.publishedDate) {
            const yearMatch = v.publishedDate.match(/^(\d{4})/);
            if (yearMatch) pubYear = parseInt(yearMatch[1], 10);
          }

          const edition: EditionRecord = {
            id: `gb_ed_${item.id}`,
            workId: `gb_${item.id}`,
            title: v.title,
            subtitle: v.subtitle,
            language: v.language || 'und',
            publisher: v.publisher,
            publicationYear: pubYear,
            isbn10,
            isbn13,
            coverUrl,
            pageCount: v.pageCount,
            accessLinks,
            sourceName: this.name,
            externalId: item.id,
          };

          const work: WorkRecord = {
            id: `gb_${item.id}`,
            canonicalTitle: v.title,
            normalizedTitle: normalizeString(v.title),
            authors: v.authors || ['Autor desconhecido'],
            primaryAuthorName: v.authors?.[0],
            firstPublicationYear: pubYear,
            coverUrl,
            description: v.description,
            genres: v.categories || [],
            aliases: [],
            identifiers: [
              ...(isbn13 ? [{ type: 'ISBN13', value: isbn13 }] : []),
              ...(isbn10 ? [{ type: 'ISBN10', value: isbn10 }] : []),
              { type: 'GOOGLE_BOOKS_ID', value: item.id },
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
          totalCount: data.totalItems || works.length,
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
    const cleanId = id.replace('google_books:', '').replace('gb_', '');
    const start = Date.now();
    try {
      const url = new URL(`${this.config.baseUrl}/${cleanId}`);
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      if (apiKey) url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) return null;

      const item: GBVolumeItem = await res.json();
      const v = item.volumeInfo;
      const s = item.saleInfo;
      const a = item.accessInfo;

      const isbn13 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier;
      const isbn10 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier;
      const coverUrl = v.imageLinks?.extraLarge || v.imageLinks?.thumbnail?.replace('&edge=curl', '');
      const now = new Date();

      const accessLinks: BookAccessLink[] = [];
      if (s?.saleability === 'FOR_SALE' && s.buyLink) {
        accessLinks.push({
          type: AccessType.COMMERCIAL_PURCHASE,
          url: s.buyLink,
          label: 'Comprar no Google Play Livros',
          format: 'eBook Comercial',
          isExternal: true,
          sourceName: 'Google Play Livros',
          verifiedAt: now,
        });
      }
      if (a?.viewability === 'PARTIAL' && v.previewLink) {
        accessLinks.push({
          type: AccessType.PREVIEW,
          url: v.previewLink,
          label: 'Visualizar Prévia Parcial (Google Books)',
          format: 'Prévia Web',
          isExternal: true,
          sourceName: this.name,
          verifiedAt: now,
          notes: 'Apenas páginas de demonstração.',
        });
      }

      return {
        id: `gb_${item.id}`,
        canonicalTitle: v.title,
        normalizedTitle: normalizeString(v.title),
        authors: v.authors || ['Autor desconhecido'],
        primaryAuthorName: v.authors?.[0],
        coverUrl,
        description: v.description,
        genres: v.categories || [],
        aliases: [],
        identifiers: [
          ...(isbn13 ? [{ type: 'ISBN13', value: isbn13 }] : []),
          ...(isbn10 ? [{ type: 'ISBN10', value: isbn10 }] : []),
          { type: 'GOOGLE_BOOKS_ID', value: item.id },
        ],
        editions: [],
        accessLinks,
        audiobooks: [],
        sourcesCount: 1,
      };
    } catch {
      return null;
    }
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}?q=test&maxResults=1`);
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
