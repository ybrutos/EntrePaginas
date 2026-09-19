/**
 * Utilitários de normalização textual para deduplicação e busca
 */

export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // remove pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cria uma chave canônica para identificar se duas obras referem-se ao mesmo livro.
 */
export function generateBookFingerprint(title: string, author?: string): string {
  const normTitle = normalizeString(title);
  const normAuthor = normalizeString(author || '');
  return `${normTitle}__${normAuthor}`;
}

/**
 * Formata números com separadores de milhar brasileiros (ex: 2.843.521)
 */
export function formatNumberBR(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num || 0);
}
