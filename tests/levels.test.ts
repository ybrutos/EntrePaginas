import { describe, it, expect } from 'vitest';
import { 
  getXPForLevel, 
  getTitleForLevel, 
  calculateLevelFromXP,
  LEVEL_MILESTONES 
} from '../src/lib/gamification/level-system';

describe('Gamification Core - Level System & Progression', () => {
  it('strictly adheres to all required milestone level XP values', () => {
    expect(getXPForLevel(1)).toBe(0);
    expect(getXPForLevel(2)).toBe(10_000);
    expect(getXPForLevel(3)).toBe(25_000);
    expect(getXPForLevel(4)).toBe(50_000);
    expect(getXPForLevel(5)).toBe(100_000);
    expect(getXPForLevel(10)).toBe(500_000);
    expect(getXPForLevel(20)).toBe(1_500_000);
    expect(getXPForLevel(30)).toBe(3_000_000);
    expect(getXPForLevel(50)).toBe(10_000_000);
  });

  it('accurately resolves honorary titles for levels', () => {
    expect(getTitleForLevel(1)).toBe('Curiosa');
    expect(getTitleForLevel(2)).toBe('Leitora');
    expect(getTitleForLevel(3)).toBe('Exploradora');
    expect(getTitleForLevel(4)).toBe('Conhecedora');
    expect(getTitleForLevel(5)).toBe('Devoradora de Livros');
    expect(getTitleForLevel(10)).toBe('Bibliotecária');
    expect(getTitleForLevel(20)).toBe('Mestre das Páginas');
    expect(getTitleForLevel(30)).toBe('Guardiã da Biblioteca');
    expect(getTitleForLevel(50)).toBe('Lenda Literária');
  });

  it('correctly calculates level and progress bar percentage for Karolaynes XP', () => {
    // 2.843.521 XP (por volta do nível 28/29)
    const info = calculateLevelFromXP(2_843_521);
    expect(info.level).toBeGreaterThanOrEqual(20);
    expect(info.level).toBeLessThanOrEqual(30);
    expect(info.xpToNextLevel).toBeGreaterThan(0);
    expect(info.progressPercent).toBeGreaterThanOrEqual(0);
    expect(info.progressPercent).toBeLessThanOrEqual(100);
  });

  it('scales infinitely beyond level 50 without errors', () => {
    const xpLevel55 = getXPForLevel(55);
    const xpLevel60 = getXPForLevel(60);
    expect(xpLevel60).toBeGreaterThan(xpLevel55);

    const infoLevel60 = calculateLevelFromXP(xpLevel60);
    expect(infoLevel60.level).toBe(60);
    expect(infoLevel60.title).toBe('Imortal das Letras');
  });
});
