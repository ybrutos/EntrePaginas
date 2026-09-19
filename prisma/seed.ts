import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_ACHIEVEMENTS } from '../src/lib/gamification/achievements';

const prisma = new PrismaClient();

const GENRES_LIST = [
  { name: 'Romance', slug: 'romance', description: 'Narrativas românticas e dramas interpessoais' },
  { name: 'Fantasia', slug: 'fantasia', description: 'Mundos mágicos, criaturas míticas e épicos' },
  { name: 'Ficção científica', slug: 'ficcao-cientifica', description: 'Exploração espacial, distopias e tecnologia futura' },
  { name: 'Mistério', slug: 'misterio', description: 'Investigações, enigmas e segredos' },
  { name: 'Suspense', slug: 'suspense', description: 'Tramas tensas e de tirar o fôlego' },
  { name: 'Terror', slug: 'terror', description: 'Horror psicológico, sobrenatural e gótico' },
  { name: 'Drama', slug: 'drama', description: 'Relações humanas profundas e conflitos morais' },
  { name: 'Biografia', slug: 'biografia', description: 'Vidas notáveis e memórias históricas' },
  { name: 'História', slug: 'historia', description: 'Grandes eventos e civilizações' },
  { name: 'Filosofia', slug: 'filosofia', description: 'Pensamento crítico, ética e existência' },
  { name: 'Psicologia', slug: 'psicologia', description: 'Comportamento humano, mente e emoções' },
  { name: 'Direito', slug: 'direito', description: 'Ciência jurídica, justiça, leis e doutrina' },
  { name: 'Política', slug: 'politica', description: 'Teoria do poder, governança e sociedade' },
  { name: 'Economia', slug: 'economia', description: 'Sistemas econômicos, mercados e recursos' },
  { name: 'Negócios', slug: 'negocios', description: 'Gestão, estratégia e liderança' },
  { name: 'Tecnologia', slug: 'tecnologia', description: 'Inovação, futuro digital e inteligência' },
  { name: 'Computação', slug: 'computacao', description: 'Programação, arquitetura de sistemas e software' },
  { name: 'Desenvolvimento pessoal', slug: 'desenvolvimento-pessoal', description: 'Hábitos, produtividade e autoconhecimento' },
  { name: 'Religião', slug: 'religiao', description: 'Espiritualidade, fé e teologia' },
  { name: 'Poesia', slug: 'poesia', description: 'Lirismo, versos e arte poética' },
  { name: 'Clássicos', slug: 'classicos', description: 'Obras imortais do cânone ocidental e universal' },
  { name: 'Literatura brasileira', slug: 'literatura-brasileira', description: 'Grandes autores e movimentos do Brasil' },
  { name: 'Literatura estrangeira', slug: 'literatura-estrangeira', description: 'Obras-primas da literatura mundial' },
  { name: 'Infantil', slug: 'infantil', description: 'Histórias infantis e fábulas formativas' },
  { name: 'Juvenil', slug: 'juvenil', description: 'Jovens adultos e jornadas de crescimento' },
  { name: 'Acadêmico', slug: 'academico', description: 'Artigos, ensaios científicos e manuais' },
  { name: 'Não ficção', slug: 'nao-ficcao', description: 'Ensaística, jornalismo e fatos reais' },
];

