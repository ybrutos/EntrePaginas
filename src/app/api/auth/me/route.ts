import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const levelInfo = calculateLevelFromXP(user.totalXP);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        isPublicProfile: user.isPublicProfile,
        participateInRanking: user.participateInRanking,
        totalReadingXP: user.totalReadingXP,
        totalListeningXP: user.totalListeningXP,
        totalXP: user.totalXP,
        totalWordsRead: user.totalWordsRead,
        totalMinutesListened: user.totalMinutesListened,
        streakDays: user.streakDays,
        levelInfo,
      },
    });
  } catch (error) {
    console.error('[API /api/auth/me] Erro:', error);
    return NextResponse.json({ user: null });
  }
}
