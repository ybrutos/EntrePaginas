'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  User, 
  Lock, 
  Sparkles, 
  Trophy, 
  BookOpen, 
  Headphones, 
  Flame, 
  ArrowLeft,
  Calendar,
  Layers
} from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

export default function PublicUserProfilePage() {
  const params = useParams();
  const username = (params.username as string) || '';

  const [profileData, setProfileData] = useState<any>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setIsLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.isPrivate) {
          setIsPrivate(true);
          setProfileData(data.user);
        } else {
          setIsPrivate(false);
          setProfileData(data.user);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, [username]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-serif text-base text-[#725E62]">Localizando leitor...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#F4EFE6] flex items-center justify-center mx-auto text-[#725E62]">
          <User className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#2C2224]">Leitor não encontrado</h2>
        <p className="text-xs text-[#725E62]">Nenhum usuário cadastrado com @{username}.</p>
        <Link
          href="/"
          className="inline-block px-5 py-2 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500 border border-stone-200">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#2C2224]">
          {profileData?.name || username}
        </h2>
        <p className="text-xs text-[#725E62]">@{username}</p>
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADFD0] text-xs text-[#725E62] max-w-sm mx-auto leading-relaxed">
          🔒 Este perfil é privado. O leitor optou por manter suas leituras e estatísticas reservadas.
        </div>
        <Link
          href="/ranking"
          className="inline-flex items-center gap-1.5 text-xs text-[#722F37] font-semibold hover:underline pt-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Ranking
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 animate-fadeIn">
      {/* Back Link */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#725E62] hover:text-[#722F37] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à classificação
      </Link>

      {/* Header Profile Card */}
      <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-[#F4EFE6] border-2 border-[#D4AF37] overflow-hidden flex items-center justify-center text-[#722F37] flex-shrink-0 shadow-md">
          {profileData.avatarUrl ? (
            <img src={profileData.avatarUrl} alt={profileData.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
                {profileData.name}
              </h1>
              <span className="text-xs text-[#725E62]">@{profileData.username}</span>
            </div>

            <span className="inline-flex items-center gap-1 self-center sm:self-auto px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-xs font-semibold">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              Nível {profileData.levelInfo?.level || 1} • {profileData.levelInfo?.title || 'Leitor'}
            </span>
          </div>

          {profileData.bio && (
            <p className="text-xs md:text-sm text-[#725E62] leading-relaxed pt-1">
              {profileData.bio}
            </p>
          )}

          {profileData.createdAt && (
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-[#725E62] pt-1">
              <Calendar className="w-3.5 h-3.5" />
              Membro da biblioteca desde {new Date(profileData.createdAt).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
          <span className="text-[11px] text-[#725E62] block">XP Total</span>
          <span className="font-serif text-xl font-bold text-[#722F37] mt-0.5 block">
            {formatNumberBR(profileData.totalXP)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
          <span className="text-[11px] text-[#725E62] block">Livros Lidos</span>
          <span className="font-serif text-xl font-bold text-[#2C2224] mt-0.5 block">
            {profileData.completedBooksCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
          <span className="text-[11px] text-[#725E62] block">Palavras Lidas</span>
          <span className="font-serif text-xl font-bold text-[#2C2224] mt-0.5 block">
            {formatNumberBR(profileData.totalWordsRead)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm text-center">
          <span className="text-[11px] text-[#725E62] block">Sequência</span>
          <span className="font-serif text-xl font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
            <Flame className="w-4 h-4 fill-amber-500" />
            {profileData.streakDays} dias
          </span>
        </div>
      </section>

      {/* Favorite Genres */}
      {profileData.favoriteGenres && profileData.favoriteGenres.length > 0 && (
        <section className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#EADFD0] space-y-3">
          <h2 className="font-serif text-base font-bold text-[#2C2224] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#722F37]" />
            Gêneros Favoritos
          </h2>
          <div className="flex flex-wrap gap-2">
            {profileData.favoriteGenres.map((g: any) => (
              <span
                key={g.name}
                className="px-3 py-1 rounded-full bg-white border border-[#EADFD0] text-xs font-semibold text-[#722F37] shadow-sm"
              >
                {g.name} ({g.count} {g.count === 1 ? 'livro' : 'livros'})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Public Achievements */}
      {profileData.achievements && profileData.achievements.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2C2224] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            Conquistas Públicas ({profileData.achievements.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {profileData.achievements.map((ach: any) => (
              <div
                key={ach.id}
                className="p-4 rounded-2xl bg-white border border-[#EADFD0] shadow-sm flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4EFE6] border border-[#D4AF37]/40 flex items-center justify-center text-lg flex-shrink-0">
                  {ach.icon || '🏆'}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs text-[#2C2224]">{ach.title}</h3>
                  <p className="text-[10px] text-[#725E62] mt-0.5 line-clamp-2 leading-tight">
                    {ach.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Books */}
      {profileData.completedBooks && profileData.completedBooks.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#2C2224] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#722F37]" />
            Obras Concluídas Recentes
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {profileData.completedBooks.map((b: any) => (
              <Link
                key={b.id}
                href={`/livro/${encodeURIComponent(b.id)}`}
                className="group rounded-2xl border border-[#EADFD0] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-[2/3] bg-[#F4EFE6] overflow-hidden flex items-center justify-center">
                  {b.coverUrl ? (
                    <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <BookOpen className="w-8 h-8 text-[#722F37]/50" />
                  )}
                </div>
                <div className="p-2.5">
                  <span className="font-serif text-xs font-bold text-[#2C2224] line-clamp-1 group-hover:text-[#722F37]">
                    {b.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
