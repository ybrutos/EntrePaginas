import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isRateLimited } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(`reset:${ip}`, 5, 3600000)) {
      return NextResponse.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, { status: 429 });
    }

    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve conter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await db.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // Invalida o token para não ser reusado
    await db.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Invalida todas as sessões ativas do usuário para forçar re-login
    const user = await db.user.findUnique({ where: { email: resetToken.email } });
    if (user) {
      await db.session.deleteMany({
        where: { userId: user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/auth/reset-password] Erro:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
