import { describe, it, expect } from 'vitest';
import { bookEntityResolver } from '../src/lib/search/book-entity-resolver';
import { WorkRecord } from '../src/lib/providers/types';

describe('BookEntityResolver • Resolução de Entidades & Deduplicação', () => {
  const baseWork: WorkRecord = {
    id: 'w1',
    canonicalTitle: 'O Pequeno Príncipe',
    normalizedTitle: 'o pequeno principe',
    authors: ['Antoine de Saint-Exupéry'],
    primaryAuthorName: 'Antoine de Saint-Exupéry',
    firstPublicationYear: 1943,
    genres: ['Infantojuvenil', 'Filosofia'],
    aliases: [{ title: 'The Little Prince', aliasType: 'ORIGINAL_TITLE' }],
    identifiers: [{ type: 'ISBN13', value: '9788522031474' }],
    editions: [],
    accessLinks: [],
    audiobooks: [],
    sourcesCount: 1,
  };

  it('deve dar match de 1.0 (máxima confiança) quando o ISBN for idêntico', () => {
    const workWithSameIsbn: WorkRecord = {
      id: 'w2',
      canonicalTitle: 'O Pequeno Principe (Edição Ilustrada)',
      normalizedTitle: 'o pequeno principe edicao ilustrada',
      authors: ['Antoine de Saint Exupery'],
      genres: [],
      aliases: [],
      identifiers: [{ type: 'ISBN13', value: '9788522031474' }],
      editions: [],
      accessLinks: [],
      audiobooks: [],
      sourcesCount: 1,
    };

    const match = bookEntityResolver.resolveMatch(baseWork, workWithSameIsbn);
    expect(match.matched).toBe(true);
    expect(match.confidence).toBe(1.0);
    expect(match.reasons[0]).toContain('Mesmo ISBN');
  });

  it('deve dar match forte quando houver o mesmo identificador OCLC', () => {
    const workWithOclc1: WorkRecord = {
      ...baseWork,
      identifiers: [{ type: 'OCLC', value: '12345678' }],
    };
    const workWithOclc2: WorkRecord = {
      ...baseWork,
      canonicalTitle: 'The Little Prince (English translation)',
      identifiers: [{ type: 'OCLC', value: '12345678' }],
    };

    const match = bookEntityResolver.resolveMatch(workWithOclc1, workWithOclc2);
    expect(match.matched).toBe(true);
    expect(match.confidence).toBe(0.95);
    expect(match.reasons[0]).toContain('OCLC');
  });

  it('deve reconhecer título traduzido e alias canônico registrado', () => {
    const englishWork: WorkRecord = {
      id: 'w3',
      canonicalTitle: 'The Little Prince',
      normalizedTitle: 'the little prince',
      authors: ['Antoine de Saint-Exupéry'],
      genres: [],
      aliases: [],
      identifiers: [],
      editions: [],
      accessLinks: [],
      audiobooks: [],
      sourcesCount: 1,
    };

    const match = bookEntityResolver.resolveMatch(baseWork, englishWork);
    expect(match.matched).toBe(true);
    expect(match.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('NÃO deve mesclar livros diferentes que possuam apenas palavras semelhantes (Prevenção de Falsos Positivos)', () => {
    const differentBook1: WorkRecord = {
      id: 'diff1',
      canonicalTitle: 'O Príncipe',
      normalizedTitle: 'o principe',
      authors: ['Nicolau Maquiavel'],
      primaryAuthorName: 'Nicolau Maquiavel',
      firstPublicationYear: 1532,
      genres: ['Filosofia Política'],
      aliases: [],
      identifiers: [{ type: 'ISBN13', value: '9788535911664' }],
      editions: [],
      accessLinks: [],
      audiobooks: [],
      sourcesCount: 1,
    };

    const match = bookEntityResolver.resolveMatch(baseWork, differentBook1);
    expect(match.matched).toBe(false);
    expect(match.confidence).toBeLessThan(0.70);
  });
});
