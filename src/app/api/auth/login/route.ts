import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession, setAuthCookie } from '@/lib/auth';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';
import { isRateLimited } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(`login:${ip}`, 20, 60000)) { // 20 tentativas por minuto
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 });
    }

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Email/usuário e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanLogin = login.toLowerCase().trim();

    const user = await db.user.findFirst({
      where: {
        OR: [{ email: cleanLogin }, { username: cleanLogin }],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Cria sessão segura
    const { token, expiresAt } = await createSession(user.id);

    // Atualiza data de último acesso
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveDate: new Date() },
    });

    const levelInfo = calculateLevelFromXP(user.totalXP);

    const res = NextResponse.json({
      success: true,
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
        levelInfo,
      },
    });

    setAuthCookie(res, token, expiresAt);
    return res;
  } catch (error) {
    console.error('[API /api/auth/login] Erro:', error);
    return NextResponse.json({ error: 'Erro ao autenticar.' }, { status: 500 });
  }
}
