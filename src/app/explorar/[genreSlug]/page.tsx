'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Compass, 
  ArrowLeft, 
  Search, 
  SlidersHorizontal, 
  Headphones, 
  Download, 
  BookOpen,
  Layers,
  Sparkles 
} from 'lucide-react';
import BookCard from '@/components/books/BookCard';

const GENRE_LABELS: Record<string, { name: string; emoji: string; desc: string }> = {
  romance: { name: 'Romance', emoji: '🌹', desc: 'Narrativas sobre paixões, relações humanas e os dilemas mais profundos do coração.' },
  fantasia: { name: 'Fantasia', emoji: '🐉', desc: 'Mundos míticos, magia ancestral e aventuras que desafiam a imaginação humana.' },
  'ficcao-cientifica': { name: 'Ficção Científica', emoji: '🚀', desc: 'Futuros possíveis, explorações cósmicas e o impacto do avanço científico na sociedade.' },
  misterio: { name: 'Mistério & Suspense', emoji: '🔍', desc: 'Enigmas insolúveis, crimes intrigantes e deduções afiadas.' },
  terror: { name: 'Terror & Gótico', emoji: '🕯️', desc: 'Obras que exploram o medo, o macabro e as sombras do desconhecido.' },
  historia: { name: 'História', emoji: '🏛️', desc: 'Grandes eventos, biografias e as forças que moldaram as civilizações.' },
  filosofia: { name: 'Filosofia', emoji: '📜', desc: 'Questionamentos sobre a existência, ética, razão e a condição do ser humano.' },
  direito: { name: 'Direito & Justiça', emoji: '⚖️', desc: 'Tratados fundamentais sobre leis, cidadania, justiça e instituições sociais.' },
  classicos: { name: 'Clássicos Universais', emoji: '👑', desc: 'Obras imortais que atravessaram os séculos e moldaram a literatura mundial.' },
  poesia: { name: 'Poesia & Versos', emoji: '🪶', desc: 'A arte das palavras, rima, métrica e as emoções mais sublimes em forma lírica.' },
  audiolivros: { name: 'Audiolivros Narrados', emoji: '🎧', desc: 'Gravações em áudio de clássicos e contos com narração humana e gratuita.' },
};

export default function GenreDetailPage() {
  const params = useParams();
  const genreSlug = (params.genreSlug as string) || '';

  const genreInfo = GENRE_LABELS[genreSlug] || {
    name: genreSlug.charAt(0).toUpperCase() + genreSlug.slice(1).replace('-', ' '),
    emoji: '📖',
    desc: `Catálogo e obras catalogadas na categoria ${genreSlug}.`,
  };

  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [publicDomainOnly, setPublicDomainOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => {
    setIsLoading(true);
    const queryTerm = searchQuery.trim() || genreInfo.name;
    const url = new URL('/api/search', window.location.origin);
    url.searchParams.set('q', queryTerm);
    url.searchParams.set('genre', genreSlug);
    if (selectedProvider !== 'ALL') {
      url.searchParams.set('provider', selectedProvider);
    }
    if (selectedFormat === 'AUDIOBOOK') {
      url.searchParams.set('hasAudiobook', 'true');
    }
    if (publicDomainOnly) {
      url.searchParams.set('publicDomainOnly', 'true');
    }

    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => {
        let items = data.items || [];
        if (selectedFormat === 'EPUB') {
          items = items.filter((b: any) =>
            b.downloadOptions?.some((d: any) => d.format.toUpperCase() === 'EPUB')
          );
        } else if (selectedFormat === 'AUDIOBOOK') {
          items = items.filter((b: any) => b.hasAudiobook || Boolean(b.audiobookDetails));
        }

        // Ordenação
        if (sortBy === 'title') {
          items.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortBy === 'year') {
          items.sort((a: any, b: any) => (b.publicationYear || 0) - (a.publicationYear || 0));
        }

        setBooks(items);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [genreSlug, searchQuery, selectedFormat, selectedProvider, publicDomainOnly, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 animate-fadeIn">
      {/* Back Link */}
      <Link
        href="/explorar"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#725E62] hover:text-[#722F37] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para todos os gêneros
      </Link>

      {/* Hero Category Banner */}
      <section className="p-6 md:p-10 rounded-3xl bg-white border border-[#EADFD0] shadow-book flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-[#F4EFE6] border border-[#EADFD0] flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
            {genreInfo.emoji}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#722F37]/10 text-[#722F37] text-[11px] font-bold uppercase tracking-wider mb-1">
              Gênero Literário
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2C2224]">
              {genreInfo.name}
            </h1>
            <p className="text-xs md:text-sm text-[#725E62] mt-1 max-w-xl leading-relaxed">
              {genreInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-[#EADFD0]">
          <span className="text-xs text-[#725E62]">Resultados agregados</span>
          <span className="font-serif text-2xl font-bold text-[#722F37]">
            {books.length} {books.length === 1 ? 'obra' : 'obras'}
          </span>
        </div>
      </section>

      {/* Controls & Filter Bar */}
      <div className="p-4 md:p-6 rounded-3xl bg-[#FAF8F5] border border-[#EADFD0] space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#725E62]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Pesquisar livros em ${genreInfo.name}...`}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-[#EADFD0] text-xs md:text-sm text-[#2C2224] placeholder-[#725E62] focus:outline-none focus:ring-2 focus:ring-[#722F37]/30"
            />
          </div>

          {/* Formato Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#EADFD0] text-xs font-semibold text-[#2C2224] focus:outline-none"
            >
              <option value="ALL">📦 Todos os Formatos</option>
              <option value="EPUB">📥 EPUB / Ebook</option>
              <option value="AUDIOBOOK">🎧 Audiolivro</option>
            </select>
          </div>

          {/* Fonte / Provider Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#EADFD0] text-xs font-semibold text-[#2C2224] focus:outline-none"
            >
              <option value="ALL">🏛️ Todas as Fontes</option>
              <option value="gutenberg">Project Gutenberg</option>
              <option value="openlibrary">Open Library</option>
              <option value="librivox">LibriVox</option>
              <option value="standardebooks">Standard Ebooks</option>
              <option value="internetarchive">Internet Archive</option>
              <option value="wikisource">Wikisource</option>
              <option value="googlebooks">Google Books</option>
              <option value="europeana">Europeana</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EADFD0]/70 text-xs">
          <label className="flex items-center gap-2 text-[#725E62] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={publicDomainOnly}
              onChange={(e) => setPublicDomainOnly(e.target.checked)}
              className="rounded text-[#722F37] focus:ring-[#722F37]"
            />
            <span>Apenas Domínio Público / Acesso Livre</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[#725E62]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#EADFD0] text-xs text-[#2C2224]"
            >
              <option value="relevance">Relevância</option>
              <option value="title">Título (A-Z)</option>
              <option value="year">Mais recentes primeiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Results Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif text-base text-[#725E62]">
            Consultando bibliotecas para {genreInfo.name}...
          </p>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {books.map((book) => (
            <BookCard key={book.id || book.slug} book={book} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#EADFD0] p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-[#722F37]/40 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-[#2C2224]">Nenhuma obra encontrada</h3>
          <p className="text-xs text-[#725E62] max-w-md mx-auto">
            Tente remover alguns filtros ou buscar por outro termo nesta categoria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFormat('ALL');
              setSelectedProvider('ALL');
              setPublicDomainOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
