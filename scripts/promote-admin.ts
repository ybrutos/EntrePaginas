import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function promoteAdmin() {
  const arg = process.argv[2];

  if (!arg) {
    console.error('Uso: npx tsx scripts/promote-admin.ts <email ou username>');
    process.exit(1);
  }

  const cleanArg = arg.toLowerCase().trim();

  try {
    const user = await db.user.findFirst({
      where: {
        OR: [{ email: cleanArg }, { username: cleanArg }],
      },
    });

    if (!user) {
      console.error(`❌ Usuário "${arg}" não encontrado.`);
      process.exit(1);
    }

    if (user.role === 'ADMIN') {
      console.log(`✅ O usuário ${user.username} já é um ADMIN.`);
      process.exit(0);
    }

    await db.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });

    console.log(`🎉 Sucesso! O usuário ${user.username} (${user.email}) foi promovido a ADMIN.`);
  } catch (error) {
    console.error('❌ Erro ao promover usuário:', error);
  } finally {
    await db.$disconnect();
  }
}

promoteAdmin();
