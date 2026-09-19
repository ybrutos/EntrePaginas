import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

interface IADoc {
  identifier: string;
  title: string;
  creator?: string | string[];
  year?: string;
  description?: string;
  mediatype?: string;
}

interface IASearchResponse {
  response: {
    numFound: number;
    docs: IADoc[];
  };
}

interface IAFile {
  name: string;
  format: string;
  size?: string;
}

interface IAMetadataResponse {
  files?: IAFile[];
  metadata?: {
    title?: string;
    creator?: string;
    description?: string;
    year?: string;
    licenseurl?: string;
  };
}

export class InternetArchiveProvider implements BookProvider {
  readonly name = 'internet_archive';
  private readonly config = PROVIDERS_CONFIG.internet_archive;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const cleanQ = query && query.trim().length > 0 ? query.trim() : 'Machado de Assis';
      const searchUrl = `${this.config.baseUrl}/advancedsearch.php?q=title%3A(${encodeURIComponent(cleanQ)})+AND+mediatype%3Atexts+AND+format%3A(EPUB+OR+MOBI+OR+PDF)&fl[]=identifier,title,creator,year,description&rows=${filters?.limit || 8}&output=json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const data: IASearchResponse = await res.json();
      const docs = data.response?.docs || [];
      const items = docs.map((doc) => this.mapDocToUnifiedBook(doc));

      return {
        totalCount: data.response?.numFound || items.length,
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
      const cleanId = id.replace(/^internet_archive:/i, '');
      const metaUrl = `${this.config.baseUrl}/metadata/${cleanId}`;

      const res = await fetch(metaUrl, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) return null;
      const data: IAMetadataResponse = await res.json();
      const meta = data.metadata || {};

      // Extrai formatos de download legais (PDF, EPUB, TXT)
      // REGRA DE OURO: Ignora rigorosamente qualquer arquivo .torrent
      const downloadOptions: DownloadOption[] = [];
      for (const file of data.files || []) {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.torrent') || lowerName.endsWith('.xml') || lowerName.endsWith('.sqlite')) {
          continue; // Pula torrents e metadados internos
        }

        const fileUrl = `${this.config.baseUrl}/download/${cleanId}/${encodeURIComponent(file.name)}`;
        const sizeBytes = file.size ? parseInt(file.size, 10) : undefined;

        if (lowerName.endsWith('.pdf')) {
          downloadOptions.push({ format: 'PDF', url: fileUrl, sizeBytes, isDirectDownload: true, sourceName: 'Internet Archive' });
        } else if (lowerName.endsWith('.epub')) {
          downloadOptions.push({ format: 'EPUB', url: fileUrl, sizeBytes, isDirectDownload: true, sourceName: 'Internet Archive' });
        } else if (lowerName.endsWith('.txt')) {
          downloadOptions.push({ format: 'TXT', url: fileUrl, sizeBytes, isDirectDownload: true, sourceName: 'Internet Archive' });
        } else if (lowerName.endsWith('.mobi')) {
          downloadOptions.push({ format: 'MOBI', url: fileUrl, sizeBytes, isDirectDownload: true, sourceName: 'Internet Archive' });
        }
      }

      return {
        id: `internet_archive:${cleanId}`,
        slug: `ia-${cleanId}`,
        title: meta.title || cleanId,
        authors: meta.creator ? [meta.creator] : ['Autor Desconhecido'],
        description: meta.description ? meta.description.replace(/<[^>]*>?/gm, '').trim() : 'Digitalização em acesso aberto preservada pelo Internet Archive.',
        coverUrl: `${this.config.baseUrl}/services/img/${cleanId}`,
        publicationYear: meta.year ? parseInt(meta.year, 10) : undefined,
        language: 'pt',
        genres: ['Digitalização Histórica', 'Acesso Aberto', 'Acervo Histórico'],
        isPublicDomain: true,
        license: meta.licenseurl || 'Acesso Aberto / Digitalização Pública',
        officialSourceUrl: `${this.config.baseUrl}/details/${cleanId}`,
        sources: [
          {
            sourceName: 'internet_archive',
            externalId: cleanId,
            canonicalUrl: `${this.config.baseUrl}/details/${cleanId}`,
            license: 'Open Access',
            isLegalDownload: downloadOptions.length > 0,
          },
        ],
        downloadOptions,
      };
    } catch (error) {
      return null;
    }
  }

  async getDownloadOptions(id: string): Promise<DownloadOption[]> {
    const book = await this.getBook(id);
    return book?.downloadOptions || [];
  }

  async getCover(id: string): Promise<string | null> {
    const cleanId = id.replace(/^internet_archive:/i, '');
    return `${this.config.baseUrl}/services/img/${cleanId}`;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/advancedsearch.php?q=mediatype%3Atexts&rows=1&output=json`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private mapDocToUnifiedBook(doc: IADoc): UnifiedBook {
    const creators = Array.isArray(doc.creator) 
      ? doc.creator 
      : doc.creator 
      ? [doc.creator] 
      : ['Autor Desconhecido'];

    const coverUrl = `${this.config.baseUrl}/services/img/${doc.identifier}`;

    return {
      id: `internet_archive:${doc.identifier}`,
      slug: `ia-${doc.identifier}`,
      title: doc.title || doc.identifier,
      authors: creators,
      description: doc.description ? doc.description.replace(/<[^>]*>?/gm, '').trim() : 'Digitalização de acervo histórico disponibilizada pelo Internet Archive.',
      coverUrl,
      publicationYear: doc.year ? parseInt(doc.year, 10) : undefined,
      language: 'pt',
      genres: ['Acervo Histórico', 'Acesso Aberto'],
      isPublicDomain: true,
      license: 'Acesso Aberto / Digitalização Pública',
      officialSourceUrl: `${this.config.baseUrl}/details/${doc.identifier}`,
      sources: [
        {
          sourceName: 'internet_archive',
          externalId: doc.identifier,
          canonicalUrl: `${this.config.baseUrl}/details/${doc.identifier}`,
          license: 'Open Access',
          isLegalDownload: true,
        },
      ],
      downloadOptions: [
        {
          format: 'PDF',
          url: `${this.config.baseUrl}/download/${doc.identifier}/${doc.identifier}.pdf`,
          isDirectDownload: true,
        },
      ],
    };
  }
}
