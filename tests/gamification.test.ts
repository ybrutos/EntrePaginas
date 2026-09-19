import { describe, it, expect } from 'vitest';
import { calculateXPProgress, estimateWordCount } from '../src/lib/gamification/xp-calculator';

describe('Gamification Core - XP Calculator (Idempotent)', () => {
  it('calculates correct initial XP for 25% progress on an 80,000-word book', () => {
    const totalWords = 80_000;
    const previousMaxPercent = 0;
    const currentPercent = 25;

    const result = calculateXPProgress(totalWords, previousMaxPercent, currentPercent);

    expect(result.xpDelta).toBe(20_000);
    expect(result.wordsReadTotal).toBe(20_000);
    expect(result.wordsReadDelta).toBe(20_000);
    expect(result.newMaxPercent).toBe(25);
  });

  it('is strictly idempotent: reopening or rereading the book (current <= previousMax) grants 0 XP', () => {
    const totalWords = 80_000;
    const previousMaxPercent = 50; // Leitora já leu até 50%
    const currentPercent = 25; // Reabriu em um capítulo anterior (25%)

    const result = calculateXPProgress(totalWords, previousMaxPercent, currentPercent);

    expect(result.xpDelta).toBe(0);
    expect(result.wordsReadDelta).toBe(0);
    expect(result.newMaxPercent).toBe(50); // Mantém o recorde de 50%
  });

  it('only awards XP for NEW unread portions when moving from 25% to 50%', () => {
    const totalWords = 80_000;
    const previousMaxPercent = 25; // Já havia ganho 20.000 XP anteriormente
    const currentPercent = 50;

    const result = calculateXPProgress(totalWords, previousMaxPercent, currentPercent);

    // Delta deve ser exatamente de 25% (20.000 XP adicionais), e NÃO 40.000 XP
    expect(result.xpDelta).toBe(20_000);
    expect(result.wordsReadTotal).toBe(40_000);
    expect(result.newMaxPercent).toBe(50);
  });

  it('accumulates to full 80,000 XP when reaching 100%', () => {
    const totalWords = 80_000;
    const previousMaxPercent = 50;
    const currentPercent = 100;

    const result = calculateXPProgress(totalWords, previousMaxPercent, currentPercent);

    expect(result.xpDelta).toBe(40_000);
    expect(result.wordsReadTotal).toBe(80_000);
    expect(result.newMaxPercent).toBe(100);
  });

  it('estimates word count from pages without inventing random figures', () => {
    expect(estimateWordCount(200)).toBe(50_000);
    expect(estimateWordCount(null, 75_000)).toBe(75_000);
    expect(estimateWordCount(null, null)).toBeNull();
  });
});
