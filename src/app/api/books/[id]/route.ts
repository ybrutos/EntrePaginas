import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/lib/providers/provider-manager';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const book = await providerManager.getBook(id);

    if (!book) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }

    // Verifica se o livro já está na biblioteca do usuário logado
    const authUser = await getCurrentUser();
    let libraryItem = null;
    let localBook = null;

    if (authUser) {
      localBook = await db.book.findFirst({
        where: {
          OR: [{ id: book.id }, { slug: book.slug }],
        },
        include: {
          libraryItems: {
            where: { userId: authUser.id },
            include: { progress: true },
          },
        },
      });
      libraryItem = localBook?.libraryItems?.[0] || null;
    }

    const formattedDownloads = (book.downloadOptions || []).map((opt) => ({
      format: opt.format.toLowerCase(),
      url: opt.url,
      source: opt.sourceName || 'Desconhecido',
      isDirectDownload: opt.isDirectDownload
    }));

    return NextResponse.json({
      book: {
        ...book,
        downloads: formattedDownloads,
      },
      localBookId: localBook?.id || null,
      userState: libraryItem
        ? {
            libraryItemId: libraryItem.id,
            status: libraryItem.status,
            isFavorite: libraryItem.isFavorite,
            rating: libraryItem.rating,
            review: libraryItem.review,
            tags: libraryItem.tags,
            progressPercent: libraryItem.progress?.progressPercent || 0,
            wordsRead: libraryItem.progress?.wordsRead || 0,
            currentChapter: libraryItem.progress?.currentChapter || null,
            lastReadDate: libraryItem.progress?.lastReadAt || libraryItem.lastReadDate,
          }
        : null,
    });
  } catch (error) {
    console.error('[API /api/books/[id]] Erro:', error);
    return NextResponse.json({ error: 'Erro ao obter dados do livro' }, { status: 500 });
  }
}
