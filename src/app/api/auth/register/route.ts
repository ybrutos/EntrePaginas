import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, setAuthCookie } from '@/lib/auth';
import { calculateLevelFromXP } from '@/lib/gamification/level-system';
import { isRateLimited } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password } = await request.json();

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(`register:${ip}`, 10, 3600000)) { // 10 contas por hora por IP
      return NextResponse.json({ error: 'Muitos cadastros a partir deste IP. Tente novamente mais tarde.' }, { status: 429 });
    }

    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { error: 'Nome, email, nome de usuário e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername) {
      return NextResponse.json(
        { error: 'Nome de usuário inválido. Utilize apenas letras, números e underline.' },
        { status: 400 }
      );
    }

    // Verifica unicidade
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { username: cleanUsername }],
      },
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Este nome de usuário já está em uso.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        level: 1,
        levelTitle: 'Curiosa',
        totalXP: 0,
        totalReadingXP: 0,
        totalListeningXP: 0,
        totalWordsRead: 0,
        totalMinutesListened: 0,
        streakDays: 1,
        lastActiveDate: new Date(),
      },
    });

    // Concede conquista inicial de boas-vindas
    try {
      await db.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: 'primeira_pagina',
        },
      });
    } catch (e) {}

    // Inicia sessão automaticamente
    const { token, expiresAt } = await createSession(user.id);
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
    console.error('[API /api/auth/register] Erro:', error);
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 });
  }
}
