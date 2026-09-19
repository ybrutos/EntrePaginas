import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateXPProgress } from '@/lib/gamification/xp-calculator';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { libraryItemId, progressPercent, currentChapter } = await request.json();

    if (!libraryItemId) {
      return NextResponse.json({ error: 'ID da estante é obrigatório' }, { status: 400 });
    }

    // ISOLAMENTO: Confirma que o item pertence ao usuário logado
    const item = await db.libraryItem.findFirst({
      where: { id: libraryItemId, userId: user.id },
      include: {
        book: true,
        progress: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado na sua estante' }, { status: 404 });
    }

    const safePercent = Math.min(100, Math.max(0, Number(progressPercent) || 0));
    const previousMax = item.progress?.maxProgressPercent || 0;
    const totalWords = item.book.estimatedWords || 50_000;

    const xpResult = calculateXPProgress(totalWords, previousMax, safePercent);

    // Se atingiu 100%, marca o livro automaticamente como LIDOS
    const newStatus = safePercent >= 100 ? 'LIDOS' : item.status;
    const finishDate = safePercent >= 100 && !item.finishDate ? new Date() : item.finishDate;

    await db.libraryItem.update({
      where: { id: item.id },
      data: {
        status: newStatus,
        finishDate,
        lastReadDate: new Date(),
      },
    });

    await db.readingProgress.upsert({
      where: { libraryItemId: item.id },
      update: {
        progressPercent: safePercent,
        maxProgressPercent: xpResult.newMaxPercent,
        wordsRead: xpResult.wordsReadTotal,
        currentChapter: currentChapter || item.progress?.currentChapter,
        lastReadAt: new Date(),
      },
      create: {
        libraryItemId: item.id,
        userId: user.id,
        bookId: item.bookId,
        progressPercent: safePercent,
        maxProgressPercent: xpResult.newMaxPercent,
        wordsRead: xpResult.wordsReadTotal,
        currentChapter,
        lastReadAt: new Date(),
      },
    });

    let newLevelInfo = null;

    if (xpResult.xpDelta > 0) {
      await db.xPTransaction.create({
        data: {
          userId: user.id,
          bookId: item.bookId,
          xpEarned: xpResult.xpDelta,
          xpType: 'READING_PROGRESS',
          wordsReadDelta: xpResult.wordsReadDelta,
        },
      });

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      const newTotalReadingXP = (dbUser?.totalReadingXP || 0) + xpResult.xpDelta;
      const newTotalXP = (dbUser?.totalXP || 0) + xpResult.xpDelta;
      const newTotalWords = (dbUser?.totalWordsRead || 0) + xpResult.wordsReadDelta;
      newLevelInfo = calculateLevelFromXP(newTotalXP);

      await db.user.update({
        where: { id: user.id },
        data: {
          totalReadingXP: newTotalReadingXP,
          totalXP: newTotalXP,
          totalWordsRead: newTotalWords,
          level: newLevelInfo.level,
          levelTitle: newLevelInfo.title,
          lastActiveDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      progressPercent: safePercent,
      wordsReadTotal: xpResult.wordsReadTotal,
      xpGained: xpResult.xpDelta,
      status: newStatus,
      levelInfo: newLevelInfo,
    });
  } catch (error) {
    console.error('[API /api/progress] Erro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar progresso' }, { status: 500 });
  }
}
