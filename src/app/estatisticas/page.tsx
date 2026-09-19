'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Flame, 
  Trophy, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

export default function StatisticsPage() {
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
        <p className="font-serif text-xl">Calculando estatísticas literárias...</p>
      </div>
    );
  }

  const user = data?.user;
  const stats = data?.stats;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-[#722F37]" />
          Métricas e Ritmo de Leitura
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2C2224] mt-1">
          Estatísticas da Leitora
        </h1>
        <p className="text-sm text-[#725E62] mt-1">
          Análise quantitativa e qualitativa da jornada literária de Karolayne.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#EADFD0] shadow-book">
          <span className="text-xs font-semibold text-[#725E62] uppercase tracking-wider block">
            Palavras Exploradas
          </span>
          <span className="font-serif text-2xl md:text-3xl font-bold text-[#722F37] mt-1 block">
            {formatNumberBR(user?.totalWordsRead || 2843521)}
          </span>
          <span className="text-[11px] text-[#725E62] mt-1 block">
            Base para ganho de XP
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EADFD0] shadow-book">
          <span className="text-xs font-semibold text-[#725E62] uppercase tracking-wider block">
            Obras Concluídas
          </span>
          <span className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224] mt-1 block">
            {stats?.completedBooks || 47} livros
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            100% finalizados
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EADFD0] shadow-book">
          <span className="text-xs font-semibold text-[#725E62] uppercase tracking-wider block">
            Sequência Atual
          </span>
          <span className="font-serif text-2xl md:text-3xl font-bold text-[#D4AF37] mt-1 flex items-center gap-1">
            <Flame className="w-6 h-6 fill-[#D4AF37]" />
            {user?.streakDays || 18} dias
          </span>
          <span className="text-[11px] text-[#725E62] mt-1 block">
            Recorde: {user?.longestStreak || 34} dias
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EADFD0] shadow-book">
          <span className="text-xs font-semibold text-[#725E62] uppercase tracking-wider block">
            Tempo Imerso
          </span>
          <span className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224] mt-1 flex items-center gap-1">
            <Clock className="w-5 h-5 text-[#722F37]" />
            ~{stats?.estimatedHours || 312}h
          </span>
          <span className="text-[11px] text-[#725E62] mt-1 block">
            Horas de dedicação
          </span>
        </div>
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por Gêneros */}
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2224] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#722F37]" />
            Preferências Literárias
          </h3>
          <div className="space-y-3">
            {stats?.topGenres?.map((g: any) => {
              const pct = Math.round((g.count / Math.max(1, stats.completedBooks || 10)) * 100);
              return (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#2C2224]">
                    <span>{g.name}</span>
                    <span className="text-[#722F37] font-semibold">{g.count} livros ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#EADFD0]">
                    <div
                      className="h-full bg-gradient-to-r from-[#722F37] to-[#C97D8A] rounded-full"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ritmo e Cadência de Leitura Mensal */}
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2224] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#722F37]" />
            Cadência Mensal Recente
          </h3>
          <p className="text-xs text-[#725E62]">
            Média de 3 a 4 livros concluídos mensalmente, mantendo constância e imersão profunda.
          </p>

          <div className="grid grid-cols-4 gap-3 pt-4 text-center">
            {['Junho', 'Julho', 'Agosto', 'Setembro'].map((m, idx) => {
              const bookCounts = [3, 5, 4, 3];
              return (
                <div key={m} className="p-3 rounded-2xl bg-[#F4EFE6] border border-[#EADFD0]">
                  <span className="text-[10px] text-[#725E62] uppercase tracking-wider block font-semibold">
                    {m}
                  </span>
                  <span className="font-serif text-xl font-bold text-[#722F37] mt-1 block">
                    {bookCounts[idx]}
                  </span>
                  <span className="text-[10px] text-[#725E62] mt-0.5 block">
                    livros
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
