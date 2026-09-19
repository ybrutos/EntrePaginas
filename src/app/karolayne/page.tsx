'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Flame, 
  BookOpen, 
  Trophy, 
  Clock, 
  Crown, 
  Compass, 
  Library, 
  User as UserIcon,
  Award
} from 'lucide-react';
import XPProgressBar from '@/components/gamification/XPProgressBar';
import AchievementCard from '@/components/gamification/AchievementCard';
import { formatNumberBR } from '@/lib/utils/text';

export default function KarolayneProfilePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-[#725E62]">
        <div className="w-12 h-12 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-xl">Abrindo os anais literários de Karolayne...</p>
      </div>
    );
  }

  const user = data?.user;
  const stats = data?.stats;
  const achievements = data?.achievements || [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10 animate-fadeIn">
      {/* 1. Header Profile Banner */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#722F37] via-[#581825] to-[#1F080D] text-white p-6 md:p-12 overflow-hidden shadow-book">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
          {/* Avatar with Ornamental Ring */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden border-2 border-[#D4AF37] shadow-glow-gold p-1 bg-gradient-to-b from-[#FAF8F5] to-[#EADFD0]">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full bg-[#722F37] flex items-center justify-center text-white">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Level Badge in Avatar */}
            <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[#D4AF37] text-[#2C2224] text-xs font-bold shadow-md border border-white flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-[#2C2224]" />
              Nv. {user?.levelInfo?.level || 27}
            </div>
          </div>

          {/* Bio & Titles */}
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F5E8C7] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Leitora desde sempre
            </div>

            <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              {user?.name || 'Karolayne Dayse dos Santos Silva'}
            </h1>

            <p className="font-serif text-lg md:text-xl text-[#F5EFE6]/90 italic">
              "Nível {user?.levelInfo?.level || 27} — {user?.levelInfo?.title || 'Devoradora de Histórias'}"
            </p>

            <p className="text-xs text-[#F5EFE6]/80 max-w-xl leading-relaxed mt-2">
              {user?.bio || 'Apaixonada por literatura clássica, direito e mundos fantásticos.'}
            </p>
          </div>
        </div>

        {/* Dynamic Highlight Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/15 text-center">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block">
              Palavras Exploradas
            </span>
            <span className="font-serif text-2xl font-bold text-white mt-0.5 block">
              {formatNumberBR(user?.totalWordsRead || 2843521)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block">
              Histórias Concluídas
            </span>
            <span className="font-serif text-2xl font-bold text-white mt-0.5 block">
              {stats?.completedBooks || 47} livros
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block">
              Sequência Atual
            </span>
            <span className="font-serif text-2xl font-bold text-[#F5E8C7] flex items-center justify-center gap-1.5 mt-0.5">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
              {user?.streakDays || 18} dias
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-[11px] text-[#F5EFE6]/70 uppercase tracking-wider block">
              Tempo de Leitura
            </span>
            <span className="font-serif text-2xl font-bold text-white mt-0.5 block">
              ~{stats?.estimatedHours || 312} horas
            </span>
          </div>
        </div>
      </section>

      {/* 2. XP Progression Section */}
      {user?.levelInfo && (
        <section>
          <XPProgressBar levelInfo={user.levelInfo} />
        </section>
      )}

      {/* 3. Favorite Genres & Authors Analytics */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gêneros */}
        <div className="p-6 rounded-3xl bg-white border border-[#EADFD0] shadow-book space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#725E62] font-semibold">
            <Compass className="w-4 h-4 text-[#722F37]" />
            Gêneros Favoritos
          </div>
          <div className="space-y-2.5">
            {stats?.topGenres?.map((g: any, idx: number) => (
              <div key={g.name} className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#2C2224] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#F4EFE6] text-[#722F37] font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {g.name}
                </span>
                <span className="font-semibold text-[#722F37] bg-[#722F37]/10 px-2 py-0.5 rounded-full">
                  {g.count} obras
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Autores */}
        <div className="p-6 rounded-3xl bg-white border border-[#EADFD0] shadow-book space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#725E62] font-semibold">
            <BookOpen className="w-4 h-4 text-[#722F37]" />
            Autores Mais Lidos
          </div>
          <div className="space-y-2.5">
            {stats?.topAuthors?.map((a: any, idx: number) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#2C2224] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#F4EFE6] text-[#722F37] font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {a.name}
                </span>
                <span className="font-semibold text-[#722F37] bg-[#722F37]/10 px-2 py-0.5 rounded-full">
                  {a.count} obras
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Conquistas Desbloqueadas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold">
              Galeria de Honra
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#2C2224]">
              Conquistas Desbloqueadas ({achievements.length})
            </h2>
          </div>
          <Link href="/conquistas" className="text-xs font-semibold text-[#722F37] hover:underline">
            Ver todas as conquistas →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((ach: any) => (
            <AchievementCard
              key={ach.id}
              id={ach.id}
              title={ach.title}
              description={ach.description}
              icon={ach.icon}
              badgeLevel={ach.badgeLevel}
              xpReward={ach.xpReward}
              unlocked={true}
              unlockedAt={ach.unlockedAt}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
