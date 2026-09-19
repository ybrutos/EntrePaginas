'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Bookmark, 
  BookOpen, 
  Highlighter, 
  Settings, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Type,
  FileText,
  Save,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatNumberBR } from '@/lib/utils/text';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = decodeURIComponent((params.bookId as string) || '');

  const [bookData, setBookData] = useState<any>(null);
  const [userState, setUserState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reader Settings
  const [theme, setTheme] = useState<'sepia' | 'dark' | 'light'>('sepia');
  const [fontSize, setFontSize] = useState<number>(18);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<string>('Capítulo I');
  const [notes, setNotes] = useState<string>('');
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    setIsLoading(true);

    fetch(`/api/books/${encodeURIComponent(bookId)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Livro não encontrado');
        return r.json();
      })
      .then((data) => {
        setBookData(data.book);
        if (data.userState) {
          setUserState(data.userState);
          setProgressPercent(data.userState.progressPercent || 0);
          if (data.userState.currentChapter) {
            setCurrentChapter(data.userState.currentChapter);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, [bookId]);

  const handleSaveProgress = async (newPercent: number) => {
    setProgressPercent(newPercent);
    setIsSaving(true);
    setSavedFeedback(null);

    const totalWords = bookData?.estimatedWords || 65000;
    const wordsRead = Math.round((newPercent / 100) * totalWords);

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: bookData?.id || bookId,
          progressPercent: newPercent,
          wordsRead,
          currentChapter,
        }),
      });

      if (res.ok) {
        setSavedFeedback('Progresso sincronizado (+XP)');
        if (newPercent === 100) {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedFeedback(null), 3000);
    }
  };

  const themeStyles = {
    sepia: 'bg-[#FBF0D9] text-[#433422] border-[#EADFD0]',
    dark: 'bg-[#181617] text-[#E8E2D9] border-[#312B2C]',
    light: 'bg-[#FAFAFA] text-[#212121] border-[#E0E0E0]',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-base text-[#725E62]">Preparando o leitor digital...</p>
        </div>
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4">
        <div className="text-center space-y-4 max-w-md">
          <BookOpen className="w-12 h-12 text-[#722F37]/50 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#2C2224]">Livro não encontrado</h2>
          <Link href="/buscar" className="inline-block px-5 py-2.5 rounded-xl bg-[#722F37] text-white text-xs font-semibold">
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const htmlSource = bookData.downloadOptions?.find((d: any) => d.format.toUpperCase() === 'HTML');

  return (
    <div className={`min-h-screen flex flex-col ${themeStyles[theme]} transition-colors duration-300`}>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between backdrop-blur-md ${themeStyles[theme]}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/livro/${encodeURIComponent(bookId)}`)}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="max-w-xs sm:max-w-md truncate">
            <h1 className="font-serif font-bold text-sm truncate">{bookData.title}</h1>
            <span className="text-[11px] opacity-75 truncate block">
              {bookData.authors?.join(', ')} • {currentChapter}
            </span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center rounded-lg border p-0.5 text-xs">
            <button
              onClick={() => setTheme('sepia')}
              className={`px-2 py-1 rounded ${theme === 'sepia' ? 'bg-[#EADFD0] font-bold' : 'opacity-70'}`}
              title="Sépia"
            >
              📖
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded ${theme === 'light' ? 'bg-black/10 font-bold' : 'opacity-70'}`}
              title="Claro"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-white/20 font-bold' : 'opacity-70'}`}
              title="Noturno"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Font Size Selector */}
          <div className="hidden sm:flex items-center gap-1 text-xs border rounded-lg px-2 py-1">
            <button
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className="px-1 font-bold hover:opacity-100 opacity-70"
            >
              A-
            </button>
            <span className="text-[10px] opacity-60 font-mono">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(26, s + 2))}
              className="px-1 font-bold hover:opacity-100 opacity-70"
            >
              A+
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked ? 'bg-[#722F37] text-white' : 'hover:bg-black/5'
            }`}
            title="Marcador de Página"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Progress Track Bar */}
      <div className="w-full h-1 bg-black/10">
        <div
          className="h-full bg-gradient-to-r from-[#722F37] to-[#D4AF37] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Reading Canvas */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8 animate-fadeIn">
        {/* Chapter Header */}
        <div className="text-center space-y-2 border-b pb-6 border-black/10">
          <span className="text-xs uppercase tracking-widest opacity-60 font-bold">
            Leitura Conectada • Entre Páginas
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-bold">{currentChapter}</h2>
          <p className="text-xs opacity-75">
            {formatNumberBR(Math.round((progressPercent / 100) * (bookData.estimatedWords || 65000)))} de{' '}
            {formatNumberBR(bookData.estimatedWords || 65000)} palavras lidas ({progressPercent}%)
          </p>
        </div>

        {/* Text Pane */}
        {htmlSource ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-black/5 border text-xs flex items-center justify-between">
              <span>Fonte de texto oficial em domínio público: {htmlSource.format}</span>
              <a
                href={htmlSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
              >
                Abrir edição integral original ↗
              </a>
            </div>

            <div
              className="font-serif leading-relaxed space-y-4"
              style={{ fontSize: `${fontSize}px` }}
            >
              <p>
                {bookData.description ||
                  'Esta obra faz parte do patrimônio universal em domínio público. O progresso de leitura é sincronizado com sua conta do Entre Páginas, creditando 1 XP por cada palavra assimilada.'}
              </p>
              <p>
                "Ao vencedor, as batatas!" — As grandes histórias resistem ao tempo porque retratam a alma humana em seus anseios eternos. Continue sua leitura e registre seu progresso para evoluir de nível e conquistar insígnias literárias.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="font-serif leading-relaxed space-y-5 text-justify"
            style={{ fontSize: `${fontSize}px` }}
          >
            <p>
              {bookData.description ||
                'Texto catalogado sob licença de acesso aberto. Você pode acompanhar seu progresso de leitura capítulo a capítulo nesta interface.'}
            </p>
            <p>
              Durante a leitura, você pode ajustar o tamanho da fonte, trocar entre os modos Noturno, Claro e Sépia, além de fixar marcadores e notas pessoais para consultar mais tarde em sua estante privada.
            </p>
          </div>
        )}

        {/* Notes & Reflections Box */}
        <div className="p-5 rounded-2xl border bg-black/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Suas Notas e Destaques Pessoais
            </span>
            <span className="text-[10px] opacity-60">Visível apenas para você</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escreva uma reflexão, anote uma passagem marcante ou comentário sobre o capítulo..."
            rows={3}
            className="w-full p-3 rounded-xl bg-white/70 text-[#2C2224] text-xs focus:outline-none focus:ring-2 focus:ring-[#722F37]/40 resize-none"
          />
        </div>

        {/* Progress Slider & Quick Update */}
        <div className="p-6 rounded-2xl border bg-black/5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Marcar Progresso de Leitura</span>
            <span className="text-sm font-serif font-bold text-[#722F37]">{progressPercent}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progressPercent}
            onChange={(e) => setProgressPercent(Number(e.target.value))}
            className="w-full accent-[#722F37] cursor-pointer"
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((step) => (
                <button
                  key={step}
                  onClick={() => handleSaveProgress(step)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    progressPercent >= step ? 'bg-[#722F37] text-white border-[#722F37]' : 'hover:bg-black/10'
                  }`}
                >
                  {step}%
                </button>
              ))}
            </div>

            <button
              onClick={() => handleSaveProgress(progressPercent)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Progresso'}</span>
            </button>
          </div>

          {savedFeedback && (
            <p className="text-xs text-center text-emerald-700 font-semibold animate-pulse pt-1">
              ✓ {savedFeedback}
            </p>
          )}
        </div>
      </main>

      {/* Reader Footer */}
      <footer className="border-t px-6 py-4 flex items-center justify-between text-xs opacity-75">
        <Link href={`/livro/${encodeURIComponent(bookId)}`} className="hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Detalhes da obra
        </Link>
        <span>Entre Páginas • Leitor Digital</span>
      </footer>
    </div>
  );
}
