import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { name, bio, avatarUrl, isPublicProfile, participateInRanking } = await request.json();

    const updated = await db.user.update({
      where: { id: currentUser.id },
      data: {
        ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
        ...(typeof bio === 'string' ? { bio: bio.trim() } : {}),
        ...(typeof avatarUrl === 'string' ? { avatarUrl: avatarUrl.trim() } : {}),
        ...(typeof isPublicProfile === 'boolean' ? { isPublicProfile } : {}),
        ...(typeof participateInRanking === 'boolean' ? { participateInRanking } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        isPublicProfile: updated.isPublicProfile,
        participateInRanking: updated.participateInRanking,
      },
    });
  } catch (error) {
    console.error('[API /api/auth/profile] Erro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 });
  }
}
