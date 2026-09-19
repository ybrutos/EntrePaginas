'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Crown, Sparkles, BookOpen, User, Flame, Shield } from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

interface RankingUser {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  totalXP: number;
  readingXP: number;
  listeningXP: number;
  totalWordsRead: number;
  streakDays: number;
  levelInfo: {
    level: number;
    title: string;
  };
  completedBooks: number;
  rank: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ranking')
      .then((r) => r.json())
      .then((data) => {
        if (data.ranking) {
          setRanking(data.ranking);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  const topThree = ranking.slice(0, 3);
  const remaining = ranking.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10 animate-fadeIn">
      {/* Header Banner */}
      <section className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-[#722F37] via-[#581825] to-[#2D0E14] text-white overflow-hidden shadow-book relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F5E8C7] text-xs font-semibold uppercase tracking-wider border border-white/10">
            <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
            Hall da Leitura • Gamificação
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-white">
            Classificação da Comunidade
          </h1>
          <p className="text-sm md:text-base text-[#F5EFE6]/90 leading-relaxed font-normal">
            Celebramos a constância e o amor pelos livros. 1 palavra lida = 1 XP. O ranking é 100% opcional e respeita a privacidade de cada leitor.
          </p>
          <div className="pt-2">
            <Link
              href="/perfil"
              className="text-xs text-[#F5E8C7] hover:underline flex items-center gap-1 font-semibold"
            >
              ⚙️ Gerenciar minha visibilidade no ranking nas configurações de perfil →
            </Link>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif text-base text-[#725E62]">Carregando os guardiões das palavras...</p>
        </div>
      ) : ranking.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EADFD0] space-y-3">
          <Shield className="w-12 h-12 text-[#722F37]/50 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-[#2C2224]">Nenhum leitor público no momento</h3>
          <p className="text-xs text-[#725E62] max-w-md mx-auto">
            Seja o primeiro a marcar presença no ranking ativando a opção em seu perfil!
          </p>
          <Link
            href="/perfil"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
          >
            Configurar Meu Perfil
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4">
              {topThree.map((user, idx) => {
                const podiumColors = [
                  'border-amber-400 bg-gradient-to-b from-amber-50/60 to-white shadow-glow-gold', // 1st
                  'border-slate-300 bg-gradient-to-b from-slate-50/60 to-white shadow-sm', // 2nd
                  'border-amber-700/40 bg-gradient-to-b from-amber-50/30 to-white shadow-sm', // 3rd
                ];
                const badgeIcons = [
                  <Crown key="1" className="w-6 h-6 text-amber-500" />,
                  <Medal key="2" className="w-6 h-6 text-slate-400" />,
                  <Medal key="3" className="w-6 h-6 text-amber-700" />,
                ];

                return (
                  <div
                    key={user.id}
                    className={`p-6 rounded-3xl border-2 ${podiumColors[idx]} flex flex-col items-center text-center relative transition-transform hover:-translate-y-1`}
                  >
                    <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-white border shadow-sm text-xs font-bold flex items-center gap-1 text-[#2C2224]">
                      {badgeIcons[idx]}
                      <span>#{user.rank} Lugar</span>
                    </div>

                    <div className="w-20 h-20 rounded-full bg-[#F4EFE6] border-2 border-[#D4AF37] overflow-hidden mt-3 mb-3 flex items-center justify-center text-[#722F37]">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10" />
                      )}
                    </div>

                    <Link
                      href={`/u/${encodeURIComponent(user.username)}`}
                      className="font-serif text-lg font-bold text-[#2C2224] hover:text-[#722F37] transition-colors"
                    >
                      {user.name}
                    </Link>
                    <span className="text-xs text-[#725E62]">@{user.username}</span>

                    <div className="mt-3 px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-xs font-semibold">
                      Nível {user.levelInfo.level} • {user.levelInfo.title}
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-[#EADFD0] text-xs">
                      <div>
                        <span className="text-[#725E62] block">XP Total</span>
                        <span className="font-bold text-[#722F37] text-sm">
                          {formatNumberBR(user.totalXP)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#725E62] block">Lidos</span>
                        <span className="font-bold text-[#2C2224] text-sm">
                          {user.completedBooks} livros
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-[#EADFD0] shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-[#EADFD0] flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[#2C2224] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                Tabela Completa de Classificação
              </h2>
              <span className="text-xs text-[#725E62]">
                {ranking.length} leitores ativos no ranking
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EADFD0] text-[#725E62] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5 text-center w-16">Posição</th>
                    <th className="px-4 py-3.5">Leitor</th>
                    <th className="px-4 py-3.5">Nível</th>
                    <th className="px-4 py-3.5 text-right">Palavras Lidas</th>
                    <th className="px-4 py-3.5 text-right">Livros Concluídos</th>
                    <th className="px-5 py-3.5 text-right">XP Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADFD0]">
                  {ranking.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="px-5 py-4 text-center font-bold text-[#2C2224]">
                        {user.rank <= 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#8B6E13]">
                            {user.rank}
                          </span>
                        ) : (
                          `#${user.rank}`
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EADFD0] overflow-hidden flex items-center justify-center text-[#722F37] flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/u/${encodeURIComponent(user.username)}`}
                              className="font-bold text-[#2C2224] hover:text-[#722F37] transition-colors block text-sm"
                            >
                              {user.name}
                            </Link>
                            <span className="text-[11px] text-[#725E62]">@{user.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-[#2C2224]">
                          Nv. {user.levelInfo.level}
                        </span>{' '}
                        <span className="text-[#725E62]">({user.levelInfo.title})</span>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-[#725E62]">
                        {formatNumberBR(user.totalWordsRead)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-[#2C2224]">
                        {user.completedBooks}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-[#722F37] text-sm">
                        {formatNumberBR(user.totalXP)} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
