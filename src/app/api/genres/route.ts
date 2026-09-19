import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const genres = await db.genre.findMany({
      include: {
        _count: {
          select: { books: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      genres: genres.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        description: g.description,
        booksCount: g._count.books,
      })),
    });
  } catch (error) {
    console.error('[API /api/genres] Erro:', error);
    return NextResponse.json({ error: 'Erro ao carregar gêneros' }, { status: 500 });
  }
}
