import { 
  BookProvider, 
  BookSearchResult, 
  UnifiedBook, 
  DownloadOption, 
  SearchFilters 
} from '../book-provider.interface';
import { PROVIDERS_CONFIG } from '../provider.config';
import { XMLParser } from 'fast-xml-parser';

export class StandardEbooksProvider implements BookProvider {
  readonly name = 'standard_ebooks';
  private readonly config = PROVIDERS_CONFIG.standard_ebooks;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  private mapMimeToFormat(mime: string): string | null {
    if (!mime) return null;
    const m = mime.toLowerCase();
    if (m === 'application/epub+zip') return 'EPUB';
    if (m === 'application/kepub+zip') return 'KEPUB';
    if (m === 'application/x-mobipocket-ebook') return 'AZW3';
    return null; // Ignora XHTML e afins para a lista de download direto
  }

  async searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult> {
    try {
      const cleanQ = query.trim().toLowerCase();
      // O OPDS oficial mudou a base de busca (redireciona para /feeds/opds)
      const url = `https://standardebooks.org/feeds/opds/all?query=${encodeURIComponent(cleanQ)}`;

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
      // Para pegar um livro específico, não podemos forjar. Vamos buscar a entrada dele no OPDS.
      const url = `https://standardebooks.org/feeds/opds/all?query=${encodeURIComponent(cleanId)}`;
      const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
      
      if (!res.ok) return null;
      
      const xmlText = await res.text();
      const items = this.parseOpdsEntries(xmlText);
      
      // Filtra exatamente pelo ID para evitar matches parciais na busca
      const exactMatch = items.find(item => item.id === `standard_ebooks:${cleanId}` || item.sources[0]?.canonicalUrl?.includes(cleanId));
      
      return exactMatch || (items.length > 0 ? items[0] : null);
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
      const res = await fetch('https://standardebooks.org/feeds/opds/all', {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }

  private parseOpdsEntries(xml: string): UnifiedBook[] {
    const items: UnifiedBook[] = [];
    
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: false,
        trimValues: true,
      });

      const parsed = parser.parse(xml);
      const entries = parsed.feed?.entry;
      if (!entries) return [];

      const entryArray = Array.isArray(entries) ? entries : [entries];

      for (const entry of entryArray) {
        // Extrai ID real (canonical url)
        let identifier = entry.id;
        if (typeof identifier === 'object') identifier = identifier['#text'];
        if (!identifier) continue;

        const rawId = identifier.replace('https://standardebooks.org/ebooks/', '').replace('urn:standardebooks:', '');

        // Extrai título
        let title = entry.title;
        if (typeof title === 'object') title = title['#text'];

        // Extrai autor
        let authors = ['Autor Desconhecido'];
        if (entry.author) {
          const authArray = Array.isArray(entry.author) ? entry.author : [entry.author];
          authors = authArray.map((a: any) => typeof a.name === 'object' ? a.name['#text'] : a.name).filter(Boolean);
        }

        // Extrai links de download legítimos
        const links = entry.link;
        const linkArray = Array.isArray(links) ? links : [links];
        const downloadOptions: DownloadOption[] = [];
        let coverUrl = `https://standardebooks.org/ebooks/${rawId}/downloads/cover.jpg`;

        for (const link of linkArray) {
          const href = link['@_href'];
          const rel = link['@_rel'];
          const type = link['@_type'];
          const lengthStr = link['@_length'];

          if (!href) continue;

          // Capa (image/jpeg)
          if (rel?.includes('image') && type === 'image/jpeg' && !href.includes('thumbnail')) {
            coverUrl = href;
            continue;
          }

          // Arquivos de ebook (open-access)
          if (rel === 'http://opds-spec.org/acquisition/open-access') {
            const format = this.mapMimeToFormat(type);
            if (format) {
              const opt: DownloadOption = {
                format,
                url: href, // Preserva URL exata com query params (ex: ?source=feed)
                isDirectDownload: true,
              };
              
              if (lengthStr) {
                const bytes = parseInt(lengthStr, 10);
                if (!isNaN(bytes)) {
                  opt.sizeBytes = bytes;
                }
              }

              // Previne duplicação do mesmo formato priorizando o 'Recommended'
              const existing = downloadOptions.find(d => d.format === format);
              if (!existing) {
                downloadOptions.push(opt);
              } else if (link['@_title']?.toLowerCase().includes('recommended')) {
                // Substitui pelo recomendado se já houver um Advanced
                const idx = downloadOptions.indexOf(existing);
                downloadOptions[idx] = opt;
              }
            }
          }
        }

        items.push({
          id: `standard_ebooks:${rawId}`,
          slug: `se-${rawId.replace(/\//g, '-')}`,
          title: title || rawId,
          authors,
          description: 'Edição em domínio público com tratamento editorial de excelência pelo Standard Ebooks.',
          coverUrl,
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
              isLegalDownload: downloadOptions.length > 0,
            },
          ],
          downloadOptions,
        });
      }
    } catch (err) {
      console.error('Erro ao fazer parse do OPDS do Standard Ebooks:', err);
    }

    return items;
  }
}
