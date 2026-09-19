/**
 * Motor de Gamificação - Cálculo de XP Idempotente
 * 
 * Regra:
 * O XP é proporcional às palavras efetivamente exploradas no livro.
 * Se um livro tem 80.000 palavras:
 * - 25% lidos = 20.000 XP
 * - Avanço para 50% = +20.000 XP adicionais (e não 40.000 adicionais)
 * - Retornar ou reler o livro não gera XP adicional (idempotente).
 */

export interface XPDeltaResult {
  xpDelta: number;
  newMaxPercent: number;
  wordsReadTotal: number;
  wordsReadDelta: number;
}

/**
 * Calcula o ganho de XP e palavras lidas de forma estritamente idempotente.
 * 
 * @param totalWords Quantidade de palavras estimadas do livro (ou 0 se desconhecido)
 * @param previousMaxPercent Maior porcentagem já atingida historicamente pelo leitor (0-100)
 * @param currentPercent Nova porcentagem atingida (0-100)
 */
export function calculateXPProgress(
  totalWords: number,
  previousMaxPercent: number,
  currentPercent: number
): XPDeltaResult {
  const safeTotalWords = Math.max(0, Math.round(totalWords || 0));
  const safePrevious = Math.min(100, Math.max(0, previousMaxPercent || 0));
  const safeCurrent = Math.min(100, Math.max(0, currentPercent || 0));

  // Palavras lidas no total deste livro na porcentagem atual
  const wordsReadTotal = Math.round(safeTotalWords * (safeCurrent / 100));

  // Se o leitor não ultrapassou o maior progresso já registrado, o delta é ZERO (idempotência pura)
  if (safeCurrent <= safePrevious) {
    return {
      xpDelta: 0,
      newMaxPercent: safePrevious,
      wordsReadTotal,
      wordsReadDelta: 0,
    };
  }

  // Progresso novo inédito
  const percentDelta = safeCurrent - safePrevious;
  const wordsReadDelta = Math.round(safeTotalWords * (percentDelta / 100));
  const xpDelta = wordsReadDelta; // 1 palavra nova lida = 1 XP base

  return {
    xpDelta,
    newMaxPercent: safeCurrent,
    wordsReadTotal,
    wordsReadDelta,
  };
}

/**
 * Estima a contagem de palavras a partir do número de páginas caso a contagem exata não esteja disponível.
 * Se nem páginas nem palavras forem fornecidas, retorna null para não inventar números.
 */
export function estimateWordCount(
  pageCount?: number | null,
  explicitWordCount?: number | null
): number | null {
  if (explicitWordCount && explicitWordCount > 0) {
    return explicitWordCount;
  }
  if (pageCount && pageCount > 0) {
    // Padrão editorial médio brasileiro: ~250 palavras por página
    return pageCount * 250;
  }
  return null;
}
