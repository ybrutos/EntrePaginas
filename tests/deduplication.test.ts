import { describe, it, expect } from 'vitest';
import { deduplicateBooks } from '../src/lib/utils/deduplication';
import { UnifiedBook } from '../src/lib/providers/book-provider.interface';

describe('Book Deduplication and Consolidation', () => {
  it('merges multiple sources for the same work without duplicating downloads', () => {
    const gutenbergBook: UnifiedBook = {
      id: 'gutenberg:55752',
      slug: 'gutenberg-55752',
      title: 'Dom Casmurro',
      authors: ['Machado de Assis'],
      description: 'Edição do Project Gutenberg',
      coverUrl: 'https://gutenberg.org/cover.jpg',
      language: 'pt',
      genres: ['Literatura Brasileira', 'Ficção'],
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
        { format: 'HTML', url: 'https://gutenberg.org/55752.html', isDirectDownload: true },
      ],
    };

    const openLibraryBook: UnifiedBook = {
      id: 'openlibrary:OL102749W',
      slug: 'openlibrary-OL102749W',
      title: 'Dom Casmurro',
      authors: ['Machado de Assis'],
      description: 'Registro bibliográfico completo com capa em alta resolução e ISBN.',
      coverUrl: 'https://covers.openlibrary.org/b/id/10574044-L.jpg',
      language: 'pt',
      genres: ['Romance', 'Clássicos'],
      isPublicDomain: false,
      isbn: '9788535911664',
      pageCount: 256,
      estimatedWords: 82000,
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

    const result = deduplicateBooks([gutenbergBook, openLibraryBook]);

    expect(result.length).toBe(1);
    const merged = result[0];

    // Preserva título e autor
    expect(merged.title).toBe('Dom Casmurro');
    expect(merged.authors).toContain('Machado de Assis');

    // Mesclou as 2 fontes
    expect(merged.sources.length).toBe(2);
    expect(merged.sources.map((s) => s.sourceName)).toContain('gutenberg');
    expect(merged.sources.map((s) => s.sourceName)).toContain('openlibrary');

    // Manteve as opções de download legal do Gutenberg
    expect(merged.downloadOptions.length).toBe(2);
    expect(merged.downloadOptions.some((d) => d.format === 'EPUB')).toBe(true);

    // Garantiu que continua como domínio público
    expect(merged.isPublicDomain).toBe(true);

    // Preservou dados ricos da Open Library (ISBN, contagem de palavras)
    expect(merged.isbn).toBe('9788535911664');
    expect(merged.estimatedWords).toBe(82000);
  });
});
