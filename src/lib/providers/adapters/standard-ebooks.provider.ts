import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';

export class StandardEbooksProvider implements BookProvider {
  readonly name = 'standard_ebooks';
  private readonly config = PROVIDERS_CONFIG.standard_ebooks;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const cleanQ = query.trim().toLowerCase();
      // Standard Ebooks possui catálogo com clássicos refinados
      const url = `https://standardebooks.org/opds/all?query=${encodeURIComponent(cleanQ)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        return { totalCount: 0, items: [], page: filters?.page || 1, provider: this.name };
      }

      const xmlText = await res.text();
      const items = this.parseOpdsEntries(xmlText);

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
      const cleanId = id.replace(/^standard_ebooks:/i, '');
      const url = `https://standardebooks.org/ebooks/${cleanId}`;
      const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
      if (!res.ok) return null;

      const title = cleanId.split('/').pop()?.replace(/-/g, ' ') || cleanId;
      const downloadOptions: DownloadOption[] = [
        {
          format: 'EPUB',
          url: `https://standardebooks.org/ebooks/${cleanId}/downloads/${cleanId.replace('/', '_')}.epub`,
          isDirectDownload: true,
        },
        {
          format: 'AZW3',
          url: `https://standardebooks.org/ebooks/${cleanId}/downloads/${cleanId.replace('/', '_')}.azw3`,
          isDirectDownload: true,
        },
        {
          format: 'KEPUB',
          url: `https://standardebooks.org/ebooks/${cleanId}/downloads/${cleanId.replace('/', '_')}.kepub.epub`,
          isDirectDownload: true,
        },
      ];

      return {
        id: `standard_ebooks:${cleanId}`,
        slug: `se-${cleanId.replace(/\//g, '-')}`,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        authors: ['Autor Clássico'],
        description: 'Edição de domínio público com tipografia e diagramação digital refinada pelo projeto Standard Ebooks.',
        coverUrl: `https://standardebooks.org/ebooks/${cleanId}/downloads/cover.jpg`,
        language: 'en',
        genres: ['Clássicos', 'Edição Refinada', 'Domínio Público'],
        isPublicDomain: true,
        license: 'Domínio Público / CC0 1.0 Universal',
        officialSourceUrl: url,
        sources: [
          {
            sourceName: 'standard_ebooks',
            externalId: cleanId,
            canonicalUrl: url,
            license: 'Public Domain / CC0',
            isLegalDownload: true,
          },
        ],
        downloadOptions,
      };
    } catch (e) {
      return null;
    }
  }

  async getDownloadOptions(id: string): Promise<DownloadOption[]> {
    const book = await this.getBook(id);
    return book?.downloadOptions || [];
  }

  async getCover(id: string): Promise<string | null> {
    const cleanId = id.replace(/^standard_ebooks:/i, '');
    return `https://standardebooks.org/ebooks/${cleanId}/downloads/cover.jpg`;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch('https://standardebooks.org/opds/all', {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private parseOpdsEntries(xml: string): UnifiedBook[] {
    const items: UnifiedBook[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null && items.length < 10) {
      const entryXml = match[1];
      const titleMatch = /<title>([^<]+)<\/title>/.exec(entryXml);
      const authorMatch = /<name>([^<]+)<\/name>/.exec(entryXml);
      const idMatch = /<id>urn:standardebooks:([^<]+)<\/id>/.exec(entryXml) || /<id>([^<]+)<\/id>/.exec(entryXml);

      if (titleMatch && idMatch) {
        const rawId = idMatch[1].replace('https://standardebooks.org/ebooks/', '').replace('urn:standardebooks:', '');
        items.push({
          id: `standard_ebooks:${rawId}`,
          slug: `se-${rawId.replace(/\//g, '-')}`,
          title: titleMatch[1].trim(),
          authors: authorMatch ? [authorMatch[1].trim()] : ['Autor Desconhecido'],
          description: 'Edição em domínio público com tratamento editorial de excelência pelo Standard Ebooks.',
          coverUrl: `https://standardebooks.org/ebooks/${rawId}/downloads/cover.jpg`,
          language: 'en',
          genres: ['Clássicos', 'Domínio Público'],
          isPublicDomain: true,
          license: 'Domínio Público / CC0',
          officialSourceUrl: `https://standardebooks.org/ebooks/${rawId}`,
          sources: [
            {
              sourceName: 'standard_ebooks',
              externalId: rawId,
              canonicalUrl: `https://standardebooks.org/ebooks/${rawId}`,
              license: 'Public Domain',
              isLegalDownload: true,
            },
          ],
          downloadOptions: [
            {
              format: 'EPUB',
              url: `https://standardebooks.org/ebooks/${rawId}/downloads/${rawId.replace('/', '_')}.epub`,
              isDirectDownload: true,
            },
          ],
        });
      }
    }

    return items;
  }
}
