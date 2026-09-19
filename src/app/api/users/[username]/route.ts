import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;
    if (!username) {
      return NextResponse.json({ error: 'Username não informado' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        libraryItems: {
          where: { status: 'LIDOS' },
          include: {
            book: {
              include: {
                genres: { include: { genre: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Se o perfil for privado, respeita rigorosamente a privacidade
    if (!user.isPublicProfile) {
      return NextResponse.json({
        isPrivate: true,
        user: {
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    // Extrai top gêneros dos livros lidos
    const genreMap: Record<string, number> = {};
    for (const item of user.libraryItems) {
      for (const g of item.book.genres) {
        genreMap[g.genre.name] = (genreMap[g.genre.name] || 0) + 1;
      }
    }
    const favoriteGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    const levelInfo = calculateLevelFromXP(user.totalXP);

    // Livros concluídos (apenas título, capa e autor para exibição pública de leitura finalizada)
    const completedBooks = user.libraryItems.slice(0, 8).map((item) => ({
      id: item.book.id,
      title: item.book.title,
      coverUrl: item.book.coverUrl,
    }));

    return NextResponse.json({
      isPrivate: false,
      user: {
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        totalXP: user.totalXP,
        readingXP: user.totalReadingXP,
        listeningXP: user.totalListeningXP,
        totalWordsRead: user.totalWordsRead,
        streakDays: user.streakDays,
        levelInfo,
        completedBooksCount: user.libraryItems.length,
        completedBooks,
        favoriteGenres,
        achievements: user.achievements.map((ua) => ({
          id: ua.achievement.id,
          title: ua.achievement.title,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          badgeLevel: ua.achievement.badgeLevel,
          unlockedAt: ua.unlockedAt,
        })),
      },
    });
  } catch (error) {
    console.error('[API /api/users/[username]] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}
