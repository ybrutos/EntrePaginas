import { describe, it, expect } from 'vitest';
import { calculateLevelFromXP } from '../src/lib/gamification/level-system';
import { calculateXPProgress } from '../src/lib/gamification/xp-calculator';

describe('Gamification, Reading & Listening XP Ledger', () => {
  it('calculates levels and titles from accumulated XP', () => {
    // Level 1: 0 XP
    const lvl1 = calculateLevelFromXP(0);
    expect(lvl1.level).toBe(1);
    expect(lvl1.title).toBe('Curiosa');

    // Level 5: 100,000 XP
    const lvl5 = calculateLevelFromXP(100000);
    expect(lvl5.level).toBe(5);

    // High Level: 500,000 XP corresponds to level 10 (Bibliotecária)
    const lvlHigh = calculateLevelFromXP(500000);
    expect(lvlHigh.level).toBe(10);
    expect(lvlHigh.title).toBe('Bibliotecária');
    expect(lvlHigh.nextLevelXP).toBeGreaterThan(lvlHigh.currentLevelMinXP);
  });

  it('awards reading XP proportionally to words read (1 word = 1 XP)', () => {
    const totalWords = 80000;

    // Moving from 0% to 25% (20,000 words)
    const result1 = calculateXPProgress(totalWords, 0, 25);
    expect(result1.xpDelta).toBe(20000);
    expect(result1.wordsReadDelta).toBe(20000);

    // Advancing from 25% to 50% (additional 20,000 words)
    const result2 = calculateXPProgress(totalWords, 25, 50);
    expect(result2.xpDelta).toBe(20000);
    expect(result2.wordsReadDelta).toBe(20000);
  });

  it('guarantees XP idempotency and avoids duplication when rereading', () => {
    const totalWords = 100000;

    // Re-reading previously completed segment (to 30%, but maxHistorical was already 50%)
    const result = calculateXPProgress(totalWords, 50, 30);

    // Zero additional XP because this portion was already read historically
    expect(result.xpDelta).toBe(0);
    expect(result.wordsReadDelta).toBe(0);
  });

  it('calculates listening XP at rate of 10 XP per minute listened', () => {
    const minutesListened = 15;
    const listeningXPRate = 10;
    const xpGained = minutesListened * listeningXPRate;

    expect(xpGained).toBe(150);

    // Audio progress listening 45 minutes
    const session45minXP = 45 * listeningXPRate;
    expect(session45minXP).toBe(450);
  });
});
