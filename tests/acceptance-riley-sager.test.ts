import { describe, it, expect } from 'vitest';
import { queryExpansionService } from '../src/lib/search/query-expansion.service';
import { bookEntityResolver } from '../src/lib/search/book-entity-resolver';
import { contentAvailabilityAnalyzer } from '../src/lib/search/content-availability-analyzer';
import { WorkRecord, EditionRecord, AccessType } from '../src/lib/providers/types';

describe('Teste de Aceitação Principal • "O massacre da família Hope" (Riley Sager)', () => {
  it('deve expandir "O massacre da família Hope" para seu título original "The Only One Left" e autor "Riley Sager"', () => {
    const expansion = queryExpansionService.expand('O massacre da família Hope');

    expect(expansion.normalizedQuery).toBe('o massacre da familia hope');
    expect(expansion.aliases).toContain('The Only One Left');
    expect(expansion.aliases).toContain('O massacre da família Hope');

    const hasOriginal = expansion.translations.some(
      (t) => t.title === 'The Only One Left' && t.type === 'ORIGINAL'
    );
    expect(hasOriginal).toBe(true);

    const hasPt = expansion.translations.some(
      (t) => t.title === 'O massacre da família Hope' && t.type === 'TRANSLATION'
    );
    expect(hasPt).toBe(true);
  });

  it('deve expandir "The Only One Left" e convergir para a mesma obra e autor', () => {
    const expansion = queryExpansionService.expand('The Only One Left');

    expect(expansion.aliases).toContain('O massacre da família Hope');
    expect(expansion.aliases).toContain('The Only One Left');
    expect(expansion.searchVariants).toContain('Riley Sager');
  });

  it('deve consolidar registros de edições brasileira (Intrínseca) e americana (Dutton) na mesma Work', () => {
    const now = new Date();

    // Edição Brasileira (Intrínseca)
    const brazilianEdition: EditionRecord = {
      id: 'ed_pt_hope',
      workId: 'work_sager',
      title: 'O massacre da família Hope',
      language: 'pt',
      publisher: 'Intrínseca',
      publicationYear: 2024,
      isbn13: '9788551009444',
      isbn10: '8551009440',
      format: 'eBook Comercial',
      accessLinks: [
        {
          type: AccessType.COMMERCIAL_PURCHASE,
          url: 'https://www.intrinseca.com.br/livro/1234',
          label: 'Página Oficial Intrínseca (eBook comercial)',
          isExternal: true,
          sourceName: 'Editora Intrínseca',
          verifiedAt: now,
        },
        {
          type: AccessType.PREVIEW,
          url: 'https://books.google.com/books?id=sample_hope',
          label: 'Prévia de demonstração (Google Books)',
          format: 'Amostra de leitura',
          isExternal: true,
          sourceName: 'Google Books',
          verifiedAt: now,
          notes: 'Apenas amostra parcial de páginas.',
        }
      ],
      sourceName: 'Google Books',
      externalId: 'gb_hope_pt',
    };

    const workBrazilian: WorkRecord = {
      id: 'work_hope_pt',
      canonicalTitle: 'O massacre da família Hope',
      normalizedTitle: 'o massacre da familia hope',
      authors: ['Riley Sager'],
      primaryAuthorName: 'Riley Sager',
      firstPublicationYear: 2023,
      genres: ['Mistério', 'Suspense', 'Thriller'],
      aliases: [
        {
          title: 'The Only One Left',
          aliasType: 'ORIGINAL_TITLE',
          language: 'en',
        }
      ],
      identifiers: [
        { type: 'ISBN13', value: '9788551009444' }
      ],
      editions: [brazilianEdition],
      accessLinks: brazilianEdition.accessLinks,
      audiobooks: [],
      sourcesCount: 1,
    };

    // Edição Americana (Dutton)
    const englishEdition: EditionRecord = {
      id: 'ed_en_hope',
      workId: 'work_sager',
      title: 'The Only One Left',
      language: 'en',
      publisher: 'Dutton',
      publicationYear: 2023,
      isbn13: '9780593183229',
      isbn10: '0593183226',
      format: 'Hardcover / eBook',
      accessLinks: [
        {
          type: AccessType.LIBRARY_BORROW,
          url: 'https://libbyapp.com/search/the-only-one-left',
          label: 'Empréstimo digital em biblioteca participante (Libby)',
          isExternal: true,
          sourceName: 'OverDrive / Libby',
          verifiedAt: now,
          notes: 'Empréstimo digital com cartão de biblioteca.',
        }
      ],
      sourceName: 'Open Library',
      externalId: 'ol_the_only_one_left',
    };

    const workEnglish: WorkRecord = {
      id: 'work_hope_en',
      canonicalTitle: 'The Only One Left',
      normalizedTitle: 'the only one left',
      authors: ['Riley Sager'],
      primaryAuthorName: 'Riley Sager',
      firstPublicationYear: 2023,
      genres: ['Thriller', 'Mystery'],
      aliases: [
        {
          title: 'O massacre da família Hope',
          aliasType: 'TRANSLATED_TITLE',
          language: 'pt',
        }
      ],
      identifiers: [
        { type: 'ISBN13', value: '9780593183229' },
        { type: 'OPENLIBRARY_WORK', value: 'OL2837492W' }
      ],
      editions: [englishEdition],
      accessLinks: englishEdition.accessLinks,
      audiobooks: [],
      sourcesCount: 1,
    };

    // Resolução de Entidade
    const match = bookEntityResolver.resolveMatch(workBrazilian, workEnglish);
    expect(match.matched).toBe(true);
    expect(match.confidence).toBeGreaterThanOrEqual(0.85);
    expect(match.reasons.length).toBeGreaterThan(0);

    // Consolidação canônica
    const consolidated = bookEntityResolver.deduplicateAndResolve([workBrazilian, workEnglish]);
    expect(consolidated.length).toBe(1);

    const merged = consolidated[0];
    expect(merged.editions.length).toBe(2);
    expect(merged.sourcesCount).toBe(2);

    // Análise de Disponibilidade
    const availability = contentAvailabilityAnalyzer.analyze(merged);

    // Regra Crítica: NÃO mentir sobre disponibilidade!
    expect(availability.hasLegalDownload).toBe(false); // Não possui download gratuito integral
    expect(availability.hasPreviewOnly).toBe(true);     // Possui prévia parcial
    expect(availability.hasCommercialPurchase).toBe(true); // Possui eBook comercial
    expect(availability.hasLibraryBorrow).toBe(true);  // Possui empréstimo digital
  });

  it('deve consolidar clássicos da literatura (Dom Casmurro) com múltiplas fontes e audiolivro', () => {
    const workCasmurro = {
      id: 'work_casmurro',
      canonicalTitle: 'Dom Casmurro',
      normalizedTitle: 'dom casmurro',
      authors: ['Machado de Assis'],
      primaryAuthorName: 'Machado de Assis',
      firstPublicationYear: 1899,
      genres: ['Clássicos', 'Romance'],
      aliases: [],
      identifiers: [{ type: 'GUTENBERG_ID', value: '55752' }],
      editions: [
        {
          id: 'ed_gut',
          title: 'Dom Casmurro',
          language: 'pt',
          publisher: 'Garnier',
          accessLinks: [
            {
              type: AccessType.LEGAL_FREE_DOWNLOAD,
              url: 'https://www.gutenberg.org/ebooks/55752.epub.images',
              label: 'Baixar EPUB',
              format: 'EPUB',
              isExternal: false,
              sourceName: 'Project Gutenberg',
              isDirectDownload: true,
              verifiedAt: new Date(),
            }
          ],
          sourceName: 'Project Gutenberg',
          externalId: '55752',
        }
      ],
      accessLinks: [
        {
          type: AccessType.LEGAL_FREE_DOWNLOAD,
          url: 'https://www.gutenberg.org/ebooks/55752.epub.images',
          label: 'Baixar EPUB',
          format: 'EPUB',
          isExternal: false,
          sourceName: 'Project Gutenberg',
          isDirectDownload: true,
          verifiedAt: new Date(),
        }
      ],
      audiobooks: [
        {
          id: 'lv_audio_casmurro',
          title: 'Dom Casmurro',
          narrator: 'Voluntários LibriVox',
          durationMinutes: 480,
          language: 'pt',
          sourceName: 'LibriVox Audiobooks',
          accessType: AccessType.AUDIOBOOK_FREE,
        }
      ],
      sourcesCount: 2,
    };

    const availability = contentAvailabilityAnalyzer.analyze(workCasmurro);
    expect(availability.hasLegalDownload).toBe(true);
    expect(availability.hasAudiobook).toBe(true);
    expect(availability.primaryBadge.label).toBe('Download Legal Disponível');
  });
});
