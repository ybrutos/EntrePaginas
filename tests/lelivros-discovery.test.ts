import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeLivrosDiscoveryService } from '../src/lib/providers/lelivros/lelivros-discovery.service';
import { LeLivrosProvider } from '../src/lib/providers/lelivros/lelivros.provider';

// Mock do global fetch
const mockFetch = vi.fn();
global.fetch = vi.fn().mockImplementation((url, opts) => {
  console.log('FETCH CALLED:', url, opts?.method || 'GET');
  return mockFetch(url, opts);
}) as any;

describe('LeLivros Discovery Agent', () => {
  let discoveryService: LeLivrosDiscoveryService;
  let provider: LeLivrosProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LELIVROS_BASE_URL = 'https://lelivros.test';
    discoveryService = new LeLivrosDiscoveryService('https://lelivros.test');
    provider = new LeLivrosProvider();
  });

  describe('Query Expansion', () => {
    it('deve extrair variações da query corretamente (não público)', async () => {
      // Simulando WP index available
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          namespaces: ['wp/v2'],
          routes: { '/wp/v2/search': { methods: ['GET'] } }
        })
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await discoveryService.discover({ rawQuery: 'O Massacre da Família Hope', author: 'Riley Sager' });
    });
  });

  describe('WP REST API Fallbacks', () => {
    it('deve usar busca HTML se WP API retornar 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `
          <html><body>
            <a href="https://lelivros.test/book/dom-casmurro">Dom Casmurro</a>
          </body></html>
        `
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `
          <html>
            <head><title>Dom Casmurro</title></head>
            <body><a href="https://lelivros.test/download/dom-casmurro.pdf">Baixar PDF</a></body>
          </html>
        `
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://lelivros.test/download/dom-casmurro.pdf',
        headers: { get: (k: string) => k === 'content-type' ? 'application/pdf' : null }
      });

      const results = await discoveryService.discover({ rawQuery: 'Dom Casmurro' });
      
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Dom Casmurro');
      expect(results[0].sourceAccesses.length).toBe(1);
      expect(results[0].sourceAccesses[0].format).toBe('PDF');
      expect(results[0].sourceAccesses[0].accessType).toBe('UNVERIFIED_DOWNLOAD');
    });
  });

  describe('Classificação de Acesso', () => {
    it('deve classificar como UNVERIFIED_DOWNLOAD + BLOCKED quando HEAD retorna 403', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<a href="https://lelivros.test/book/123">Livro</a>`
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `<title>Livro Teste</title><a href="https://ext.com/file.epub">Baixar EPUB</a>`
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: { get: () => null }
      });

      const results = await discoveryService.discover({ rawQuery: 'Livro Teste' });
      const access = results[0].sourceAccesses[0];

      expect(access.accessType).toBe('UNVERIFIED_DOWNLOAD');
      expect(access.backendDownloadStatus).toBe('BLOCKED');
      expect(access.downloadUrl).toBe('https://ext.com/file.epub');
    });

    it('deve classificar como ACCESS_PAGE quando há página intermediária sem link final', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<a href="https://lelivros.test/book/123">Livro</a>`
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `<title>Livro Teste</title><a href="https://lelivros.test/download-page">Link</a>`
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `<title>Download Page</title>Aguarde...`
      });

      const results = await discoveryService.discover({ rawQuery: 'Livro Teste' });
      const access = results[0].sourceAccesses[0];

      expect(access.accessType).toBe('ACCESS_PAGE');
      expect(access.accessPageUrl).toBe('https://lelivros.test/download-page');
    });
  });

  describe('Provider Translation', () => {
    it('deve transformar DiscoveredBook em WorkRecord corretamente', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<a href="https://dlivros.com/book/abc">Livro</a>`
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => `
          <title>Livro Provider</title>
          <meta property="og:description" content="Desc">
          <a href="https://dlivros.com/file.pdf">PDF</a>
        `
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (k: string) => k === 'content-type' ? 'application/pdf' : null }
      });

      const result = await provider.search({ rawQuery: 'Livro Provider' });
      
      expect(result.works.length).toBe(1);
      const work = result.works[0];
      
      expect(work.canonicalTitle).toBe('Livro Provider');
      expect(work.description).toBe('Desc');
      expect(work.accessLinks.length).toBe(1);
      
      const link = work.accessLinks[0];
      expect(link.format).toBe('PDF');
      expect(link.isExternal).toBe(true);
      expect(link.isDirectDownload).toBe(true);
      expect((link as any).accessType).toBe('UNVERIFIED_DOWNLOAD');
    });
  });
});
