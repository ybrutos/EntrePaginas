export interface AudioChapter {
  chapterNumber: number;
  title: string;
  durationSeconds: number;
  streamUrl: string;
}

export interface DownloadOption {
  format: string; // PDF, EPUB, MOBI, MP3, etc.
  url: string;
  sizeBytes?: number;
  isDirectDownload?: boolean;
  durationMinutes?: number;
  narrator?: string;
  audioStreamingUrl?: string;
  sourceName?: string; // The specific provider or mirror serving the file
  chapters?: AudioChapter[];
}

export interface BookSourceInfo {
  sourceName: string; // 'gutenberg', 'openlibrary', 'librivox', 'internet_archive', 'standard_ebooks', 'wikisource', 'google_books', 'europeana'
  externalId: string;
  canonicalUrl?: string;
  license?: string;
  isLegalDownload: boolean;
  isAudiobook?: boolean;
}

export interface UnifiedBook {
  id: string; // provider:externalId ou id único canônico
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publicationYear?: number;
  language: string;
  genres: string[];
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  estimatedWords?: number;
  isPublicDomain: boolean;
  hasAudiobook?: boolean;
  license?: string;
  officialSourceUrl?: string;
  sources: BookSourceInfo[];
  downloadOptions: DownloadOption[];
  audioOptions?: DownloadOption[];
  similarityScore?: number;
  sourcesCount?: number;
  audiobookDetails?: {
    durationSeconds?: number;
    durationMinutes?: number;
    narrator?: string;
    streamUrl?: string;
    sourceName?: string;
    chaptersCount?: number;
  };
}

export interface SearchFilters {
  title?: string;
  author?: string;
  genre?: string;
  language?: string;
  year?: number;
  source?: string;
  format?: string;
  publicDomainOnly?: boolean;
  hasLegalDownload?: boolean;
  hasAudiobook?: boolean;
  sortBy?: 'relevance' | 'title' | 'author' | 'year' | 'sources';
  page?: number;
  limit?: number;
}

export interface BookSearchResult {
  totalCount: number;
  items: UnifiedBook[];
  page: number;
  provider: string;
  sourcesCount?: number;
}

export interface BookProvider {
  readonly name: string;
  searchBooks(query: string, filters?: SearchFilters): Promise<BookSearchResult>;
  getBook(id: string): Promise<UnifiedBook | null>;
  getDownloadOptions(id: string): Promise<DownloadOption[]>;
  getCover(id: string): Promise<string | null>;
  checkHealth?(): Promise<{ online: boolean; latencyMs: number; error?: string }>;
}
