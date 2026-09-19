import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from './db';

const COOKIE_NAME = 'auth_token';
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string) {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { session, token, expiresAt };
}

export async function destroySession(token: string) {
  try {
    await db.session.delete({
      where: { token },
    });
  } catch (e) {
    // Falha silenciosa caso a sessão já tenha sido expulsa
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!session) return null;

    // Se a sessão expirou, remove-a e retorna null
    if (session.expiresAt < new Date()) {
      await destroySession(token);
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('[Auth] Erro ao obter usuário atual:', error);
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
