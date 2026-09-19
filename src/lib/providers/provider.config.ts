export interface ProviderConfig {
  id: string;
  displayName: string;
  baseUrl: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  supportsDownload: boolean;
  supportsAudiobook: boolean;
  supportsSearch: boolean;
  maxRequestsPerMinute: number;
  cacheTTLSeconds: number;
  timeoutMs: number;
  licenseDefault: string;
  description: string;
}

export const PROVIDERS_CONFIG: Record<string, ProviderConfig> = {
  gutenberg: {
    id: 'gutenberg',
    displayName: 'Project Gutenberg',
    baseUrl: 'https://gutendex.com/books',
    requiresApiKey: false,
    supportsDownload: true,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 60,
    cacheTTLSeconds: 86400,
    timeoutMs: 8000,
    licenseDefault: 'Domínio Público (Public Domain)',
    description: 'Mais de 70.000 livros em domínio público com downloads em EPUB, MOBI e HTML.',
  },
  openlibrary: {
    id: 'openlibrary',
    displayName: 'Open Library',
    baseUrl: 'https://openlibrary.org',
    requiresApiKey: false,
    supportsDownload: false,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 100,
    cacheTTLSeconds: 86400,
    timeoutMs: 9000,
    licenseDefault: 'Consulta Bibliográfica & Metadados',
    description: 'Maior catálogo aberto de metadados, capas em alta definição e registros de edições.',
  },
  librivox: {
    id: 'librivox',
    displayName: 'LibriVox Audiobooks',
    baseUrl: 'https://librivox.org/api/feed/audiobooks',
    requiresApiKey: false,
    supportsDownload: true,
    supportsAudiobook: true,
    supportsSearch: true,
    maxRequestsPerMinute: 45,
    cacheTTLSeconds: 86400 * 3,
    timeoutMs: 10000,
    licenseDefault: 'Domínio Público (Gravações voluntárias)',
    description: 'Milhares de audiolivros em domínio público narrados por voluntários no mundo todo.',
  },
  internet_archive: {
    id: 'internet_archive',
    displayName: 'Internet Archive (Open Texts)',
    baseUrl: 'https://archive.org',
    requiresApiKey: false,
    supportsDownload: true,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 60,
    cacheTTLSeconds: 86400,
    timeoutMs: 9000,
    licenseDefault: 'Acesso Aberto / Domínio Público',
    description: 'Biblioteca digital sem fins lucrativos com digitalizações históricas em PDF e EPUB.',
  },
  standard_ebooks: {
    id: 'standard_ebooks',
    displayName: 'Standard Ebooks',
    baseUrl: 'https://standardebooks.org/opds',
    requiresApiKey: false,
    supportsDownload: true,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 30,
    cacheTTLSeconds: 86400 * 7,
    timeoutMs: 8000,
    licenseDefault: 'Domínio Público / CC0 1.0',
    description: 'Ebooks em domínio público cuidadosamente editados e tipograficamente refinados.',
  },
  wikisource: {
    id: 'wikisource',
    displayName: 'Wikisource',
    baseUrl: 'https://pt.wikisource.org/w/api.php',
    requiresApiKey: false,
    supportsDownload: false,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 120,
    cacheTTLSeconds: 86400 * 2,
    timeoutMs: 7000,
    licenseDefault: 'Creative Commons CC-BY-SA / Domínio Público',
    description: 'Biblioteca digital de textos-fonte livres da Fundação Wikimedia.',
  },
  google_books: {
    id: 'google_books',
    displayName: 'Google Books API',
    baseUrl: 'https://www.googleapis.com/books/v1/volumes',
    requiresApiKey: false, // Cota gratuita disponível, chave opcional
    apiKeyEnvVar: 'GOOGLE_BOOKS_API_KEY',
    supportsDownload: false,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 60,
    cacheTTLSeconds: 86400,
    timeoutMs: 6000,
    licenseDefault: 'Informações de Livro & Pré-visualização',
    description: 'Vasta base de dados bibliográfica com sinopses, capas e identificadores ISBN.',
  },
  europeana: {
    id: 'europeana',
    displayName: 'Europeana Collections',
    baseUrl: 'https://api.europeana.eu/record/v2',
    requiresApiKey: true,
    apiKeyEnvVar: 'EUROPEANA_API_KEY',
    supportsDownload: false,
    supportsAudiobook: false,
    supportsSearch: true,
    maxRequestsPerMinute: 60,
    cacheTTLSeconds: 86400 * 3,
    timeoutMs: 8000,
    licenseDefault: 'Acesso Aberto Europeu / Domínio Público',
    description: 'Catálogo de patrimônio cultural de milhares de arquivos e bibliotecas europeias.',
  },
};
