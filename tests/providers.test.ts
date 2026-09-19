import { describe, it, expect } from 'vitest';
import { providerManager } from '../src/lib/providers/provider-manager';
import { PROVIDERS_CONFIG } from '../src/lib/providers/provider.config';
import { deduplicateBooks, normalizeString } from '../src/lib/utils/deduplication';
import { UnifiedBook } from '../src/lib/providers/book-provider.interface';

describe('Providers Architecture & Resilient Aggregator', () => {
  it('registers all 8 legitimate public and open-access providers', () => {
    const registeredNames = providerManager.getProviderNames();
    expect(registeredNames).toContain('gutenberg');
    expect(registeredNames).toContain('openlibrary');
    expect(registeredNames).toContain('librivox');
    expect(registeredNames).toContain('internet_archive');
    expect(registeredNames).toContain('standard_ebooks');
    expect(registeredNames).toContain('wikisource');
    expect(registeredNames).toContain('google_books');
    expect(registeredNames).toContain('europeana');
    expect(registeredNames.length).toBe(8);
  });

  it('verifies provider configuration contracts (rate limits, timeouts, licenses)', () => {
    for (const [key, config] of Object.entries(PROVIDERS_CONFIG)) {
      expect(config.id).toBe(key);
      expect(config.displayName).toBeDefined();
      expect(config.maxRequestsPerMinute).toBeGreaterThan(0);
      expect(config.timeoutMs).toBeGreaterThan(0);
      expect(config.licenseDefault).toBeDefined();
      expect(typeof config.requiresApiKey).toBe('boolean');
      expect(typeof config.supportsDownload).toBe('boolean');
      expect(typeof config.supportsAudiobook).toBe('boolean');
    }
  });

  it('deduplicates Dom Casmurro combining Gutenberg (EPUB) + OpenLibrary (Metadata/Cover) + LibriVox (Audiobook)', () => {
    const gutenbergBook: UnifiedBook = {
      id: 'gutenberg:55752',
      slug: 'gutenberg-55752',
      title: 'Dom Casmurro',
      authors: ['Machado de Assis'],
      language: 'pt',
      isPublicDomain: true,
      sources: [
        {
          sourceName: 'gutenberg',
          externalId: '55752',
          canonicalUrl: 'https://www.gutenberg.org/ebooks/55752',
          isLegalDownload: true,
        },
      ],
      downloadOptions: [
        { format: 'EPUB', url: 'https://gutenberg.org/55752.epub', isDirectDownload: true },
      ],
    };

    const openLibraryBook: UnifiedBook = {
      id: 'openlibrary:OL102749W',
      slug: 'openlibrary-OL102749W',
      title: 'Dom Casmurro',
      authors: ['Machado de Assis'],
      coverUrl: 'https://covers.openlibrary.org/b/id/10574044-L.jpg',
      isbn: '9788535911664',
      language: 'pt',
      isPublicDomain: true,
      sources: [
        {
          sourceName: 'openlibrary',
          externalId: 'OL102749W',
          canonicalUrl: 'https://openlibrary.org/works/OL102749W',
          isLegalDownload: false,
        },
      ],
      downloadOptions: [],
    };

    const librivoxBook: UnifiedBook = {
      id: 'librivox:3225',
      slug: 'librivox-3225',
      title: 'Dom Casmurro (Audiolivro)',
      authors: ['Machado de Assis'],
      language: 'pt',
      isPublicDomain: true,
      hasAudiobook: true,
      sources: [
        {
          sourceName: 'librivox',
          externalId: '3225',
          canonicalUrl: 'https://librivox.org/dom-casmurro-by-machado-de-assis/',
          isLegalDownload: true,
          isAudiobook: true,
        },
      ],
      downloadOptions: [
        {
          format: 'AUDIOBOOK',
          url: 'https://ia800301.us.archive.org/14/items/dom_casmurro_0809_librivox/dom_casmurro_0809_librivox_64kb_mp3.zip',
          isDirectDownload: true,
        },
      ],
    };

    const consolidated = deduplicateBooks([gutenbergBook, openLibraryBook, librivoxBook]);

    // All 3 should be merged into 1 canonical work
    expect(consolidated.length).toBe(1);
    const work = consolidated[0];

    // Must preserve title and author
    expect(work.title).toContain('Dom Casmurro');
    expect(work.authors).toContain('Machado de Assis');

    // Must preserve cover from OpenLibrary
    expect(work.coverUrl).toBe('https://covers.openlibrary.org/b/id/10574044-L.jpg');

    // Must have EPUB download from Gutenberg
    const epub = work.downloadOptions?.find((d) => d.format === 'EPUB');
    expect(epub).toBeDefined();

    // Must have Audiobook flag and download from LibriVox
    expect(work.hasAudiobook).toBe(true);
    const audio = work.downloadOptions?.find((d) => d.format === 'AUDIOBOOK');
    expect(audio).toBeDefined();

    // Must show 3 sources aggregated
    expect(work.sources?.length).toBe(3);
    expect(work.sourcesCount).toBe(3);
  });

  it('correctly normalizes strings ignoring diacritics, punctuation, and extra whitespace', () => {
    expect(normalizeString('Dom Casmurro: Edição Especial!')).toBe('dom casmurro edicao especial');
    expect(normalizeString('  Machado de Assis - Clássico   ')).toBe('machado de assis classico');
  });
});
