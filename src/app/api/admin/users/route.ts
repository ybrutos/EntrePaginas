import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        level: true,
        levelTitle: true,
        totalXP: true,
        totalWordsRead: true,
        totalMinutesListened: true,
        streakDays: true,
        createdAt: true,
        lastActiveDate: true,
        _count: {
          select: {
            libraryItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      ...u,
      totalBooks: u._count.libraryItems,
    }));

    return NextResponse.json({ users: formatted });
  } catch (error) {
    console.error('[API /api/admin/users] Erro:', error);
    return NextResponse.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}
