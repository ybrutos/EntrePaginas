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

export class StandardEbooksProvider implements BookProvider {
  readonly id = 'standard_ebooks';
  readonly name = 'Standard Ebooks';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.standard_ebooks;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: true,
    preview: false,
    legalDownload: true,
    libraryBorrow: false,
    audiobook: false,
    physicalCopy: false,
    isbnLookup: false,
    multilingual: false,
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
        // Standard Ebooks disponibiliza catálogo em OPDS feed XML
        const res = await fetch(`${this.config.baseUrl}/all`, {
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

        const xmlText = await res.text();
        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        const cleanQ = normalizeString(query.rawQuery || query.title || '');

        // Parser regex rápido de atom entries do feed OPDS
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        let match;

        while ((match = entryRegex.exec(xmlText)) !== null) {
          const entry = match[1];

          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
          const authorMatch = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i);
          const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/i);
          const summaryMatch = entry.match(/<summary[\s\S]*?>([\s\S]*?)<\/summary>/i);
          const epubMatch = entry.match(/<link[^>]+type="application\/epub\+zip"[^>]+href="([^"]+)"/i);
          const azw3Match = entry.match(/<link[^>]+type="application\/x-mobipocket-ebook"[^>]+href="([^"]+)"/i);
          const coverMatch = entry.match(/<link[^>]+rel="http:\/\/opds-spec\.org\/image"[^>]+href="([^"]+)"/i);

          const title = titleMatch ? titleMatch[1].trim() : '';
          const author = authorMatch ? authorMatch[1].trim() : 'Domínio Público';
          const fullId = idMatch ? idMatch[1].trim() : '';
          const slug = fullId.split('/').pop() || Math.random().toString(36).slice(2);

          // Filtro por termo
          if (cleanQ) {
            const normTitle = normalizeString(title);
            const normAuthor = normalizeString(author);
            if (!normTitle.includes(cleanQ) && !normAuthor.includes(cleanQ)) {
              continue;
            }
          }

          const coverUrl = coverMatch ? (coverMatch[1].startsWith('http') ? coverMatch[1] : `https://standardebooks.org${coverMatch[1]}`) : undefined;
          const accessLinks: BookAccessLink[] = [];

          if (epubMatch) {
            const epubUrl = epubMatch[1].startsWith('http') ? epubMatch[1] : `https://standardebooks.org${epubMatch[1]}`;
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: epubUrl,
              label: 'Baixar EPUB Alta Tipografia (CC0 / Domínio Público)',
              format: 'EPUB',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
              notes: 'Edição de arte com tipografia refinada e sem DRM.',
            });
          }

          if (azw3Match) {
            const azw3Url = azw3Match[1].startsWith('http') ? azw3Match[1] : `https://standardebooks.org${azw3Match[1]}`;
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: azw3Url,
              label: 'Baixar Formato Kindle (AZW3)',
              format: 'AZW3',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          }

          const edition: EditionRecord = {
            id: `se_ed_${slug}`,
            workId: `se_${slug}`,
            title,
            language: 'en',
            publisher: 'Standard Ebooks',
            coverUrl,
            format: 'EPUB / AZW3 / KEPUB',
            accessLinks,
            sourceName: this.name,
            externalId: slug,
          };

          const work: WorkRecord = {
            id: `se_${slug}`,
            canonicalTitle: title,
            normalizedTitle: normalizeString(title),
            authors: [author],
            primaryAuthorName: author,
            coverUrl,
            description: summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, '').trim() : undefined,
            genres: ['Clássicos', 'Domínio Público', 'Edição Refinada'],
            aliases: [],
            identifiers: [
              { type: 'STANDARDEBOOKS_ID', value: slug }
            ],
            editions: [edition],
            accessLinks,
            audiobooks: [],
            sourcesCount: 1,
          };

          works.push(work);
          editions.push(edition);

          if (works.length >= (query.limit || 12)) break;
        }

        return {
          providerId: this.id,
          totalCount: works.length,
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
    const cleanId = id.replace('standard_ebooks:', '').replace('se_', '');
    const res = await this.search({ rawQuery: cleanId, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/all`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
