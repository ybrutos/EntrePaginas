import { 
  BookProvider, 
  BookSearchQuery, 
  BookProviderResult, 
  WorkRecord, 
  EditionRecord, 
  AudiobookRecord,
  BookAccessLink, 
  AccessType,
  ProviderCapabilities 
} from '../types';
import { CircuitBreaker } from '../circuit-breaker';
import { PROVIDERS_REGISTRY_CONFIG } from '../providers.config';
import { normalizeString } from '../../utils/text';

interface LibriVoxBookItem {
  id: string;
  title: string;
  description?: string;
  url_text_source?: string;
  language: string;
  copyright_year?: string;
  totaltime?: string;
  totaltime_secs?: number;
  url_librivox: string;
  url_iarchive?: string;
  url_other?: string;
  url_zip_file?: string;
  url_project_gutenberg?: string;
  authors: Array<{ id: string; first_name: string; last_name: string; dob?: string; dod?: string }>;
  sections?: Array<{
    id: string;
    section_number: string;
    title: string;
    listen_url: string;
    playtime: string;
    readers: Array<{ reader_id: string; display_name: string }>;
  }>;
}

export class LibriVoxProvider implements BookProvider {
  readonly id = 'librivox';
  readonly name = 'LibriVox Audiobooks';
  private readonly config = PROVIDERS_REGISTRY_CONFIG.librivox;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly userAgent = 'EntrePaginas/2.0 (plataforma-literaria-aberta)';

  readonly capabilities: ProviderCapabilities = {
    search: true,
    metadata: true,
    covers: false,
    fullText: false,
    preview: false,
    legalDownload: true,
    libraryBorrow: false,
    audiobook: true,
    physicalCopy: false,
    isbnLookup: false,
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
        url.searchParams.set('format', 'json');

        const searchTerms = [query.rawQuery, query.title, query.author].filter(Boolean).join(' ').trim();
        if (searchTerms) {
          url.searchParams.set('title', `^${searchTerms}`);
        }
        url.searchParams.set('limit', String(query.limit || 12));

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
        const books: LibriVoxBookItem[] = data.books || [];

        const works: WorkRecord[] = [];
        const editions: EditionRecord[] = [];
        const now = new Date();

        for (const item of books) {
          const authors = (item.authors || []).map((a) => `${a.first_name} ${a.last_name}`.trim()).filter(Boolean);
          const durationSeconds = item.totaltime_secs || 0;
          const durationMinutes = Math.round(durationSeconds / 60);

          // Identifica leitor/narrador
          const narrator = item.sections?.[0]?.readers?.[0]?.display_name || 'Voluntários LibriVox';
          const streamUrl = item.sections?.[0]?.listen_url;

          const accessLinks: BookAccessLink[] = [];

          if (streamUrl) {
            accessLinks.push({
              type: AccessType.AUDIOBOOK_FREE,
              url: streamUrl,
              label: `Ouvir Audiolivro Completo (${durationMinutes} min)`,
              format: 'MP3',
              isExternal: false,
              sourceName: this.name,
              isDirectDownload: false,
              verifiedAt: now,
              notes: `Narrado por ${narrator}. Domínio Público.`,
            });
          }

          if (item.url_zip_file) {
            accessLinks.push({
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: item.url_zip_file,
              label: 'Baixar Audiolivro Completo (Arquivo ZIP MP3)',
              format: 'ZIP / MP3',
              isExternal: true,
              sourceName: this.name,
              isDirectDownload: true,
              verifiedAt: now,
            });
          }

          const audiobook: AudiobookRecord = {
            id: `lv_audio_${item.id}`,
            title: item.title,
            narrator,
            durationMinutes,
            durationSeconds,
            language: item.language || 'und',
            chaptersCount: item.sections?.length || 1,
            streamUrl,
            downloadUrl: item.url_zip_file,
            sourceName: this.name,
            accessType: AccessType.AUDIOBOOK_FREE,
            chapters: item.sections?.map((s, idx) => ({
              chapterNumber: idx + 1,
              title: s.title || `Capítulo ${idx + 1}`,
              durationSeconds: 0,
              streamUrl: s.listen_url,
            })),
          };

          const edition: EditionRecord = {
            id: `lv_ed_${item.id}`,
            workId: `lv_${item.id}`,
            title: item.title,
            language: item.language || 'und',
            publisher: 'LibriVox Free Audiobooks',
            format: 'Audiolivro MP3',
            accessLinks,
            sourceName: this.name,
            externalId: item.id,
          };

          const work: WorkRecord = {
            id: `lv_${item.id}`,
            canonicalTitle: item.title,
            normalizedTitle: normalizeString(item.title),
            authors: authors.length > 0 ? authors : ['Domínio Público'],
            primaryAuthorName: authors[0],
            description: item.description,
            genres: ['Audiolivros', 'Domínio Público'],
            aliases: [],
            identifiers: [
              { type: 'LIBRIVOX_ID', value: item.id }
            ],
            editions: [edition],
            accessLinks,
            audiobooks: [audiobook],
            sourcesCount: 1,
          };

          works.push(work);
          editions.push(edition);
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
    const cleanId = id.replace('librivox:', '').replace('lv_', '');
    const res = await this.search({ rawQuery: cleanId, limit: 1 });
    return res.works[0] || null;
  }

  async checkHealth(): Promise<{ online: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}?format=json&limit=1`, {
        headers: { 'User-Agent': this.userAgent },
      });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { online: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
