'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, BookOpen, Headphones, Download, ArrowRight, Search, Sparkles } from 'lucide-react';

interface GenreItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  booksCount: number;
}

const GENRE_EMOJIS: Record<string, string> = {
  romance: '🌹',
  fantasia: '🐉',
  'ficcao-cientifica': '🚀',
  misterio: '🔍',
  terror: '🕯️',
  historia: '🏛️',
  filosofia: '📜',
  direito: '⚖️',
  classicos: '👑',
  poesia: '🪶',
  drama: '🎭',
  aventura: '🗺️',
  biografia: '🖋️',
  ensaios: '📖',
  sociologia: '🌐',
  psicologia: '🧠',
  ciencia: '🔬',
  tecnologia: '💻',
  politica: '🏛️',
  religiao: '🕊️',
  mitologia: '⚡',
  cronicas: '☕',
  contos: '📚',
  artes: '🎨',
  infantojuvenil: '🎈',
  infantil: '🧸',
  audiolivros: '🎧',
};

export default function ExplorePage() {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/genres')
      .then((r) => r.json())
      .then((data) => {
        if (data.genres) {
          setGenres(data.genres);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredGenres = genres.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10 animate-fadeIn">
      {/* Header Banner */}
      <section className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-[#FAF8F5] via-[#F4EFE6] to-[#EADFD0] border border-[#EADFD0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            Navegação por Gêneros & Categorias
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#2C2224]">
            Explore o Acervo Universal
          </h1>
          <p className="text-sm md:text-base text-[#725E62] leading-relaxed">
            Descubra obras clássicas, ensaios imortais, poesia e audiolivros organizados por categorias normalizadas entre 8 bibliotecas digitais abertas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Link
            href="/buscar?hasAudiobook=true"
            className="px-5 py-3 rounded-2xl bg-purple-900 hover:bg-purple-950 text-purple-100 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            <Headphones className="w-4 h-4 text-purple-300" />
            Ver Audiolivros
          </Link>
          <Link
            href="/buscar?publicDomainOnly=true"
            className="px-5 py-3 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            Downloads em Domínio Público
          </Link>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#725E62]" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar gêneros e categorias..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#EADFD0] text-sm text-[#2C2224] placeholder-[#725E62] focus:outline-none focus:ring-2 focus:ring-[#722F37]/30"
        />
      </div>

      {/* Genres Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif text-base text-[#725E62]">Carregando catálogo de categorias...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {filteredGenres.map((g) => {
            const emoji = GENRE_EMOJIS[g.slug] || '📖';
            return (
              <Link
                key={g.id}
                href={`/explorar/${g.slug}`}
                className="group p-6 rounded-3xl bg-white border border-[#EADFD0] hover:border-[#722F37] shadow-book hover:shadow-book-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {emoji}
                    </span>
                    <span className="text-[11px] font-semibold text-[#725E62] bg-[#F4EFE6] px-2.5 py-1 rounded-full border border-[#EADFD0]">
                      {g.booksCount > 0 ? `${g.booksCount} obras` : 'Acervo Aberto'}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#2C2224] group-hover:text-[#722F37] transition-colors">
                    {g.name}
                  </h3>

                  <p className="text-xs text-[#725E62] mt-1.5 leading-relaxed line-clamp-2">
                    {g.description || `Explorar os principais títulos e clássicos universais de ${g.name.toLowerCase()}.`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EADFD0]/60 flex items-center justify-between text-xs font-semibold text-[#722F37]">
                  <span>Ver Obras</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
