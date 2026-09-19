export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  badgeLevel: 'bronze' | 'silver' | 'gold' | 'diamond';
  xpReward: number;
  category: 'progress' | 'books' | 'words' | 'streak' | 'genre';
}

export const INITIAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'primeira_pagina',
    title: 'Primeira Página',
    description: 'Começou sua jornada literária na plataforma.',
    icon: 'Sparkles',
    badgeLevel: 'bronze',
    xpReward: 2_500,
    category: 'progress',
  },
  {
    id: 'primeiro_livro',
    title: 'Primeiro Livro',
    description: 'Concluiu com sucesso a leitura do seu primeiro livro.',
    icon: 'BookOpen',
    badgeLevel: 'bronze',
    xpReward: 10_000,
    category: 'books',
  },
  {
    id: 'colecionadora',
    title: 'Colecionadora',
    description: 'Completou a leitura de 10 livros.',
    icon: 'Library',
    badgeLevel: 'silver',
    xpReward: 25_000,
    category: 'books',
  },
  {
    id: 'grande_leitora',
    title: 'Grande Leitora',
    description: 'Completou a leitura de 25 livros.',
    icon: 'Trophy',
    badgeLevel: 'gold',
    xpReward: 50_000,
    category: 'books',
  },
  {
    id: 'centena',
    title: 'Centena Literária',
    description: 'Alcançou a marca monumental de 100 livros concluídos.',
    icon: 'Crown',
    badgeLevel: 'diamond',
    xpReward: 200_000,
    category: 'books',
  },
  {
    id: 'leitura_constante',
    title: 'Leitura Constante',
    description: 'Manteve sua chama acesa lendo por 7 dias consecutivos.',
    icon: 'Flame',
    badgeLevel: 'silver',
    xpReward: 20_000,
    category: 'streak',
  },
  {
    id: 'imparavel',
    title: 'Imparável',
    description: 'Alcançou uma sequência impressionante de 30 dias consecutivos de leitura.',
    icon: 'Zap',
    badgeLevel: 'gold',
    xpReward: 60_000,
    category: 'streak',
  },
  {
    id: 'milhoes_palavras',
    title: 'Milhões de Palavras',
    description: 'Superou a fascinante marca de 1.000.000 de palavras exploradas.',
    icon: 'Brain',
    badgeLevel: 'diamond',
    xpReward: 100_000,
    category: 'words',
  },
  {
    id: 'viajante_literaria',
    title: 'Viajante Literária',
    description: 'Leu obras de pelo menos 10 autores diferentes.',
    icon: 'Compass',
    badgeLevel: 'silver',
    xpReward: 25_000,
    category: 'progress',
  },
  {
    id: 'apaixonada_direito',
    title: 'Apaixonada pelo Direito',
    description: 'Concluiu 10 leituras jurídicas ou obras fundamentais de Direito e Filosofia.',
    icon: 'Scale',
    badgeLevel: 'gold',
    xpReward: 50_000,
    category: 'genre',
  },
  {
    id: 'multi_genero',
    title: 'Multi-Gênero',
    description: 'Explorou pelo menos 1 livro em 10 gêneros literários distintos.',
    icon: 'Palette',
    badgeLevel: 'gold',
    xpReward: 40_000,
    category: 'genre',
  },
];
