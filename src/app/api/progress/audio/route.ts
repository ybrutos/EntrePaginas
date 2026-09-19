import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { 
      libraryItemId, 
      currentChapter = 1, 
      positionSeconds = 0, 
      minutesListened = 0,
    } = await request.json();

    if (!libraryItemId) {
      return NextResponse.json({ error: 'ID do item da estante é obrigatório' }, { status: 400 });
    }

    // Garante que o item pertence ao usuário atual
    const item = await db.libraryItem.findFirst({
      where: { id: libraryItemId, userId: user.id },
      include: { book: true, listeningProgress: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado na sua biblioteca' }, { status: 404 });
    }

    // Idempotência: só gera XP para tempo genuinamente novo
    const previousMaxMinutes = item.listeningProgress?.maxHistoricalMinutes || 0;
    const safeMinutes = Math.max(0, Math.round(minutesListened));
    const isNewTime = safeMinutes > previousMaxMinutes;
    const minutesDelta = isNewTime ? safeMinutes - previousMaxMinutes : 0;
    const listeningXPGained = minutesDelta * 10; // 10 XP por minuto escutado

    await db.listeningProgress.upsert({
      where: { libraryItemId: item.id },
      update: {
        currentChapter,
        currentPositionSec: positionSeconds,
        minutesListened: safeMinutes,
        maxHistoricalMinutes: isNewTime ? safeMinutes : previousMaxMinutes,
        lastListenedAt: new Date(),
      },
      create: {
        libraryItemId: item.id,
        userId: user.id,
        bookId: item.bookId,
        currentChapter,
        currentPositionSec: positionSeconds,
        minutesListened: safeMinutes,
        maxHistoricalMinutes: safeMinutes,
        lastListenedAt: new Date(),
      },
    });

    let newLevelInfo = null;

    if (listeningXPGained > 0) {
      await db.xPTransaction.create({
        data: {
          userId: user.id,
          bookId: item.bookId,
          xpEarned: listeningXPGained,
          xpType: 'LISTENING',
          minutesAdded: minutesDelta,
        },
      });

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      const newTotalListeningXP = (dbUser?.totalListeningXP || 0) + listeningXPGained;
      const newTotalXP = (dbUser?.totalXP || 0) + listeningXPGained;
      const newTotalMinutes = (dbUser?.totalMinutesListened || 0) + minutesDelta;
      newLevelInfo = calculateLevelFromXP(newTotalXP);

      await db.user.update({
        where: { id: user.id },
        data: {
          totalListeningXP: newTotalListeningXP,
          totalXP: newTotalXP,
          totalMinutesListened: newTotalMinutes,
          level: newLevelInfo.level,
          levelTitle: newLevelInfo.title,
          lastActiveDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      listeningXPGained,
      minutesListened: safeMinutes,
      levelInfo: newLevelInfo,
    });
  } catch (error) {
    console.error('[API /api/progress/audio] Erro:', error);
    return NextResponse.json({ error: 'Erro ao registrar progresso de áudio' }, { status: 500 });
  }
}
