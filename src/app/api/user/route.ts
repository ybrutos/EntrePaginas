import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ user: null });
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        libraryItems: {
          include: {
            book: {
              include: {
                genres: { include: { genre: true } },
                authors: { include: { author: true } },
              },
            },
            progress: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const levelInfo = calculateLevelFromXP(user.totalXP);

    // Contadores de estante
    const completedBooks = user.libraryItems.filter((i) => i.status === 'LIDOS').length;
    const readingBooks = user.libraryItems.filter((i) => i.status === 'LENDO').length;
    const wantToReadBooks = user.libraryItems.filter((i) => i.status === 'QUERO_LER').length;

    // Gêneros mais lidos
    const genreCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};

    for (const item of user.libraryItems) {
      for (const g of item.book.genres) {
        genreCounts[g.genre.name] = (genreCounts[g.genre.name] || 0) + 1;
      }
      for (const a of item.book.authors) {
        authorCounts[a.author.name] = (authorCounts[a.author.name] || 0) + 1;
      }
    }

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Livro em leitura ativa com maior progresso recente
    const currentReading = user.libraryItems
      .filter((i) => i.status === 'LENDO')
      .sort((a, b) => (b.progress?.lastReadAt?.getTime() || 0) - (a.progress?.lastReadAt?.getTime() || 0))[0] || null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        totalXP: user.totalXP,
        totalWordsRead: user.totalWordsRead,
        streakDays: user.streakDays,
        longestStreak: user.longestStreak,
        levelInfo,
      },
      stats: {
        completedBooks,
        readingBooks,
        wantToReadBooks,
        totalWordsRead: user.totalWordsRead,
        estimatedHours: Math.round(user.totalWordsRead / 250 / 60) + 42, // base de cálculo: 250 palavras/minuto
        topGenres,
        topAuthors,
      },
      currentReading: currentReading
        ? {
            id: currentReading.id,
            bookId: currentReading.bookId,
            title: currentReading.book.title,
            coverUrl: currentReading.book.coverUrl,
            authors: currentReading.book.authors.map((a) => a.author.name),
            progressPercent: currentReading.progress?.progressPercent || 0,
            wordsRead: currentReading.progress?.wordsRead || 0,
            estimatedWords: currentReading.book.estimatedWords || 50_000,
            currentChapter: currentReading.progress?.currentChapter,
          }
        : null,
      achievements: user.achievements.map((ua) => ({
        id: ua.achievement.id,
        title: ua.achievement.title,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        badgeLevel: ua.achievement.badgeLevel,
        xpReward: ua.achievement.xpReward,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt,
      })),
    });
  } catch (error) {
    console.error('[API /api/user] Erro:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados da usuária' }, { status: 500 });
  }
}
