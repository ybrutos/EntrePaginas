import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.user.findMany({
      where: {
        participateInRanking: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        totalXP: true,
        totalReadingXP: true,
        totalListeningXP: true,
        totalWordsRead: true,
        totalMinutesListened: true,
        level: true,
        levelTitle: true,
        streakDays: true,
        _count: {
          select: {
            libraryItems: {
              where: { status: 'LIDOS' },
            },
          },
        },
      },
      orderBy: { totalXP: 'desc' },
      take: 50,
    });

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatarUrl,
      totalXP: u.totalXP,
      totalReadingXP: u.totalReadingXP,
      totalListeningXP: u.totalListeningXP,
      totalWordsRead: u.totalWordsRead,
      totalMinutesListened: u.totalMinutesListened,
      level: u.level,
      levelTitle: u.levelTitle,
      streakDays: u.streakDays,
      completedBooks: u._count.libraryItems,
    }));

    return NextResponse.json({ ranking: leaderboard, leaderboard });
  } catch (error) {
    console.error('[API /api/ranking] Erro:', error);
    return NextResponse.json({ error: 'Erro ao carregar ranking.' }, { status: 500 });
  }
}
