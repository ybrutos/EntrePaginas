'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Flame, 
  BookOpen, 
  Trophy, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Bookmark, 
  Library, 
  Clock,
  Headphones,
  Compass,
  UserPlus,
  LogIn,
  ShieldCheck,
  Award,
  BarChart3
} from 'lucide-react';
import XPProgressBar from '@/components/gamification/XPProgressBar';
import BookCard from '@/components/books/BookCard';
import ProgressModal from '@/components/books/ProgressModal';
import { formatNumberBR } from '@/lib/utils/text';

const GENRE_CATEGORIES = [
  { name: 'Romance', slug: 'romance', emoji: '🌹' },
  { name: 'Fantasia', slug: 'fantasia', emoji: '🐉' },
  { name: 'Ficção Científica', slug: 'ficcao-cientifica', emoji: '🚀' },
  { name: 'Mistério', slug: 'misterio', emoji: '🔍' },
  { name: 'Terror', slug: 'terror', emoji: '🕯️' },
  { name: 'História', slug: 'historia', emoji: '🏛️' },
  { name: 'Filosofia', slug: 'filosofia', emoji: '📜' },
  { name: 'Direito', slug: 'direito', emoji: '⚖️' },
  { name: 'Ciência', slug: 'ciencia', emoji: '🔬' },
  { name: 'Tecnologia', slug: 'tecnologia', emoji: '💻' },
  { name: 'Poesia', slug: 'poesia', emoji: '🪶' },
  { name: 'Audiolivros', slug: 'audiolivros', emoji: '🎧' },
];

