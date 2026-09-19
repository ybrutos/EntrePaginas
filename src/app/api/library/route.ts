import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateXPProgress, estimateWordCount } from '@/lib/gamification/xp-calculator';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';
import { UnifiedBook } from '@/lib/providers/book-provider.interface';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado', items: [] }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const isFavorite = searchParams.get('favorite') === 'true';

    // ISOLAMENTO ESTRITO: Busca exclusivamente itens onde userId = user.id
    const whereClause: any = { userId: user.id };
    if (status && status !== 'TODOS' && status !== 'FAVORITOS') {
      whereClause.status = status;
    }
    if (isFavorite || status === 'FAVORITOS') {
      whereClause.isFavorite = true;
    }

    const items = await db.libraryItem.findMany({
      where: whereClause,
      include: {
        book: {
          include: {
            authors: { include: { author: true } },
            genres: { include: { genre: true } },
            sources: true,
            formats: true,
          },
        },
        progress: true,
        listeningProgress: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = items.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      status: item.status,
      isFavorite: item.isFavorite,
      rating: item.rating,
      review: item.review,
      tags: item.tags,
      startDate: item.startDate,
      finishDate: item.finishDate,
      lastReadDate: item.progress?.lastReadAt || item.lastReadDate,
      progressPercent: item.progress?.progressPercent || 0,
      wordsRead: item.progress?.wordsRead || 0,
      currentChapter: item.progress?.currentChapter || null,
      listeningProgress: item.listeningProgress
        ? {
            currentChapter: item.listeningProgress.currentChapter,
            positionSeconds: item.listeningProgress.currentPositionSec,
            minutesListened: item.listeningProgress.minutesListened,
          }
        : null,
      book: {
        id: item.book.id,
        slug: item.book.slug,
        title: item.book.title,
        subtitle: item.book.subtitle,
        description: item.book.description,
        coverUrl: item.book.coverUrl,
        publicationYear: item.book.publicationYear,
        language: item.book.language,
        pageCount: item.book.pageCount,
        estimatedWords: item.book.estimatedWords,
        isPublicDomain: item.book.isPublicDomain,
        hasAudiobook: item.book.hasAudiobook,
        license: item.book.license,
        authors: item.book.authors.map((a) => a.author.name),
        genres: item.book.genres.map((g) => g.genre.name),
        formats: item.book.formats.map((f) => ({
          format: f.format,
          url: f.downloadUrl,
          isDirectDownload: f.isDirectDownload,
          durationMinutes: f.durationMinutes,
          audioStreamingUrl: f.audioStreamingUrl,
          narrator: f.narrator,
        })),
      },
    }));

    return NextResponse.json({ items: formatted });
  } catch (error) {
    console.error('[API /api/library GET] Erro:', error);
    return NextResponse.json({ error: 'Erro ao carregar estante' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      bookData, 
      status, 
      isFavorite, 
      rating, 
      review, 
      tags,
      progressPercent = 0,
      currentChapter,
    } = body;

    if (!bookData || !bookData.title) {
      return NextResponse.json({ error: 'Dados do livro são obrigatórios' }, { status: 400 });
    }

    const unified: UnifiedBook = bookData;

    // 1. Garante que o livro existe no catálogo global Book
    let book = await db.book.findFirst({
      where: {
        OR: [
          { slug: unified.slug },
          { id: unified.id },
          { title: unified.title },
        ],
      },
      include: {
        authors: { include: { author: true } },
      },
    });

    if (!book) {
      const estimatedWords = unified.estimatedWords || estimateWordCount(unified.pageCount) || 50_000;
      book = await db.book.create({
        data: {
          slug: unified.slug || `book-${Date.now()}`,
          title: unified.title,
          subtitle: unified.subtitle,
          description: unified.description,
          coverUrl: unified.coverUrl,
          publicationYear: unified.publicationYear,
          language: unified.language || 'pt',
          pageCount: unified.pageCount,
          estimatedWords,
          isPublicDomain: unified.isPublicDomain || false,
          hasAudiobook: unified.hasAudiobook || Boolean(unified.audioOptions?.length),
          license: unified.license,
          officialSourceUrl: unified.officialSourceUrl,
          authors: {
            create: await Promise.all(
              (unified.authors || ['Autor Desconhecido']).map(async (name, idx) => {
                const author = await db.author.upsert({
                  where: { name },
                  update: {},
                  create: { name },
                });
                return { authorId: author.id, order: idx };
              })
            ),
          },
          formats: {
            create: [
              ...(unified.downloadOptions || []).map((opt) => ({
                format: opt.format,
                downloadUrl: opt.url,
                isDirectDownload: opt.isDirectDownload,
                durationMinutes: opt.durationMinutes,
                narrator: opt.narrator,
                audioStreamingUrl: opt.audioStreamingUrl,
              })),
            ],
          },
        },
        include: {
          authors: { include: { author: true } },
        },
      });
    }

    // 2. Busca ou cria o LibraryItem com isolamento absoluto por user.id
    const existingItem = await db.libraryItem.findUnique({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: book.id,
        },
      },
      include: { progress: true },
    });

    const targetStatus = status || existingItem?.status || 'LENDO';
    const targetFavorite = typeof isFavorite === 'boolean' ? isFavorite : existingItem?.isFavorite || false;
    const targetRating = typeof rating === 'number' ? rating : existingItem?.rating;
    const targetReview = typeof review === 'string' ? review : existingItem?.review;
    const targetTags = typeof tags === 'string' ? tags : existingItem?.tags;

    let libraryItem = await db.libraryItem.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: book.id,
        },
      },
      update: {
        status: targetStatus,
        isFavorite: targetFavorite,
        rating: targetRating,
        review: targetReview,
        tags: targetTags,
        lastReadDate: new Date(),
        finishDate: targetStatus === 'LIDOS' && !existingItem?.finishDate ? new Date() : existingItem?.finishDate,
      },
      create: {
        userId: user.id,
        bookId: book.id,
        status: targetStatus,
        isFavorite: targetFavorite,
        rating: targetRating,
        review: targetReview,
        tags: targetTags,
        startDate: new Date(),
        lastReadDate: new Date(),
        finishDate: targetStatus === 'LIDOS' ? new Date() : null,
      },
    });

    // 3. Atualiza o Progresso de Leitura e calcula XP de forma idempotente
    const prevMax = existingItem?.progress?.maxProgressPercent || 0;
    const targetProgressPercent = targetStatus === 'LIDOS' ? 100 : Math.max(progressPercent, existingItem?.progress?.progressPercent || 0);

    const totalWords = book.estimatedWords || 50_000;
    const xpResult = calculateXPProgress(totalWords, prevMax, targetProgressPercent);

    await db.readingProgress.upsert({
      where: { libraryItemId: libraryItem.id },
      update: {
        progressPercent: targetProgressPercent,
        maxProgressPercent: xpResult.newMaxPercent,
        wordsRead: xpResult.wordsReadTotal,
        currentChapter: currentChapter || existingItem?.progress?.currentChapter,
        lastReadAt: new Date(),
      },
      create: {
        libraryItemId: libraryItem.id,
        userId: user.id,
        bookId: book.id,
        progressPercent: targetProgressPercent,
        maxProgressPercent: xpResult.newMaxPercent,
        wordsRead: xpResult.wordsReadTotal,
        currentChapter,
        lastReadAt: new Date(),
      },
    });

    // 4. Se houve XP delta inédito, registra a transação e atualiza o usuário
    if (xpResult.xpDelta > 0) {
      await db.xPTransaction.create({
        data: {
          userId: user.id,
          bookId: book.id,
          xpEarned: xpResult.xpDelta,
          xpType: 'READING_PROGRESS',
          wordsReadDelta: xpResult.wordsReadDelta,
        },
      });

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      const newTotalReadingXP = (dbUser?.totalReadingXP || 0) + xpResult.xpDelta;
      const newTotalXP = (dbUser?.totalXP || 0) + xpResult.xpDelta;
      const newTotalWords = (dbUser?.totalWordsRead || 0) + xpResult.wordsReadDelta;
      const levelInfo = calculateLevelFromXP(newTotalXP);

      await db.user.update({
        where: { id: user.id },
        data: {
          totalReadingXP: newTotalReadingXP,
          totalXP: newTotalXP,
          totalWordsRead: newTotalWords,
          level: levelInfo.level,
          levelTitle: levelInfo.title,
          lastActiveDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      libraryItemId: libraryItem.id,
      bookId: book.id,
      xpGained: xpResult.xpDelta,
      status: targetStatus,
      isFavorite: targetFavorite,
      progressPercent: targetProgressPercent,
    });
  } catch (error) {
    console.error('[API /api/library POST] Erro:', error);
    return NextResponse.json({ error: 'Erro ao salvar livro na estante' }, { status: 500 });
  }
}
