import { normalizeString } from '../utils/text';

export interface ExpandedQuery {
  normalizedQuery: string;
  detectedIsbn?: string;
  detectedOclc?: string;
  detectedAuthor?: string;
  detectedTitle?: string;
  aliases: string[];
  translations: Array<{
    title: string;
    language: string;
    type: 'ORIGINAL' | 'TRANSLATION' | 'ALTERNATIVE';
  }>;
  searchVariants: string[];
}

// Dicionário canônico de equivalências conhecidas da literatura internacional e nacional
const CANONICAL_KNOWN_WORKS: Array<{
  originalTitle: string;
  author: string;
  ptTitle: string;
  otherTitles?: string[];
  isbns?: string[];
}> = [
  {
    originalTitle: 'The Only One Left',
    author: 'Riley Sager',
    ptTitle: 'O massacre da família Hope',
    otherTitles: ['The Only One Left: A Novel', 'O Massacre da Familia Hope'],
    isbns: ['9788551009444', '9780593183229', '0593183226', '8551009440'],
  },
  {
    originalTitle: 'Pride and Prejudice',
    author: 'Jane Austen',
    ptTitle: 'Orgulho e Preconceito',
    otherTitles: ['Orgulho e preconceito'],
    isbns: ['9788544001820', '9780141439518'],
  },
  {
    originalTitle: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    ptTitle: 'O Grande Gatsby',
    otherTitles: ['The Great Gatsby'],
    isbns: ['9788535919851', '9780743273565'],
  },
  {
    originalTitle: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    ptTitle: 'Dom Quixote',
    otherTitles: ['Don Quixote', 'El ingenioso hidalgo Don Quijote de la Mancha'],
    isbns: ['9788535921823'],
  },
  {
    originalTitle: 'Dom Casmurro',
    author: 'Machado de Assis',
    ptTitle: 'Dom Casmurro',
    otherTitles: ['Dom Casmurro: A Novel'],
    isbns: ['9788594318602'],
  },
  {
    originalTitle: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    ptTitle: 'Memórias Póstumas de Brás Cubas',
    otherTitles: ['The Posthumous Memoirs of Bras Cubas', 'Epitaph of a Small Winner'],
    isbns: ['9788594318619', '9781631498213'],
  },
  {
    originalTitle: '1984',
    author: 'George Orwell',
    ptTitle: '1984',
    otherTitles: ['Nineteen Eighty-Four'],
    isbns: ['9788535914849'],
  }
];

export class QueryExpansionService {
  /**
   * Extrai e valida números de ISBN-10 e ISBN-13 a partir de uma string
   */
  extractIsbn(query: string): string | undefined {
    // Procura sequências numéricas de 10 ou 13 dígitos
    const cleanDigits = query.replace(/[-\s]/g, '');
    const isbn13Match = cleanDigits.match(/(97[89]\d{10})/);
    if (isbn13Match) return isbn13Match[1];

    const isbn10Match = cleanDigits.match(/(\d{9}[\dX])/i);
    if (isbn10Match) return isbn10Match[1].toUpperCase();

    return undefined;
  }

  /**
   * Extrai identificador OCLC se presente
   */
  extractOclc(query: string): string | undefined {
    const oclcMatch = query.match(/oclc[:\s]*(\d+)/i);
    return oclcMatch ? oclcMatch[1] : undefined;
  }

  /**
   * Expande a consulta com variações multilíngues, títulos alternativos e identificadores
   */
  expand(rawQuery: string): ExpandedQuery {
    const trimmed = (rawQuery || '').trim();
    const normalized = normalizeString(trimmed);
    const detectedIsbn = this.extractIsbn(trimmed);
    const detectedOclc = this.extractOclc(trimmed);

    const aliases: string[] = [];
    const translations: ExpandedQuery['translations'] = [];
    const searchVariants: Set<string> = new Set([trimmed]);

    // 1. Procura correspondência na base canônica de obras
    for (const work of CANONICAL_KNOWN_WORKS) {
      const normOrig = normalizeString(work.originalTitle);
      const normPt = normalizeString(work.ptTitle);
      const normAuthor = normalizeString(work.author);

      const matchesPt = normalized.includes(normPt) || normPt.includes(normalized);
      const matchesOrig = normalized.includes(normOrig) || normOrig.includes(normalized);
      const matchesAuthor = normalized.includes(normAuthor);
      const matchesIsbn = detectedIsbn && work.isbns?.includes(detectedIsbn);

      if (matchesPt || matchesOrig || (matchesAuthor && (matchesPt || matchesOrig)) || matchesIsbn) {
        // Encontrou a obra canônica!
        if (work.originalTitle !== work.ptTitle) {
          translations.push({
            title: work.originalTitle,
            language: 'en',
            type: 'ORIGINAL',
          });
          translations.push({
            title: work.ptTitle,
            language: 'pt',
            type: 'TRANSLATION',
          });
        }

        aliases.push(work.originalTitle);
        aliases.push(work.ptTitle);
        if (work.otherTitles) aliases.push(...work.otherTitles);

        // Adiciona variantes de busca cruzada
        searchVariants.add(work.originalTitle);
        searchVariants.add(work.ptTitle);
        searchVariants.add(`${work.originalTitle} ${work.author}`);
        searchVariants.add(`${work.ptTitle} ${work.author}`);
        searchVariants.add(work.author);
        if (work.isbns) {
          for (const isbn of work.isbns) {
            searchVariants.add(isbn);
          }
        }
      }
    }

    // 2. Extração heurística de autor quando formato "Título por Autor" ou "Título - Autor"
    let detectedTitle: string | undefined;
    let detectedAuthor: string | undefined;

    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      detectedTitle = parts[0].trim();
      detectedAuthor = parts[1].trim();
    } else if (trimmed.toLowerCase().includes(' por ')) {
      const parts = trimmed.split(/ por /i);
      detectedTitle = parts[0].trim();
      detectedAuthor = parts[1].trim();
    } else if (trimmed.toLowerCase().includes(' by ')) {
      const parts = trimmed.split(/ by /i);
      detectedTitle = parts[0].trim();
      detectedAuthor = parts[1].trim();
    }

    if (detectedTitle) searchVariants.add(detectedTitle);
    if (detectedAuthor) searchVariants.add(detectedAuthor);
    if (detectedIsbn) searchVariants.add(detectedIsbn);
    if (detectedOclc) searchVariants.add(detectedOclc);

    return {
      normalizedQuery: normalized,
      detectedIsbn,
      detectedOclc,
      detectedAuthor,
      detectedTitle,
      aliases: Array.from(new Set(aliases)),
      translations,
      searchVariants: Array.from(searchVariants),
    };
  }
}

export const queryExpansionService = new QueryExpansionService();