export default function HomePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentReading, setCurrentReading] = useState<any>(null);
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de progresso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<any>(null);

  const loadUserData = () => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserData(data.user);
          setStats(data.stats);
          setCurrentReading(data.currentReading);
        } else {
          setUserData(null);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUserData();

    // Carrega catálogo inicial / recomendações
    fetch('/api/search?q=Machado&limit=4')
      .then((r) => r.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          setFeaturedBooks(data.items.slice(0, 4));
        } else {
          // Fallback para biblioteca se houver
          fetch('/api/library')
            .then((res) => res.json())
            .then((libData) => {
              if (libData.items) {
                setFeaturedBooks(libData.items.map((i: any) => i.book).slice(0, 4));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenProgress = (bookItem: any) => {
    setSelectedBookForProgress(bookItem);
    setIsModalOpen(true);
  };

  const handleProgressSuccess = () => {
    loadUserData();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/buscar');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#725E62]">Carregando seu refúgio literário...</p>
      </div>
    );
  }

  // ==========================================
  // ESTADO 1: VISITANTE NÃO AUTENTICADO (LANDING PAGE PÚBLICA)
  // ==========================================
  if (!userData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12 space-y-16 animate-fadeIn">
        {/* Hero Section */}
        <section className="relative rounded-3xl bg-gradient-to-br from-[#722F37] via-[#581825] to-[#2D0E14] text-white p-8 md:p-16 overflow-hidden shadow-book">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F5E8C7] text-xs font-semibold uppercase tracking-widest border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Entre Páginas • Plataforma Aberta de Leitura
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
              Onde cada livro vira uma nova jornada.
            </h1>

            <p className="font-serif text-lg sm:text-xl text-[#F5EFE6]/90 font-normal leading-relaxed max-w-2xl">
              Descubra seu próximo livro entre milhares de obras em domínio público, audiolivros narrados e clássicos universais agregados em tempo real de 8 fontes legítimas.
            </p>

            {/* Live Search Bar inside Landing Hero */}
            <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-[#725E62]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔎 O que você quer ler? (título, autor, gênero...)"
                  className="w-full pl-12 pr-32 py-4 rounded-2xl bg-white text-[#2C2224] placeholder-[#725E62] text-sm md:text-base font-medium focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/40 shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-5 py-2.5 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs md:text-sm font-semibold transition-transform active:scale-95 shadow-sm"
                >
                  Pesquisar
                </button>
              </div>
            </form>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              <Link
                href="/cadastro"
                className="px-6 py-3.5 rounded-2xl bg-[#D4AF37] hover:bg-[#B38E22] text-[#2D0E14] font-bold text-sm flex items-center gap-2 shadow-glow-gold transition-transform active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                Criar Conta Gratuita
              </Link>

              <Link
                href="/login"
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center gap-2 border border-white/20 backdrop-blur-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Link>

              <Link
                href="/explorar"
                className="px-6 py-3.5 rounded-2xl bg-transparent hover:bg-white/5 text-[#F5E8C7] font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4" />
                Explorar Gêneros
              </Link>
            </div>
          </div>
        </section>

        {/* 5 Highlights Grid */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold">
              Ecossistema Completo
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#2C2224]">
              Tudo para sua experiência literária
            </h2>
            <p className="text-sm text-[#725E62]">
              Uma plataforma multiusuário projetada para amantes de livros, com rigor ético e legal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#2C2224]">Obras Catalogadas</h3>
              <p className="text-xs text-[#725E62] leading-relaxed">
                Milhares de livros catalogados e agregados com deduplicação inteligente.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#2C2224]">Audiolivros Livres</h3>
              <p className="text-xs text-[#725E62] leading-relaxed">
                Integração com LibriVox com player integrado e ganho de listeningXP.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#722F37] flex items-center justify-center">
                <Library className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#2C2224]">Ebooks & Formatos</h3>
              <p className="text-xs text-[#725E62] leading-relaxed">
                Downloads legais de EPUB, PDF e compatibilidade direta com Kindle.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#2C2224]">Gamificação & XP</h3>
              <p className="text-xs text-[#725E62] leading-relaxed">
                1 palavra = 1 XP. Conquistas desbloqueáveis e evolução por níveis.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm space-y-2 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#2C2224]">Sua Jornada</h3>
              <p className="text-xs text-[#725E62] leading-relaxed">
                Estante 100% privada por usuário, estatísticas detalhadas e histórico.
              </p>
            </div>
          </div>
        </section>

        {/* Explore Categories Hub */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold">
                Navegação Temática
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
                Explore por Gênero & Categoria
              </h2>
            </div>
            <Link href="/explorar" className="text-xs font-semibold text-[#722F37] hover:underline flex items-center gap-1">
              Ver todos os gêneros <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {GENRE_CATEGORIES.map((g) => (
              <Link
                key={g.slug}
                href={`/explorar/${g.slug}`}
                className="p-4 rounded-2xl bg-white border border-[#EADFD0] hover:border-[#722F37] shadow-sm hover:shadow-md text-center transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">
                  {g.emoji}
                </span>
                <span className="font-serif text-xs font-bold text-[#2C2224] group-hover:text-[#722F37]">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Catalog Items */}
        {featuredBooks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold">
                  Curadoria Aberta
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
                  Clássicos em Destaque
                </h2>
              </div>
              <Link
                href="/buscar?publicDomainOnly=true"
                className="text-xs font-semibold text-[#722F37] hover:underline"
              >
                Ver mais obras →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {featuredBooks.map((book) => (
                <BookCard key={book.id || book.slug} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* Final CTA Banner */}
        <section className="rounded-3xl bg-[#F4EFE6] border border-[#EADFD0] p-8 md:p-12 text-center space-y-4">
          <h2 className="font-serif text-2xl md:text-4xl font-bold text-[#2C2224]">
            Pronto para iniciar sua nova jornada literária?
          </h2>
          <p className="text-sm text-[#725E62] max-w-xl mx-auto">
            Crie sua conta no Entre Páginas em segundos. Tenha sua biblioteca própria, acompanhe seu progresso e ganhe conquistas.
          </p>
          <div className="pt-2">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white font-bold text-sm shadow-md transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Criar Minha Conta Agora
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // ESTADO 2: DASHBOARD DO USUÁRIO LOGADO
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10 animate-fadeIn">
      {/* 1. Hero Greeting Banner */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#722F37] via-[#581825] to-[#2D0E14] text-white p-6 md:p-12 overflow-hidden shadow-book">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F5E8C7] text-xs font-semibold uppercase tracking-widest mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Entre Páginas • Santuário Literário
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Olá, {userData?.name || 'Leitor'} 👋
          </h1>
          <p className="font-serif text-lg md:text-2xl text-[#F5EFE6]/90 mt-2 italic font-normal">
            "Qual história vamos descobrir hoje?"
          </p>

          {/* Quick Metrics Bar inside Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/15">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
              <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block font-medium">
                Nível Atual
              </span>
              <span className="font-serif text-xl font-bold text-white flex items-center gap-1.5 mt-0.5">
                {userData?.levelInfo?.level || 1}
                <span className="text-xs font-sans font-normal text-[#D4AF37]">
                  {userData?.levelInfo?.title || 'Iniciante'}
                </span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
              <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block font-medium">
                Palavras Lidas
              </span>
              <span className="font-serif text-xl font-bold text-white mt-0.5 block">
                {formatNumberBR(userData?.totalWordsRead || 0)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
              <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block font-medium">
                Sequência
              </span>
              <span className="font-serif text-xl font-bold text-[#F5E8C7] flex items-center gap-1 mt-0.5">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse fill-amber-400" />
                {userData?.streakDays || 0} dias
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
              <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block font-medium">
                Livros Concluídos
              </span>
              <span className="font-serif text-xl font-bold text-white mt-0.5 block">
                {stats?.completedBooks || 0} histórias
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. XP & Level Progress Bar */}
      {userData?.levelInfo && (
        <section>
          <XPProgressBar levelInfo={userData.levelInfo} />
        </section>
      )}

      {/* 3. Continue Lendo & Próxima Conquista Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continuar Lendo Card (2 colunas) */}
        <div className="lg:col-span-2 p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#725E62] font-semibold">
              <BookOpen className="w-4 h-4 text-[#722F37]" />
              Continuar Lendo
            </div>
            <Link
              href="/biblioteca"
              className="text-xs font-semibold text-[#722F37] hover:text-[#581825] flex items-center gap-1"
            >
              Ver Estante Completa <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {currentReading ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
              <div className="w-28 h-40 rounded-2xl bg-[#F4EFE6] overflow-hidden shadow-book flex-shrink-0 border border-[#EADFD0]">
                {currentReading.coverUrl ? (
                  <img
                    src={currentReading.coverUrl}
                    alt={currentReading.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#722F37]">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#2C2224] leading-snug">
                    {currentReading.title}
                  </h3>
                  <p className="text-sm text-[#725E62] mt-0.5">
                    {currentReading.authors?.join(', ') || 'Autor Desconhecido'}
                  </p>
                  {currentReading.currentChapter && (
                    <p className="text-xs text-[#722F37] font-medium mt-1">
                      {currentReading.currentChapter}
                    </p>
                  )}
                </div>

                {/* Progress Visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#725E62]">
                    <span className="font-semibold text-[#722F37]">
                      {currentReading.progressPercent}% concluído
                    </span>
                    <span>
                      {formatNumberBR(currentReading.wordsRead)} / {formatNumberBR(currentReading.estimatedWords)} palavras
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#EADFD0]">
                    <div
                      className="h-full bg-gradient-to-r from-[#722F37] to-[#D4AF37] rounded-full"
                      style={{ width: `${currentReading.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() =>
                      handleOpenProgress({
                        id: currentReading.id,
                        title: currentReading.title,
                        coverUrl: currentReading.coverUrl,
                        libraryItemId: currentReading.id,
                        progressPercent: currentReading.progressPercent,
                        estimatedWords: currentReading.estimatedWords,
                        currentChapter: currentReading.currentChapter,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Atualizar Progresso
                  </button>

                  <Link
                    href={`/livro/${encodeURIComponent(currentReading.bookId)}`}
                    className="px-4 py-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EADFD0] text-[#2C2224] text-xs font-semibold transition-colors"
                  >
                    Detalhes do Livro
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-[#725E62]">
              <p className="font-serif text-lg">Nenhum livro em leitura ativa no momento.</p>
              <Link
                href="/buscar"
                className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
              >
                Explorar Catálogo
              </Link>
            </div>
          )}
        </div>

        {/* Próxima Conquista Banner (1 coluna) */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#FAF8F5] to-[#F4EFE6] border border-[#EADFD0] shadow-book flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D4AF37] font-bold mb-3">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
              Próxima Conquista
            </div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/10 border-2 border-[#D4AF37] flex items-center justify-center text-[#B38E22] mb-4 shadow-glow-gold">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="font-serif text-xl font-bold text-[#2C2224]">
              {userData?.totalWordsRead > 1000000 ? 'Mestre das Letras' : 'Primeiros Capítulos'}
            </h3>
            <p className="text-xs text-[#725E62] mt-1.5 leading-relaxed">
              Continue lendo e registrando seu progresso diário para desbloquear novos títulos e insígnias.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EADFD0]">
            <Link
              href="/conquistas"
              className="block text-center text-xs font-semibold text-[#722F37] hover:underline"
            >
              Ver todas as conquistas →
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Barra de Pesquisa Rápida */}
      <section className="p-6 rounded-3xl bg-white border border-[#EADFD0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#2C2224]">
            Encontre seu próximo refúgio literário
          </h2>
          <p className="text-xs text-[#725E62] mt-0.5">
            Pesquise por títulos, autores, obras em domínio público e clássicos imortais.
          </p>
        </div>

        <Link
          href="/buscar"
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
        >
          <Search className="w-4 h-4" />
          <span>Pesquisar Livros</span>
        </Link>
      </section>

      {/* 5. Recomendados para Você */}
      {featuredBooks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold">
                Curadoria Especial
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
                Recomendados para Você
              </h2>
            </div>
            <Link
              href="/buscar?publicDomainOnly=true"
              className="text-xs font-semibold text-[#722F37] hover:underline"
            >
              Ver mais clássicos →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {featuredBooks.map((book) => (
              <BookCard
                key={book.id || book.slug}
                book={book}
                onOpenProgress={() => handleOpenProgress(book)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal de Atualização de Progresso */}
      {selectedBookForProgress && (
        <ProgressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          book={selectedBookForProgress}
          libraryItemId={selectedBookForProgress.libraryItemId || selectedBookForProgress.id}
          currentPercent={selectedBookForProgress.progressPercent || 0}
          maxHistoricalPercent={selectedBookForProgress.progressPercent || 0}
          totalWords={selectedBookForProgress.estimatedWords || 80_000}
          currentChapter={selectedBookForProgress.currentChapter}
          onSuccess={handleProgressSuccess}
        />
      )}
    </div>
  );
}
