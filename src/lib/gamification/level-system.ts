/**
 * Motor de Níveis e Progressão de Leitura para Karolayne
 */

export interface LevelInfo {
  level: number;
  title: string;
  currentXP: number;
  currentLevelMinXP: number;
  nextLevelXP: number;
  xpToNextLevel: number;
  progressPercent: number; // 0 a 100 entre o nível atual e o próximo
}

export interface LevelMilestone {
  level: number;
  xp: number;
  title: string;
}

export const LEVEL_MILESTONES: LevelMilestone[] = [
  { level: 1, xp: 0, title: 'Curiosa' },
  { level: 2, xp: 10_000, title: 'Leitora' },
  { level: 3, xp: 25_000, title: 'Exploradora' },
  { level: 4, xp: 50_000, title: 'Conhecedora' },
  { level: 5, xp: 100_000, title: 'Devoradora de Livros' },
  { level: 7, xp: 260_000, title: 'Ávida Pesquisadora' },
  { level: 10, xp: 500_000, title: 'Bibliotecária' },
  { level: 15, xp: 1_000_000, title: 'Sabedoria Encadernada' },
  { level: 20, xp: 1_500_000, title: 'Mestre das Páginas' },
  { level: 25, xp: 2_250_000, title: 'Alquimista das Palavras' },
  { level: 30, xp: 3_000_000, title: 'Guardiã da Biblioteca' },
  { level: 40, xp: 6_500_000, title: 'Soberana dos Tomos' },
  { level: 50, xp: 10_000_000, title: 'Lenda Literária' },
  { level: 60, xp: 15_000_000, title: 'Imortal das Letras' },
  { level: 75, xp: 22_500_000, title: 'Oráculo dos Livros' },
  { level: 100, xp: 40_000_000, title: 'Deusa da Literatura' },
];

/**
 * Retorna a quantidade exata de XP necessária para alcançar qualquer nível L >= 1.
 * O algoritmo é estritamente contínuo, crescente e escala infinitamente.
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 10_000;
  if (level === 3) return 25_000;
  if (level === 4) return 50_000;
  if (level === 5) return 100_000;

  // Entre 5 e 10: passo de 80.000 por nível (100k -> 500k)
  if (level <= 10) {
    return 100_000 + (level - 5) * 80_000;
  }

  // Entre 10 e 20: passo de 100.000 por nível (500k -> 1.5M)
  if (level <= 20) {
    return 500_000 + (level - 10) * 100_000;
  }

  // Entre 20 e 30: passo de 150.000 por nível (1.5M -> 3.0M)
  if (level <= 30) {
    return 1_500_000 + (level - 20) * 150_000;
  }

  // Entre 30 e 50: passo de 350.000 por nível (3.0M -> 10.0M)
  if (level <= 50) {
    return 3_000_000 + (level - 30) * 350_000;
  }

  // Acima de 50: fórmula polinomial suave para crescimento contínuo
  const diff = level - 50;
  return Math.round(10_000_000 + diff * 500_000 + (diff * (diff + 1) * 25_000));
}

/**
 * Obtém o título honorífico apropriado para determinado nível.
 */
export function getTitleForLevel(level: number): string {
  let title = 'Curiosa';
  for (const milestone of LEVEL_MILESTONES) {
    if (level >= milestone.level) {
      title = milestone.title;
    } else {
      break;
    }
  }
  return title;
}

/**
 * Calcula detalhadamente as métricas do nível a partir do XP acumulado do usuário.
 */
export function calculateLevelFromXP(currentXP: number): LevelInfo {
  const safeXP = Math.max(0, Math.round(currentXP || 0));

  let level = 1;
  while (getXPForLevel(level + 1) <= safeXP) {
    level++;
  }

  const currentLevelMinXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpSpan = nextLevelXP - currentLevelMinXP;
  const xpGainedInLevel = safeXP - currentLevelMinXP;

  const progressPercent = xpSpan > 0 
    ? Math.min(100, Math.max(0, Math.round((xpGainedInLevel / xpSpan) * 100))) 
    : 100;

  const title = getTitleForLevel(level);

  return {
    level,
    title,
    currentXP: safeXP,
    currentLevelMinXP,
    nextLevelXP,
    xpToNextLevel: Math.max(0, nextLevelXP - safeXP),
    progressPercent,
  };
}
