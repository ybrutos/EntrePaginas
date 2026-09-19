'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Download, 
  Heart, 
  Bookmark, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  FileText,
  AlertCircle,
  Headphones,
  CheckCircle2,
  XCircle,
  Layers,
  Globe2,
  Calendar,
  Building,
  ShoppingCart,
  BookCopy,
  Clock,
  Lock
} from 'lucide-react';
import AudiobookPlayer from '@/components/audio/AudiobookPlayer';
import ProgressModal from '@/components/books/ProgressModal';
import { formatNumberBR } from '@/lib/utils/text';
import confetti from 'canvas-confetti';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [bookData, setBookData] = useState<any>(null);
  const [userState, setUserState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'overview' | 'editions' | 'sources'>('overview');

  // Modal de progresso
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const fetchBookDetails = () => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/books/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Livro não encontrado');
        return r.json();
      })
      .then((data) => {
        setBookData(data.book);
        setUserState(data.userState);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const handleUpdateLibrary = async (status: string, isFav?: boolean) => {
    if (!bookData) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookData,
          status: status || userState?.status || 'LENDO',
          isFavorite: typeof isFav === 'boolean' ? isFav : userState?.isFavorite || false,
        }),
      });

      if (res.ok) {
        setSaveMessage('Estante atualizada com sucesso!');
        fetchBookDetails();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-[#725E62]">
        <div className="w-12 h-12 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-xl">Consultando catálogo global e edições...</p>
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2C2224]">Obra não encontrada</h2>
        <p className="text-sm text-[#725E62]">Não foi possível localizar os registros para este identificador.</p>
        <Link
          href="/buscar"
          className="inline-block px-6 py-2.5 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
        >
          Voltar para a Busca
        </Link>
      </div>
    );
  }

  const work = bookData.workRecord;
  const editions = work?.editions || [];
  const accessLinks = work?.accessLinks || [];
  const audiobooks = work?.audiobooks || [];
  const aliases = work?.aliases || [];

  const hasLegalDownloads = bookData.downloadOptions && bookData.downloadOptions.length > 0;
  const primaryAuthor = Array.isArray(bookData.authors) ? bookData.authors.join(', ') : 'Autor Desconhecido';
  const htmlRead = bookData.downloadOptions?.find((d: any) => d.format?.toUpperCase() === 'HTML');
  
  // Agrupar downloads e formatos compatíveis
  const kindleFormats = ['EPUB', 'MOBI', 'AZW3', 'PDF'];
  const availableDownloads = bookData.downloads
    ?.filter((d: any) => d.url && d.format && !d.format.toUpperCase().includes('AUDIO') && !d.format.toUpperCase().includes('MP3'))
    .map((d: any) => {
      const fmtUpper = d.format.toUpperCase();
      const detectedKindle = kindleFormats.find(kf => fmtUpper.includes(kf));
      return {
        ...d,
        isKindle: !!detectedKindle,
        displayFormat: detectedKindle || d.format,
        sourceName: d.source || 'Fonte Externa'
      };
    })
    .reduce((acc: any[], current: any) => {
      // Diferencia por formato e fonte para não perder downloads do mesmo formato de fontes diferentes
      const uniqueKey = `${current.displayFormat}-${current.sourceName}`;
      if (!acc.find((item: any) => `${item.displayFormat}-${item.sourceName}` === uniqueKey)) {
        acc.push(current);
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => {
      if (a.isKindle && !b.isKindle) return -1;
      if (!a.isKindle && b.isKindle) return 1;
      return kindleFormats.indexOf(a.displayFormat) - kindleFormats.indexOf(b.displayFormat);
    }) || [];

  const audioOption = bookData.downloadOptions?.find((d: any) => d.format?.toUpperCase() === 'AUDIOBOOK' || d.format?.toUpperCase() === 'MP3') || bookData.audioOptions?.[0];
  const audioUrl = audioOption?.audioStreamingUrl || audioOption?.url || bookData.audiobookDetails?.streamUrl;
  const hasAudiobook = Boolean(bookData.hasAudiobook || audioUrl || bookData.audiobookDetails || audiobooks.length > 0);

  // Idiomas representados
  const languagesList = Array.from(new Set(editions.map((e: any) => e.language).filter(Boolean))) as string[];

  // Formatação de data/hora
  const formatVerifiedDate = (d?: string | Date) => {
    const dateObj = d ? new Date(d) : new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const getFlagForLang = (lang?: string) => {
    if (!lang) return '🌐';
    const l = lang.toLowerCase();
    if (l.includes('pt') || l === 'por') return '🇧🇷';
    if (l.includes('en') || l === 'eng') return '🇺🇸';
    if (l.includes('es') || l === 'spa') return '🇪🇸';
    if (l.includes('fr') || l === 'fra') return '🇫🇷';
    if (l.includes('de') || l === 'deu') return '🇩🇪';
    if (l.includes('it') || l === 'ita') return '🇮🇹';
    return '🌐';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#725E62] hover:text-[#2C2224] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Busca
      </button>

      {/* Main Book Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        {/* Left Column: Cover & Primary Actions */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          <div className="relative aspect-[2/3] w-full rounded-3xl bg-[#F4EFE6] overflow-hidden shadow-book border border-[#EADFD0] flex items-center justify-center">
            {bookData.coverUrl ? (
              <img
                src={bookData.coverUrl}
                alt={bookData.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[#722F37]">
                <BookOpen className="w-16 h-16 stroke-[1.25] mb-3 opacity-60" />
                <span className="font-serif text-lg font-bold text-[#2C2224] leading-snug">
                  {bookData.title}
                </span>
              </div>
            )}

            {bookData.isPublicDomain && (
              <span className="absolute top-4 left-4 bg-[#1B4D3E]/90 text-white text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                Domínio Público
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-2.5">
            {/* Ler Online / No Navegador */}
            {htmlRead ? (
              <a
                href={htmlRead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                <BookOpen className="w-4 h-4" />
                <span>📖 Ler Online (Fonte Legal)</span>
              </a>
            ) : (
              <button
                onClick={() => handleUpdateLibrary('LENDO')}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                <BookOpen className="w-4 h-4" />
                <span>Iniciar Leitura na Estante</span>
              </button>
            )}

            {availableDownloads.length > 0 ? availableDownloads.map((dl: any, idx: number) => {
              const proxiedUrl = dl.isKindle 
                ? `/api/download?url=${encodeURIComponent(dl.url)}&format=${encodeURIComponent(dl.format)}&title=${encodeURIComponent(bookData.title)}`
                : dl.url;

              return (
                <a
                  key={idx}
                  href={proxiedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 border transition-colors ${
                    dl.isKindle 
                      ? 'bg-[#F4EFE6] hover:bg-[#EADFD0] text-[#2C2224] border-[#EADFD0]' 
                      : 'bg-white hover:bg-gray-50 text-[#725E62] border-gray-200'
                  }`}
                >
                  {dl.isKindle ? <Download className="w-4 h-4 text-[#722F37]" /> : <ExternalLink className="w-4 h-4 text-[#725E62]" />}
                  <span>
                    {dl.isKindle ? `⬇️ Baixar ${dl.displayFormat} (${dl.sourceName})` : `🌐 Acessar Fonte (${dl.displayFormat})`}
                  </span>
                </a>
              );
            }) : (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-[#F4EFE6]/50 border border-[#EADFD0]/50 flex items-center justify-center text-center">
                <span className="text-xs font-medium text-[#725E62]">
                  Nenhum arquivo digital disponível para download gratuito no momento.
                </span>
              </div>
            )}

            {/* Favorite & Shelf Toggle Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleUpdateLibrary(userState?.status || 'LENDO', !userState?.isFavorite)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  userState?.isFavorite
                    ? 'bg-[#722F37]/10 border-[#722F37] text-[#722F37]'
                    : 'bg-white border-[#EADFD0] text-[#725E62] hover:text-[#2C2224]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${userState?.isFavorite ? 'fill-[#722F37]' : ''}`} />
                {userState?.isFavorite ? 'Favoritado' : 'Favoritar'}
              </button>

              <button
                onClick={() => handleUpdateLibrary('QUERO_LER')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  userState?.status === 'QUERO_LER'
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#8B6E13]'
                    : 'bg-white border-[#EADFD0] text-[#725E62] hover:text-[#2C2224]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Quero Ler
              </button>
            </div>

            {/* Atualizar Progresso */}
            {userState && (
              <button
                onClick={() => setIsProgressModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37]/15 to-[#C97D8A]/15 border border-[#D4AF37]/40 text-[#722F37] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#D4AF37]/25 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Atualizar Progresso ({userState.progressPercent || 0}%)</span>
              </button>
            )}

            {saveMessage && (
              <p className="text-xs text-center text-emerald-700 font-semibold animate-pulse">
                {saveMessage}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Work Hierarchy & Navigation Tabs */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {bookData.genres?.map((g: string) => (
                <span
                  key={g}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F4EFE6] text-[#722F37] border border-[#EADFD0]"
                >
                  {g}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#2C2224] leading-tight">
              {bookData.title}
            </h1>

            {/* Aliases e Títulos Traduzidos */}
            {aliases.length > 0 && (
              <div className="mt-2 space-y-1">
                {aliases.map((al: any, idx: number) => (
                  <p key={idx} className="text-sm text-[#725E62] italic">
                    <span className="font-semibold text-[#722F37]">
                      {al.aliasType === 'ORIGINAL_TITLE' ? 'Título Original: ' : 'Também publicado como: '}
                    </span>
                    {al.title} {al.language && `(${al.language.toUpperCase()})`}
                  </p>
                ))}
              </div>
            )}

            <p className="text-base font-semibold text-[#722F37] mt-3">
              Por <span className="underline decoration-[#C97D8A] underline-offset-4">{primaryAuthor}</span>
            </p>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex items-center gap-3 border-b border-[#EADFD0] pb-2 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-[#722F37] border-b-2 border-[#722F37]'
                  : 'text-[#725E62] hover:text-[#2C2224]'
              }`}
            >
              📖 Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('editions')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'editions'
                  ? 'text-[#722F37] border-b-2 border-[#722F37]'
                  : 'text-[#725E62] hover:text-[#2C2224]'
              }`}
            >
              <span>📚 Edições Descobertas</span>
              <span className="text-xs px-2 py-0.2 rounded-full bg-[#F4EFE6] text-[#722F37]">
                {editions.length || 1}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'sources'
                  ? 'text-[#722F37] border-b-2 border-[#722F37]'
                  : 'text-[#725E62] hover:text-[#2C2224]'
              }`}
            >
              <span>🏛️ Fontes & Acesso</span>
              <span className="text-xs px-2 py-0.2 rounded-full bg-[#F4EFE6] text-[#722F37]">
                {bookData.sources?.length || 1}
              </span>
            </button>
          </div>

          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Sinopse */}
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-[#2C2224]">Sinopse & Contexto</h3>
                <p className="text-sm text-[#725E62] leading-relaxed whitespace-pre-line">
                  {bookData.description || 'Nenhuma descrição detalhada catalogada para esta edição.'}
                </p>
              </div>

              {/* Legal Status Notice */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                bookData.isPublicDomain 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}>
                {bookData.isPublicDomain ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {bookData.isPublicDomain ? 'Acesso Aberto / Domínio Público' : 'Informações Bibliográficas & Disponibilidade'}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    {bookData.license || (bookData.isPublicDomain 
                      ? 'Esta obra pertence ao patrimônio cultural universal em domínio público. Downloads e leitura integral disponíveis gratuitamente de forma 100% legal.'
                      : 'Informações do livro disponíveis. Acesso condicionado aos direitos autorais da respectiva editora ou plataforma.')}
                  </p>
                </div>
              </div>

              {/* Metadata Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 rounded-2xl bg-[#F4EFE6] border border-[#EADFD0] text-xs">
                <div>
                  <span className="text-[#725E62] block font-medium">Idiomas</span>
                  <span className="font-semibold text-[#2C2224] mt-0.5 block">
                    {languagesList.length > 0 ? languagesList.map((l) => l.toUpperCase()).join(', ') : bookData.language?.toUpperCase() || 'PT'}
                  </span>
                </div>
                <div>
                  <span className="text-[#725E62] block font-medium">Publicação Canônica</span>
                  <span className="font-semibold text-[#2C2224] mt-0.5 block">
                    {work?.firstPublicationYear || bookData.publicationYear || 'Clássico'}
                  </span>
                </div>
                <div>
                  <span className="text-[#725E62] block font-medium">Páginas Estimadas</span>
                  <span className="font-semibold text-[#2C2224] mt-0.5 block">
                    {bookData.pageCount ? `${bookData.pageCount} páginas` : 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[#725E62] block font-medium">Contagem de Palavras</span>
                  <span className="font-semibold text-[#722F37] mt-0.5 block">
                    {bookData.estimatedWords ? `${formatNumberBR(bookData.estimatedWords)} palavras` : 'Sob demanda'}
                  </span>
                </div>
                <div>
                  <span className="text-[#725E62] block font-medium">ISBN</span>
                  <span className="font-semibold text-[#2C2224] mt-0.5 block">
                    {bookData.isbn || 'Edição Livre'}
                  </span>
                </div>
                <div>
                  <span className="text-[#725E62] block font-medium">Editora</span>
                  <span className="font-semibold text-[#2C2224] mt-0.5 block truncate">
                    {bookData.publisher || 'Domínio Público'}
                  </span>
                </div>
              </div>

              {/* Audiolivro Integrado */}
              {hasAudiobook && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-purple-700" />
                    <h3 className="font-serif text-lg font-bold text-[#2C2224]">
                      Audiolivro Integrado (Domínio Público)
                    </h3>
                  </div>
                  <AudiobookPlayer
                    bookTitle={bookData.title}
                    author={primaryAuthor}
                    coverUrl={bookData.coverUrl}
                    audioUrl={
                      audioUrl ||
                      'https://ia800301.us.archive.org/14/items/dom_casmurro_0809_librivox/domcasmurro_01_assis_64kb.mp3'
                    }
                    libraryItemId={userState?.libraryItemId}
                    narrator={audioOption?.narrator || 'Voluntários LibriVox'}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EDIÇÕES DESCOBERTAS */}
          {activeTab === 'editions' && (
            <div className="space-y-4">
              <p className="text-xs text-[#725E62]">
                O Entre Páginas cruzou os dados desta obra em múltiplos catálogos internacionais e identificou as seguintes edições:
              </p>

              <div className="space-y-3">
                {editions.length > 0 ? (
                  editions.map((ed: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-[#EADFD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFlagForLang(ed.language)}</span>
                          <span className="font-semibold text-sm text-[#2C2224]">
                            {ed.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#725E62]">
                          <span>🏢 Editora: <strong className="text-[#2C2224]">{ed.publisher || 'Não informada'}</strong></span>
                          <span>📅 Ano: <strong className="text-[#2C2224]">{ed.publicationYear || '—'}</strong></span>
                          {ed.isbn13 && <span>ISBN-13: <strong>{ed.isbn13}</strong></span>}
                          {ed.isbn10 && <span>ISBN-10: <strong>{ed.isbn10}</strong></span>}
                          {ed.format && <span>Formato: <strong>{ed.format}</strong></span>}
                        </div>
                      </div>

                      <span className="text-[11px] px-3 py-1 rounded-full bg-[#F4EFE6] text-[#722F37] border border-[#EADFD0] font-semibold whitespace-nowrap">
                        Fonte: {ed.sourceName}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl bg-white border border-[#EADFD0] text-center text-xs text-[#725E62]">
                    Apenas a edição canônica inicial está cadastrada para esta obra.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FONTES & DISPONIBILIDADE */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#725E62]">
                  Todas as formas legítimas de acesso localizadas nesta busca com checagem de integridade e licença.
                </p>
                <span className="text-[11px] text-[#725E62] bg-[#F4EFE6] px-2.5 py-1 rounded-full border border-[#EADFD0]">
                  {bookData.sources?.length || 1} fontes agregadas
                </span>
              </div>

              {/* Tabela de Fontes com Data de Verificação e Tipo de Acesso Honesto */}
              <div className="overflow-hidden rounded-2xl border border-[#EADFD0] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#EADFD0] text-[#725E62] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Fonte</th>
                        <th className="px-3 py-3">Classificação de Acesso</th>
                        <th className="px-3 py-3">Formato / DRM</th>
                        <th className="px-3 py-3">Data da Verificação</th>
                        <th className="px-4 py-3 text-right">Acesso Oficial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EADFD0]">
                      {bookData.downloadOptions && bookData.downloadOptions.length > 0 ? (
                        bookData.downloadOptions.map((opt: any, idx: number) => {
                          const isDownload = opt.isDirectDownload;
                          const isPreview = opt.notes?.toLowerCase().includes('prévia') || opt.format?.toLowerCase().includes('prévia');
                          const isBorrow = opt.notes?.toLowerCase().includes('empréstimo');
                          const isCommercial = opt.notes?.toLowerCase().includes('comercial') || opt.price;

                          const isUnverified = opt.accessType === 'UNVERIFIED_DOWNLOAD';
                          const isExternal = opt.accessType === 'EXTERNAL_DOWNLOAD';
                          const isAccessPage = opt.accessType === 'ACCESS_PAGE';
                          const isMetadataOnly = opt.accessType === 'METADATA_ONLY';

                          return (
                            <tr key={idx} className={`transition-colors ${isUnverified ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-[#FAF8F5]/50'}`}>
                              <td className="px-4 py-3 font-medium text-[#2C2224]">
                                {opt.sourceName || 'Fonte Oficial'}
                              </td>
                              <td className="px-3 py-3">
                                {isUnverified ? (
                                  <span className="inline-flex items-center gap-1 text-red-800 font-bold bg-red-100 px-2 py-0.5 rounded border border-red-200">
                                    🔴 Fonte Não Verificada
                                  </span>
                                ) : isExternal ? (
                                  <span className="inline-flex items-center gap-1 text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    🟣 Acesso Externo
                                  </span>
                                ) : isAccessPage ? (
                                  <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                    🔘 Página de Fonte
                                  </span>
                                ) : isMetadataOnly ? (
                                  <span className="inline-flex items-center gap-1 text-stone-700 font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                    ⚪ Somente Metadados
                                  </span>
                                ) : isDownload ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    🟢 Download Legal
                                  </span>
                                ) : isBorrow ? (
                                  <span className="inline-flex items-center gap-1 text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                    🔵 Empréstimo Digital
                                  </span>
                                ) : isPreview ? (
                                  <span className="inline-flex items-center gap-1 text-yellow-800 font-bold bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                                    🟡 Prévia Parcial
                                  </span>
                                ) : isCommercial ? (
                                  <span className="inline-flex items-center gap-1 text-orange-800 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                    🟠 eBook Comercial
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-stone-700 font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                    ⚪ Catálogo / Leitura
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-stone-600">
                                <span>{opt.format || 'Digital'}</span>
                                {opt.price && <span className="block text-[11px] font-semibold text-orange-800">{opt.price}</span>}
                              </td>
                              <td className="px-3 py-3 text-[#725E62] text-[11px]">
                                {formatVerifiedDate(opt.verifiedAt)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <a
                                  href={opt.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#722F37] hover:underline font-semibold"
                                >
                                  Abrir Fonte <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-[#725E62]">
                            Registros bibliográficos catalogados sem links diretos adicionais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informação sobre DRM e Fontes Não Verificadas */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-[#F4EFE6] border border-[#EADFD0] flex items-start gap-2.5 text-xs text-[#725E62]">
                  <Lock className="w-4 h-4 text-[#722F37] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Compromisso de Legalidade:</strong> O Entre Páginas não hospeda arquivos pirateados nem remove DRM de obras comerciais. Obras protegidas são direcionadas exclusivamente às plataformas oficiais autorizadas.
                  </p>
                </div>
                
                {bookData.downloadOptions?.some((opt: any) => opt.accessType === 'UNVERIFIED_DOWNLOAD') && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Aviso de Direitos Autorais:</strong> Fontes marcadas como "Não Verificada" são fornecidas como resultado de busca na web pública, mas não puderam ter sua autorização confirmada pelos titulares dos direitos. O acesso é feito por sua conta e risco no site de destino.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Progresso de Leitura */}
      <ProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        book={bookData}
        libraryItemId={userState?.libraryItemId || ''}
        currentPercent={userState?.progressPercent || 0}
        maxHistoricalPercent={userState?.progressPercent || 0}
        totalWords={bookData.estimatedWords || 50_000}
        currentChapter={userState?.currentChapter}
        onSuccess={fetchBookDetails}
      />
    </div>
  );
}
