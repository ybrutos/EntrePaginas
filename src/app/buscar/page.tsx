'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  X, 
  Sparkles, 
  BookOpen, 
  RefreshCw,
  Headphones,
  Download,
  Layers,
  Globe2,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import BookCard from '@/components/books/BookCard';
import { UnifiedBook } from '@/lib/providers/book-provider.interface';

export const dynamic = 'force-dynamic';

const GENRES = [
  'Todos',
  'Romance',
  'Clássicos',
  'Fantasia',
  'Ficção científica',
  'Mistério',
  'Terror',
  'História',
  'Filosofia',
  'Direito',
  'Poesia',
  'Drama',
  'Aventura',
  'Biografia',
  'Ciência',
  'Tecnologia',
  'Audiolivros',
];

const PROVIDERS_LIST = [
  { id: 'all', label: '🏛️ Todas as 14 Fontes Globais' },
  { id: 'openlibrary', label: 'Open Library' },
  { id: 'gutenberg', label: 'Project Gutenberg' },
  { id: 'standard_ebooks', label: 'Standard Ebooks' },
  { id: 'librivox', label: 'LibriVox (Audiolivros)' },
  { id: 'internet_archive', label: 'Internet Archive' },
  { id: 'google_books', label: 'Google Books' },
  { id: 'overdrive', label: 'OverDrive / Libby (Bibliotecas)' },
  { id: 'worldcat', label: 'WorldCat (OCLC)' },
  { id: 'hathitrust', label: 'HathiTrust Digital Library' },
  { id: 'europeana', label: 'Europeana Collections' },
  { id: 'wikisource', label: 'Wikisource (PT/Multi)' },
  { id: 'doab', label: 'DOAB (Open Access Books)' },
  { id: 'oapen', label: 'OAPEN Library' },
  { id: 'scielo_books', label: 'SciELO Livros (Brasil)' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || 'Todos';
  const initialPublicDomain = searchParams.get('publicDomainOnly') === 'true';
  const initialAudiobook = searchParams.get('hasAudiobook') === 'true';

  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [genre, setGenre] = useState(initialGenre);
  const [publicDomainOnly, setPublicDomainOnly] = useState(initialPublicDomain);
  const [hasAudiobookOnly, setHasAudiobookOnly] = useState(initialAudiobook);
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [source, setSource] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'title' | 'author' | 'year' | 'sources'>('relevance');

  const [books, setBooks] = useState<UnifiedBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [activeSourcesCount, setActiveSourcesCount] = useState(14);
  const [sourcesOverview, setSourcesOverview] = useState<{
    totalQueried: number;
    responded: number;
    failed: number;
    configRequired: number;
  } | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);

  // Debounce do termo de busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  // Executa busca
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const searchTerm = debouncedQuery.trim() || 'Machado de Assis';
      params.set('q', searchTerm);

      if (genre !== 'Todos') params.set('genre', genre);
      if (publicDomainOnly) params.set('publicDomainOnly', 'true');
      if (hasAudiobookOnly) params.set('hasAudiobook', 'true');
      if (source !== 'all') params.set('provider', source);
      if (selectedLanguage !== 'ALL') params.set('language', selectedLanguage);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let items: UnifiedBook[] = data.items || [];

        if (data.sourcesOverview) {
          setSourcesOverview(data.sourcesOverview);
        }
        if (data.expandedQueries) {
          setExpandedVariants(data.expandedQueries);
        }

        // Filtro de formato no client
        if (selectedFormat === 'EPUB') {
          items = items.filter((b) =>
            b.downloadOptions?.some((d) => d.format?.toUpperCase() === 'EPUB')
          );
        } else if (selectedFormat === 'PDF') {
          items = items.filter((b) =>
            b.downloadOptions?.some((d) => d.format?.toUpperCase() === 'PDF')
          );
        } else if (selectedFormat === 'AUDIOBOOK') {
          items = items.filter((b) => b.hasAudiobook || Boolean(b.audiobookDetails));
        }

        // Ordenação
        if (sortBy === 'title') {
          items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortBy === 'author') {
          items.sort((a, b) => (a.authors?.[0] || '').localeCompare(b.authors?.[0] || ''));
        } else if (sortBy === 'year') {
          items.sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));
        } else if (sortBy === 'sources') {
          items.sort((a, b) => (b.sourcesCount || b.sources?.length || 1) - (a.sourcesCount || a.sources?.length || 1));
        }

        // Contagem de provedores únicos presentes nos resultados
        const uniqueSources = new Set<string>();
        for (const item of items) {
          if (item.sources) {
            for (const s of item.sources) {
              uniqueSources.add(s.sourceName);
            }
          }
        }

        setBooks(items);
        setTotalFound(items.length);
        setActiveSourcesCount(uniqueSources.size || 8);
      }
    } catch (e) {
      console.error('Erro ao buscar:', e);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, genre, publicDomainOnly, hasAudiobookOnly, selectedFormat, selectedLanguage, source, sortBy]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Motor Global de Descoberta Literária • V2
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2C2224]">
          Explorar Livros & Fontes Legítimas
        </h1>
        <p className="text-sm text-[#725E62] mt-1 max-w-2xl leading-relaxed">
          Pesquise de uma só vez em 14 fontes legítimas nacionais e internacionais: bibliotecas públicas, acervos acadêmicos e repositórios em domínio público.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-[#725E62]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 O que você quer ler? (Ex: O massacre da família Hope, The Only One Left, Dom Casmurro, ISBN...)"
          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-[#EADFD0] text-[#2C2224] placeholder-[#A69B9E] text-base focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] shadow-sm transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 p-1.5 rounded-full text-[#725E62] hover:bg-[#F4EFE6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Multilingual Expansion Pill suggestions */}
      {expandedVariants.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
          <span className="text-[#725E62] flex items-center gap-1 flex-shrink-0 font-medium">
            <Globe2 className="w-3.5 h-3.5 text-[#722F37]" />
            Busca multilíngue ativa:
          </span>
          {expandedVariants.slice(0, 4).map((variant, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(variant)}
              className="px-2.5 py-1 rounded-lg bg-[#F4EFE6] hover:bg-[#EADFD0] text-[#2C2224] text-[11px] font-semibold border border-[#EADFD0] transition-colors whitespace-nowrap"
            >
              {variant}
            </button>
          ))}
        </div>
      )}

      {/* Genres Horizontal Scroll Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              genre === g
                ? 'bg-[#722F37] text-white shadow-sm'
                : 'bg-white text-[#725E62] border border-[#EADFD0] hover:border-[#C97D8A]'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="p-4 md:p-5 rounded-3xl bg-[#F4EFE6] border border-[#EADFD0] space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Provider Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#725E62] uppercase tracking-wider block mb-1">
              Fonte / Provider
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#EADFD0] text-[#2C2224] focus:outline-none"
            >
              {PROVIDERS_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#725E62] uppercase tracking-wider block mb-1">
              Formato
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#EADFD0] text-[#2C2224] focus:outline-none"
            >
              <option value="ALL">📦 Todos os Formatos</option>
              <option value="EPUB">📥 EPUB (Kindle / E-reader)</option>
              <option value="AUDIOBOOK">🎧 Audiolivro Completo</option>
              <option value="PDF">📄 PDF Original / Acadêmico</option>
            </select>
          </div>

          {/* Language Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#725E62] uppercase tracking-wider block mb-1">
              Idioma
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#EADFD0] text-[#2C2224] focus:outline-none"
            >
              <option value="ALL">🌐 Todos os Idiomas</option>
              <option value="pt">Português (PT/BR)</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
              <option value="fr">Francês</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[11px] font-bold text-[#725E62] uppercase tracking-wider block mb-1">
              Ordenação
            </label>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#EADFD0] text-[#722F37] focus:outline-none"
            >
              <option value="relevance">Mais Relevantes</option>
              <option value="sources">Mais fontes disponíveis</option>
              <option value="title">Título (A-Z)</option>
              <option value="author">Autor (A-Z)</option>
              <option value="year">Ano de Publicação</option>
            </select>
          </div>
        </div>

        {/* Checkboxes Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EADFD0]/80">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2C2224] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publicDomainOnly}
                onChange={(e) => setPublicDomainOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#722F37] focus:ring-[#722F37] accent-[#722F37]"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Apenas Domínio Público / Acesso Aberto</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-[#2C2224] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAudiobookOnly}
                onChange={(e) => setHasAudiobookOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#722F37] focus:ring-[#722F37] accent-[#722F37]"
              />
              <Headphones className="w-3.5 h-3.5 text-purple-700" />
              <span>Apenas com Audiolivro</span>
            </label>
          </div>

          {/* Dynamic multi-source search feedback */}
          <div className="text-xs">
            {isLoading ? (
              <span className="text-[#722F37] font-semibold flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                🔎 Pesquisando em 14 fontes legítimas...
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-[#725E62] font-medium">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#722F37]" />
                  Encontramos <strong className="text-[#2C2224]">{totalFound} obras</strong> em{' '}
                  <strong className="text-[#722F37]">{activeSourcesCount} fontes</strong>.
                </span>

                {/* Transparência das fontes consultadas */}
                {sourcesOverview && (
                  <span className="text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-[#EADFD0] text-[#725E62]">
                    {sourcesOverview.responded} fontes responderam
                    {sourcesOverview.configRequired > 0 && ` · ${sourcesOverview.configRequired} requerem chave`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#725E62] gap-3">
          <RefreshCw className="w-9 h-9 text-[#722F37] animate-spin" />
          <p className="font-serif text-lg text-[#2C2224]">
            Consultando fontes globais e consolidando edições...
          </p>
          <span className="text-xs text-[#725E62] text-center max-w-lg">
            Open Library • Gutenberg • Google Books • LibriVox • Standard Ebooks • Internet Archive • OverDrive • WorldCat • HathiTrust • DOAB • OAPEN • SciELO
          </span>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {books.map((book) => (
            <BookCard key={book.id || book.slug} book={book} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EADFD0] max-w-md mx-auto space-y-3">
          <BookOpen className="w-12 h-12 text-[#C97D8A]/60 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-[#2C2224]">Nenhuma obra encontrada</h3>
          <p className="text-xs text-[#725E62] leading-relaxed">
            Tente buscar com termos mais abrangentes ou remover filtros específicos.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setGenre('Todos');
              setPublicDomainOnly(false);
              setHasAudiobookOnly(false);
              setSelectedFormat('ALL');
              setSelectedLanguage('ALL');
              setSource('all');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
          >
            Limpar Filtros de Busca
          </button>
        </div>
      )}
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#725E62]">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif">Carregando catálogo...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
