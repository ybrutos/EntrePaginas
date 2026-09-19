import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, clearAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const token = cookies().get('auth_token')?.value;
    if (token) {
      await destroySession(token);
    }

    const res = NextResponse.json({ success: true });
    clearAuthCookie(res);
    return res;
  } catch (error) {
    console.error('[API /api/auth/logout] Erro:', error);
    const res = NextResponse.json({ success: true });
    clearAuthCookie(res);
    return res;
  }
}
