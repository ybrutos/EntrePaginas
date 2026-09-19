import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { isRateLimited } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(`recover:${ip}`, 5, 3600000)) { // 5 tentativas por hora
      return NextResponse.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Para não vazar quais emails estão registrados, sempre retornamos sucesso.
      return NextResponse.json({ success: true, message: 'Se o email existir, um link foi enviado.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 horas

    await db.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    // TODO: Integração com provedor de E-mail (ex: Resend, SendGrid, Amazon SES)
    // Em produção, isso não pode ficar apenas no console.
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token}`;
    console.log(`\n\n==========================================`);
    console.log(`[AUTH] Link de recuperação para ${user.email}:`);
    console.log(`${resetUrl}`);
    console.log(`==========================================\n\n`);

    return NextResponse.json({ success: true, message: 'Se o email existir, um link foi enviado.' });
  } catch (error) {
    console.error('[API /api/auth/recover-password] Erro:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
