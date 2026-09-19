import { UnifiedBook } from '../providers/book-provider.interface';
import { generateBookFingerprint, normalizeString } from './text';

export { normalizeString };

/**
 * Calcula o coeficiente de similaridade de Dice entre duas strings normalizadas (0 a 1).
 */
export function calculateStringSimilarity(strA: string, strB: string): number {
  const a = normalizeString(strA);
  const b = normalizeString(strB);

  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersection = 0;

  for (const [bigram, countA] of bigramsA.entries()) {
    if (bigramsB.has(bigram)) {
      intersection += Math.min(countA, bigramsB.get(bigram)!);
    }
  }

  return (2.0 * intersection) / (a.length - 1 + b.length - 1);
}

/**
 * Normaliza códigos ISBN removendo hífens e espaços
 */
export function cleanISBN(isbn?: string): string {
  if (!isbn) return '';
  return isbn.replace(/[^0-9X]/gi, '').toUpperCase();
}

/**
 * Calcula o score global de similaridade entre duas obras literárias (0 a 1).
 */
export function calculateBookSimilarity(bookA: UnifiedBook, bookB: UnifiedBook): number {
  // 1. Correspondência exata por ISBN (se ambos possuírem)
  const isbnA = cleanISBN(bookA.isbn);
  const isbnB = cleanISBN(bookB.isbn);
  if (isbnA && isbnB && isbnA === isbnB) {
    return 1.0;
  }

  // 2. Título e Autor
  const titleSim = calculateStringSimilarity(bookA.title, bookB.title);
  const authorA = bookA.authors[0] || '';
  const authorB = bookB.authors[0] || '';
  const authorSim = calculateStringSimilarity(authorA, authorB);

  // Se os títulos forem muito próximos (>= 0.85) e o autor bater (ou ambos forem clássicos conhecidos)
  if (titleSim >= 0.85 && (authorSim >= 0.6 || !authorA || !authorB)) {
    return (titleSim * 0.7) + (authorSim * 0.3);
  }

  // Substring direta (ex: "Dom Casmurro" dentro de "Dom Casmurro (Edição Especial)")
  const normTitleA = normalizeString(bookA.title);
  const normTitleB = normalizeString(bookB.title);
  if (normTitleA.includes(normTitleB) || normTitleB.includes(normTitleA)) {
    if (authorSim >= 0.6) return 0.88;
  }

  return Math.min(titleSim, authorSim);
}

/**
 * Deduplica e consolida uma lista de livros provindos de múltiplos provedores.
 * Cria o conceito de "Livro Canônico" com matriz de múltiplas fontes.
 */
export function deduplicateBooks(books: UnifiedBook[]): UnifiedBook[] {
  const canonicalList: UnifiedBook[] = [];

  for (const candidate of books) {
    let matchedIndex = -1;
    let highestScore = 0;

    for (let i = 0; i < canonicalList.length; i++) {
      const canonical = canonicalList[i];
      const score = calculateBookSimilarity(canonical, candidate);
      if (score >= 0.82 && score > highestScore) {
        highestScore = score;
        matchedIndex = i;
      }
    }

    if (matchedIndex === -1) {
      // Nova obra canônica
      canonicalList.push({
        ...candidate,
        sources: [...candidate.sources],
        downloadOptions: [...candidate.downloadOptions],
        audioOptions: candidate.audioOptions ? [...candidate.audioOptions] : [],
        similarityScore: 1.0,
      });
      continue;
    }

    // Mescla com a obra canônica existente
    const target = canonicalList[matchedIndex];

    // 1. Mescla fontes sem duplicar
    for (const src of candidate.sources) {
      const exists = target.sources.some(
        (s) => s.sourceName === src.sourceName && s.externalId === src.externalId
      );
      if (!exists) {
        target.sources.push(src);
      }
    }

    // 2. Mescla opções de download sem duplicar formatos para o MESMO SOURCE
    target.downloadOptions = target.downloadOptions || [];
    for (const opt of candidate.downloadOptions || []) {
      const exists = target.downloadOptions.some(
        (d) => d.format.toUpperCase() === opt.format.toUpperCase() && d.sourceName === opt.sourceName
      );
      if (!exists) {
        target.downloadOptions.push({ ...opt });
      }
    }

    // 3. Mescla audiolivros
    if (candidate.hasAudiobook || candidate.sources.some((s) => s.isAudiobook)) {
      target.hasAudiobook = true;
      target.audioOptions = target.audioOptions || [];
      for (const audio of candidate.audioOptions || []) {
        const exists = target.audioOptions.some((a) => a.url === audio.url);
        if (!exists) target.audioOptions.push(audio);
      }
    }

    // 4. Preserva a melhor capa
    if (!target.coverUrl && candidate.coverUrl) {
      target.coverUrl = candidate.coverUrl;
    }

    // 5. Preserva domínio público e licenças legais
    if (candidate.isPublicDomain) {
      target.isPublicDomain = true;
      target.license = candidate.license || target.license;
    }

    // 6. Mescla gêneros únicos
    const targetGenres = Array.isArray(target.genres) ? target.genres : [];
    const candidateGenres = Array.isArray(candidate.genres) ? candidate.genres : [];
    const mergedGenres = new Set([...targetGenres, ...candidateGenres]);
    target.genres = Array.from(mergedGenres).slice(0, 8);

    // 7. Preserva contagem de palavras e páginas
    if (!target.pageCount && candidate.pageCount) target.pageCount = candidate.pageCount;
    if (!target.estimatedWords && candidate.estimatedWords) target.estimatedWords = candidate.estimatedWords;
    if (!target.publicationYear && candidate.publicationYear) target.publicationYear = candidate.publicationYear;
    if (!target.isbn && candidate.isbn) target.isbn = candidate.isbn;

    // 8. Prefere a sinopse mais descritiva
    if (candidate.description && (!target.description || candidate.description.length > target.description.length)) {
      target.description = candidate.description;
    }

    // 9. Atualiza contagem de fontes consolidadas
    target.sourcesCount = target.sources.length;
  }

  for (const book of canonicalList) {
    book.sourcesCount = book.sources?.length || 1;
  }

  return canonicalList;
}
