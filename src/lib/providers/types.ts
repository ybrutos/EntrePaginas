/**
 * Tipos e Contratos Fundamentais do Motor de Descoberta Global • Entre Páginas V2
 */

export enum AccessType {
  LEGAL_FREE_DOWNLOAD = 'LEGAL_FREE_DOWNLOAD',
  OPEN_ACCESS = 'OPEN_ACCESS',
  PUBLIC_DOMAIN = 'PUBLIC_DOMAIN',
  LIBRARY_BORROW = 'LIBRARY_BORROW',
  CONTROLLED_DIGITAL_LENDING = 'CONTROLLED_DIGITAL_LENDING',
  FULL_TEXT_ONLINE = 'FULL_TEXT_ONLINE',
  PREVIEW = 'PREVIEW',
  SEARCH_ONLY = 'SEARCH_ONLY',
  METADATA_ONLY = 'METADATA_ONLY',
  COMMERCIAL_PURCHASE = 'COMMERCIAL_PURCHASE',
  COMMERCIAL_SUBSCRIPTION = 'COMMERCIAL_SUBSCRIPTION',
  AUDIOBOOK_FREE = 'AUDIOBOOK_FREE',
  AUDIOBOOK_LIBRARY_BORROW = 'AUDIOBOOK_LIBRARY_BORROW',
  AUDIOBOOK_COMMERCIAL = 'AUDIOBOOK_COMMERCIAL',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  UNKNOWN = 'UNKNOWN',
}

export type ProviderCapabilities = {
  search: boolean;
  metadata: boolean;
  covers: boolean;
  fullText: boolean;
  preview: boolean;
  legalDownload: boolean;
  libraryBorrow: boolean;
  audiobook: boolean;
  physicalCopy: boolean;
  isbnLookup: boolean;
  multilingual: boolean;
  availability: boolean;
};

export interface BookSearchQuery {
  rawQuery: string;
  title?: string;
  author?: string;
  isbn?: string;
  oclc?: string;
  language?: string;
  genre?: string;
  year?: number;
  format?: string;
  hasAudiobook?: boolean;
  publicDomainOnly?: boolean;
  limit?: number;
  page?: number;
}

export interface BookAccessLink {
  type: AccessType;
  url: string;
  label: string;
  format?: string; // 'EPUB', 'PDF', 'AZW3', 'MP3', 'HTML', etc.
  isExternal: boolean;
  sourceName: string;
  price?: string;
  drmInfo?: string;
  isDirectDownload?: boolean;
  verifiedAt: Date;
  notes?: string;
}

export interface AudioChapterRecord {
  chapterNumber: number;
  title: string;
  durationSeconds: number;
  streamUrl: string;
}

export interface AudiobookRecord {
  id: string;
  title: string;
  narrator?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  language: string;
  chaptersCount?: number;
  streamUrl?: string;
  downloadUrl?: string;
  sourceName: string;
  accessType: AccessType;
  chapters?: AudioChapterRecord[];
}

export interface EditionRecord {
  id: string;
  workId?: string;
  title: string;
  subtitle?: string;
  language?: string;
  publisher?: string;
  publicationYear?: number;
  editionName?: string;
  isbn10?: string;
  isbn13?: string;
  oclc?: string;
  format?: string;
  pageCount?: number;
  estimatedWords?: number;
  coverUrl?: string;
  accessLinks: BookAccessLink[];
  sourceName: string;
  externalId: string;
}

export interface WorkRecord {
  id: string;
  canonicalTitle: string;
  originalTitle?: string;
  normalizedTitle: string;
  authors: string[];
  description?: string;
  firstPublicationYear?: number;
  primaryAuthorName?: string;
  coverUrl?: string;
  genres: string[];
  aliases: Array<{
    title: string;
    language?: string;
    aliasType: 'TRANSLATED_TITLE' | 'ORIGINAL_TITLE' | 'ALTERNATIVE_TITLE';
    source?: string;
  }>;
  identifiers: Array<{
    type: string;
    value: string;
  }>;
  editions: EditionRecord[];
  accessLinks: BookAccessLink[];
  audiobooks: AudiobookRecord[];
  sourcesCount: number;
  matchConfidence?: number;
  matchReasons?: string[];
}

