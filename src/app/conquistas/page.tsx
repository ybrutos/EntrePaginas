'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Award, CheckCircle2, Lock } from 'lucide-react';
import AchievementCard from '@/components/gamification/AchievementCard';
import { INITIAL_ACHIEVEMENTS, AchievementDefinition } from '@/lib/gamification/achievements';
import { formatNumberBR } from '@/lib/utils/text';

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'books', label: 'Livros Lidos' },
  { id: 'words', label: 'Palavras Exploradas' },
  { id: 'streak', label: 'Sequência & Constância' },
  { id: 'genre', label: 'Exploração de Gêneros' },
];

export default function AchievementsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => {
        if (data.achievements) {
          const map: Record<string, string> = {};
          data.achievements.forEach((a: any) => {
            map[a.id] = a.unlockedAt;
          });
          setUnlockedMap(map);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = INITIAL_ACHIEVEMENTS.filter(
    (a) => activeCategory === 'all' || a.category === activeCategory
  );

  const totalUnlocked = Object.keys(unlockedMap).length;
  const totalAvailable = INITIAL_ACHIEVEMENTS.length;
  const totalXPAvailable = INITIAL_ACHIEVEMENTS.reduce((acc, curr) => acc + curr.xpReward, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#FAF8F5] to-[#F4EFE6] border border-[#EADFD0] shadow-book">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            Sistema de Conquistas & Insígnias
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2C2224] mt-1">
            Galeria de Conquistas
          </h1>
          <p className="text-sm text-[#725E62] mt-1 max-w-xl">
            Desbloqueie marcos literários, conquiste insígnias de bronze a diamante e acumule bônus épicos de XP.
          </p>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto">
          <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
            <span className="text-[10px] text-[#725E62] uppercase tracking-wider block font-semibold">
              Desbloqueadas
            </span>
            <span className="font-serif text-2xl font-bold text-[#722F37] mt-0.5 block">
              {totalUnlocked} / {totalAvailable}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
            <span className="text-[10px] text-[#725E62] uppercase tracking-wider block font-semibold">
              Recompensas Totais
            </span>
            <span className="font-serif text-2xl font-bold text-[#D4AF37] mt-0.5 block">
              +{formatNumberBR(totalXPAvailable)} XP
            </span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              activeCategory === cat.id
                ? 'bg-[#722F37] text-white shadow-sm'
                : 'bg-white text-[#725E62] border border-[#EADFD0] hover:border-[#C97D8A]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((ach) => {
          const isUnlocked = Boolean(unlockedMap[ach.id]);
          const unlockedAt = unlockedMap[ach.id];
          return (
            <AchievementCard
              key={ach.id}
              id={ach.id}
              title={ach.title}
              description={ach.description}
              icon={ach.icon}
              badgeLevel={ach.badgeLevel}
              xpReward={ach.xpReward}
              unlocked={isUnlocked}
              unlockedAt={unlockedAt}
            />
          );
        })}
      </div>
    </div>
  );
}