async function main() {
  console.log('🌱 Iniciando sementeira da plataforma multiusuário Entre Páginas...');

  const passwordHashKarolayne = await bcrypt.hash('karolayne123', 10);
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);

  // 1. Usuário Administrador
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: passwordHashAdmin, role: 'ADMIN' },
    create: {
      username: 'admin',
      email: 'admin@entre-paginas.local',
      name: 'Administrador Entre Páginas',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      bio: 'Guardião técnico do ecossistema e fontes da plataforma.',
      level: 50,
      levelTitle: 'Lenda Literária',
      totalXP: 10_000_000,
    },
  });
  console.log(`🛡️ Administrador configurado: ${admin.username}`);

  // 2. Usuária Karolayne (como conta seed/demo)
  const karolayne = await prisma.user.upsert({
    where: { username: 'karolayne' },
    update: { passwordHash: passwordHashKarolayne },
    create: {
      username: 'karolayne',
      name: 'Karolayne Dayse dos Santos Silva',
      email: 'karolayne@entre-paginas.local',
      passwordHash: passwordHashKarolayne,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      bio: 'Leitora desde sempre. Amante de clássicos, romances densos e das complexidades humanas.',
      level: 27,
      levelTitle: 'Devoradora de Histórias',
      totalXP: 2_843_521,
      totalReadingXP: 2_843_521,
      totalListeningXP: 0,
      totalWordsRead: 2_843_521,
      streakDays: 18,
      longestStreak: 34,
      lastActiveDate: new Date(),
    },
  });
  console.log(`👤 Usuária demo: ${karolayne.username} (Nível ${karolayne.level})`);

  // 3. Cadastra todos os 27 gêneros
  for (const genre of GENRES_LIST) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name, description: genre.description },
      create: genre,
    });
  }

  // 4. Cadastra conquistas
  for (const ach of INITIAL_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: ach.id },
      update: {
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        badgeLevel: ach.badgeLevel,
        xpReward: ach.xpReward,
        category: ach.category,
      },
      create: {
        id: ach.id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        badgeLevel: ach.badgeLevel,
        xpReward: ach.xpReward,
        category: ach.category,
      },
    });
  }

  // 5. Autores
  const machado = await prisma.author.upsert({
    where: { name: 'Machado de Assis' },
    update: {},
    create: { name: 'Machado de Assis', birthYear: 1839, deathYear: 1908, nationality: 'Brasileiro' },
  });

  const janeAusten = await prisma.author.upsert({
    where: { name: 'Jane Austen' },
    update: {},
    create: { name: 'Jane Austen', birthYear: 1775, deathYear: 1817, nationality: 'Britânica' },
  });

  const aluisio = await prisma.author.upsert({
    where: { name: 'Aluísio Azevedo' },
    update: {},
    create: { name: 'Aluísio Azevedo', birthYear: 1857, deathYear: 1913, nationality: 'Brasileiro' },
  });

  // Gêneros
  const gClassicos = await prisma.genre.findUnique({ where: { slug: 'classicos' } });
  const gLitBr = await prisma.genre.findUnique({ where: { slug: 'literatura-brasileira' } });
  const gRomance = await prisma.genre.findUnique({ where: { slug: 'romance' } });

  // Livro 1: Dom Casmurro (com Ebook E Audiolivro LibriVox!)
  const domCasmurro = await prisma.book.upsert({
    where: { slug: 'dom-casmurro' },
    update: {},
    create: {
      slug: 'dom-casmurro',
      title: 'Dom Casmurro',
      subtitle: 'Uma das maiores obras da literatura universal',
      description: 'Narrado em primeira pessoa por Bento Santiago (o Bentinho), já idoso, o romance retrata sua obsessão ciumenta por Capitu, seus olhos de cigana oblíqua e dissimulada, e a eterna dúvida que ecoa nas páginas: traiu ou não traiu?',
      coverUrl: 'https://covers.openlibrary.org/b/id/10574044-L.jpg',
      publicationYear: 1899,
      language: 'pt',
      publisher: 'Livraria Garnier',
      isbn: '9788535911664',
      pageCount: 256,
      estimatedWords: 82_400,
      isPublicDomain: true,
      hasAudiobook: true,
      license: 'Domínio Público (Gutenberg #55752 & LibriVox #13988)',
      officialSourceUrl: 'https://www.gutenberg.org/ebooks/55752',
      authors: {
        create: [{ authorId: machado.id, order: 0 }],
      },
      genres: {
        create: [
          ...(gClassicos ? [{ genreId: gClassicos.id }] : []),
          ...(gLitBr ? [{ genreId: gLitBr.id }] : []),
          ...(gRomance ? [{ genreId: gRomance.id }] : []),
        ],
      },
      sources: {
        create: [
          {
            sourceName: 'gutenberg',
            externalId: '55752',
            canonicalUrl: 'https://www.gutenberg.org/ebooks/55752',
            license: 'Public Domain',
            isLegalDownload: true,
            isAudiobook: false,
          },
          {
            sourceName: 'librivox',
            externalId: '13988',
            canonicalUrl: 'https://librivox.org/dom-casmurro-by-machado-de-assis/',
            license: 'Public Domain',
            isLegalDownload: true,
            isAudiobook: true,
          },
          {
            sourceName: 'openlibrary',
            externalId: 'OL102749W',
            canonicalUrl: 'https://openlibrary.org/works/OL102749W',
            license: 'Public Domain',
            isLegalDownload: false,
          },
        ],
      },
      formats: {
        create: [
          {
            format: 'EPUB',
            downloadUrl: 'https://www.gutenberg.org/ebooks/55752.epub3.images',
            isDirectDownload: true,
          },
          {
            format: 'MOBI',
            downloadUrl: 'https://www.gutenberg.org/ebooks/55752.kf8.images',
            isDirectDownload: true,
          },
          {
            format: 'HTML',
            downloadUrl: 'https://www.gutenberg.org/ebooks/55752.html.images',
            isDirectDownload: true,
          },
          {
            format: 'AUDIOBOOK',
            downloadUrl: 'https://archive.org/compress/dom_casmurro_2102_librivox/formats=64KBPS MP3&file=/dom_casmurro_2102_librivox.zip',
            audioStreamingUrl: 'https://archive.org/download/dom_casmurro_2102_librivox/dom_casmurro_01_assis_64kb.mp3',
            durationMinutes: 508,
            narrator: 'Leni (LibriVox)',
            isDirectDownload: true,
          },
        ],
      },
    },
  });

  // Livro 2: Memórias Póstumas de Brás Cubas
  const brasCubas = await prisma.book.upsert({
    where: { slug: 'memorias-postumas-de-bras-cubas' },
    update: {},
    create: {
      slug: 'memorias-postumas-de-bras-cubas',
      title: 'Memórias Póstumas de Brás Cubas',
      subtitle: 'Ao verme que primeiro roeu as frias carnes do meu cadáver',
      description: 'Um defunto autor que escreve suas memórias com ironia fulminante, rompendo com o romantismo e inaugurando o Realismo no Brasil.',
      coverUrl: 'https://covers.openlibrary.org/b/id/11149234-L.jpg',
      publicationYear: 1881,
      language: 'pt',
      publisher: 'Tipografia Nacional',
      isbn: '9788535924763',
      pageCount: 224,
      estimatedWords: 75_200,
      isPublicDomain: true,
      hasAudiobook: false,
      license: 'Domínio Público (Project Gutenberg #54829)',
      officialSourceUrl: 'https://www.gutenberg.org/ebooks/54829',
      authors: {
        create: [{ authorId: machado.id, order: 0 }],
      },
      formats: {
        create: [
          {
            format: 'EPUB',
            downloadUrl: 'https://www.gutenberg.org/ebooks/54829.epub3.images',
            isDirectDownload: true,
          },
        ],
      },
    },
  });

  // Estante inicial para a usuária demo Karolayne
  await prisma.libraryItem.upsert({
    where: {
      userId_bookId: {
        userId: karolayne.id,
        bookId: domCasmurro.id,
      },
    },
    update: {},
    create: {
      userId: karolayne.id,
      bookId: domCasmurro.id,
      status: 'LENDO',
      isFavorite: true,
      rating: 5,
      review: 'A ambiguidade de Capitu continua fascinante a cada leitura.',
      tags: 'Favorito, Clássico',
      startDate: new Date('2026-09-01'),
      progress: {
        create: {
          userId: karolayne.id,
          bookId: domCasmurro.id,
          progressPercent: 45,
          maxProgressPercent: 45,
          currentChapter: 'Capítulo LIV — Um empurrão',
          wordsRead: Math.round(82_400 * 0.45),
        },
      },
    },
  });

  console.log('✨ Sementeira multiusuário concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro na sementeira:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