export interface BookProviderResult {
  providerId: string;
  totalCount: number;
  page: number;
  works: WorkRecord[];
  editions: EditionRecord[];
  error?: string;
  latencyMs?: number;
}

export interface BookAvailabilityInfo {
  accessType: AccessType;
  summary: string;
  copiesCount?: number;
  holdsCount?: number;
  isAvailableNow: boolean;
  samplePageRange?: string;
  libraryBorrowLink?: string;
  purchaseLink?: string;
  downloadLink?: string;
  verifiedAt: Date;
}

export interface BookProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  search(query: BookSearchQuery): Promise<BookProviderResult>;

  getBook(id: string): Promise<WorkRecord | EditionRecord | null>;

  getWork?(id: string): Promise<WorkRecord | null>;

  getEdition?(id: string): Promise<EditionRecord | null>;

  getFormats?(id: string): Promise<string[]>;

  getAvailability?(id: string): Promise<BookAvailabilityInfo>;

  getDownloadLinks?(id: string): Promise<BookAccessLink[]>;

  getCover?(id: string): Promise<string | null>;

  checkHealth(): Promise<{
    online: boolean;
    latencyMs: number;
    error?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Source Discovery Access Model (LeLivros Discovery Agent V1)
// ─────────────────────────────────────────────────────────────

/**
 * Tipo de acesso encontrado pelo agente de descoberta.
 * UNVERIFIED_DOWNLOAD: URL encontrada mas sem verificação de licença/autorização.
 * Deve SEMPRE ser apresentado ao usuário com aviso explícito.
 */
export type SourceAccessType =
  | 'DIRECT_DOWNLOAD'       // Backend baixou com sucesso
  | 'EXTERNAL_DOWNLOAD'     // URL pública encontrada, acesso deve ser externo
  | 'ACCESS_PAGE'           // Página de acesso encontrada, sem URL final de arquivo
  | 'PREVIEW'               // Somente preview/amostra
  | 'METADATA_ONLY'         // Somente metadados, sem acesso ao conteúdo
  | 'LIBRARY_LOAN'          // Empréstimo digital de biblioteca
  | 'COMMERCIAL'            // Livro comercial pago
  | 'UNVERIFIED_DOWNLOAD';  // URL encontrada SEM verificação de licença — NUNCA transformar em AUTHORIZED_FREE

/** Status da tentativa de acesso pelo backend do Entre Páginas */
export type BackendDownloadStatus =
  | 'SUCCESS'         // Backend acessou o arquivo com sucesso
  | 'FAILED'          // Falha de rede/servidor
  | 'BLOCKED'         // 403/401/429 — proteção ativa no servidor externo
  | 'NOT_ATTEMPTED';  // Backend não tentou (URL é externa por design)

/** URL temporária com data de expiração */
export interface TemporaryUrlInfo {
  isTemporary: boolean;
  expiresAt?: Date;
  refreshPageUrl?: string;
}

/**
 * Resultado de descoberta de acesso a um formato de livro.
 * Modela toda a cadeia: página da obra → página intermediária → URL final.
 */
export interface SourceAccess {
  sourcePageUrl: string;
  accessPageUrl?: string;
  downloadUrl?: string;
  resolvedDownloadUrl?: string;
  format?: string;
  detectedContentType?: string;
  detectedSizeBytes?: number;
  accessType: SourceAccessType;
  backendDownloadStatus: BackendDownloadStatus;
  backendStatusCode?: number;
  confidence: number;
  providerName: string;
  providerLabel: string;
  temporaryUrl?: TemporaryUrlInfo;
  discoveryChain?: string[];
}
