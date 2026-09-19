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

interface IADoc {
  identifier: string;
  title: string;
  creator?: string | string[];
  description?: string;
  year?: string;
  mediatype: string;
  publicdate?: string;
  language?: string;
  format?: string[];
  licenseurl?: string;
  lending_url?: string;
}

export class InternetArchiveProvider implements BookProvider {
  readonly id = 'internet_archive';
  readonly name = 'Internet Archive';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.internet_archive;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (pesquisa-bibliografica; contato@entre-paginas.local)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: true,
    fullText: true,
    preview: true,
    legalDownload: true,
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
        const url = new URL(`${this.config.baseUrl}/advancedsearch.php`);

        let qTerms = query.rawQuery || '';
        if (query.title) qTerms += ` AND title:(${query.title})`;
        if (query.author) qTerms += ` AND creator:(${query.author})`;

        // Filtro estrito: somente textos/livros, bloqueio inegociável de arquivos não bibliográficos
        const fullQ = `mediatype:(texts) AND (${qTerms || 'Machado de Assis'}) AND NOT format:(torrent)`;
        url.searchParams.set('q', fullQ);
        url.searchParams.set('fl[]', 'identifier,title,creator,description,year,mediatype,language,format,licenseurl');
        url.searchParams.set('rows', String(query.limit || 12));
        url.searchParams.set('page', String(query.page || 1));
        url.searchParams.set('output', 'json');

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
        const docs: IADoc[] = data.response?.docs || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const doc of docs) {
          const externalId = doc.identifier;
          const coverUrl = `https://archive.org/services/img/${externalId}`;

          const authors = Array.isArray(doc.creator)
            ? doc.creator
            : doc.creator
            ? [doc.creator]
            : ['Autor histórico / Acervo IA'];

          const formats = doc.format || [];

          // CLASSIFICAÇÃO RIGOROSA E HONESTA
          const accessLinks: BookAccessLink[] = [];
          const hasEpub = formats.includes('EPUB') || formats.includes('Text PDF');
          const isPublicDomain = Boolean(
            doc.licenseurl?.includes('publicdomain') ||
            doc.licenseurl?.includes('creativecommons.org/publicdomain') ||
            (doc.year && parseInt(doc.year, 10) < 1928)
          );

          if (isPublicDomain && hasEpub) {
            accessLinks.push({
              type: AccessType.OPEN_ACCESS,
              url: `https://archive.org/download/${externalId}/${externalId}.pdf`,
              label: 'Baixar digitalização pública (PDF aberto)',
              format: 'PDF',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          } else {
            // Empréstimo digital controlado ou leitura online
            accessLinks.push({
              type: AccessType.CONTROLLED_DIGITAL_LENDING,
              url: `https://archive.org/details/${externalId}`,
              label: 'Empréstimo Digital Controlado (Leitor IA)',
              format: 'Leitor Web',
              isExternal: true,
              sourceName: this.name,
              verifiedAt: now,
              notes: 'Empréstimo digital de 1 hora controlado pelo Internet Archive. Não é download livre.',
            });
          }

          let pubYear: number | undefined;
          if (doc.year) {
            const parsed = parseInt(doc.year, 10);
            if (!isNaN(parsed)) pubYear = parsed;
          }

          const edition: EditionRecord = {
            id: `ia_ed_${externalId}`,
            workId: `ia_${externalId}`,
            title: doc.title,
            language: doc.language || 'und',
            publisher: 'Internet Archive Open Library Collection',
            publicationYear: pubYear,
            coverUrl,
            accessLinks,
            sourceName: this.name,
            externalId,
          };

          const work: WorkRecord = {
            id: `ia_${externalId}`,
            canonicalTitle: doc.title,
            normalizedTitle: normalizeString(doc.title),
            authors,
            primaryAuthorName: authors[0],
            firstPublicationYear: pubYear,
            coverUrl,
            description: doc.description,
            genres: ['Digitalizações Históricas', 'Acervos de Bibliotecas'],
            aliases: [],
            identifiers: [
              { type: 'INTERNET_ARCHIVE_ID', value: externalId }
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
          totalCount: data.response?.numFound || works.length,
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
    const cleanId = id.replace('internet_archive:', '').replace('ia_', '');
    const res = await this.search({ rawQuery: cleanId, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/advancedsearch.php?q=Machado&rows=1&output=json`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
