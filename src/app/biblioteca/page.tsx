'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Library, 
  Heart, 
  Sparkles, 
  Star, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  XCircle, 
  Plus 
} from 'lucide-react';
import ProgressModal from '@/components/books/ProgressModal';
import { formatNumberBR } from '@/lib/utils/text';

const TABS = [
  { id: 'LENDO', label: 'Lendo', icon: BookOpen },
  { id: 'LIDOS', label: 'Lidos', icon: CheckCircle2 },
  { id: 'QUERO_LER', label: 'Quero Ler', icon: Clock },
  { id: 'FAVORITOS', label: 'Favoritos', icon: Heart },
  { id: 'PAUSADOS', label: 'Pausados', icon: PauseCircle },
  { id: 'ABANDONADOS', label: 'Abandonados', icon: XCircle },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('LENDO');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de progresso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<any>(null);

  const fetchLibrary = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (activeTab === 'FAVORITOS') {
      params.set('favorite', 'true');
    } else {
      params.set('status', activeTab);
    }

    fetch(`/api/library?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLibrary();
  }, [activeTab]);

  const handleOpenProgress = (item: any) => {
    setSelectedBookForProgress({
      ...item.book,
      libraryItemId: item.id,
      progressPercent: item.progressPercent,
      estimatedWords: item.book.estimatedWords,
      currentChapter: item.currentChapter,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#725E62] font-semibold flex items-center gap-1.5">
            <Library className="w-3.5 h-3.5 text-[#722F37]" />
            Estante Pessoal de Karolayne
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2C2224] mt-1">
            Minha Biblioteca
          </h1>
          <p className="text-sm text-[#725E62] mt-1">
            Acompanhe suas leituras em andamento, histórias concluídas e títulos desejados.
          </p>
        </div>

        <Link
          href="/buscar"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Novo Livro</span>
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#EADFD0]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-[#722F37] text-white shadow-sm'
                  : 'bg-[#F4EFE6] text-[#725E62] hover:text-[#2C2224] hover:bg-[#EADFD0]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-[#725E62]">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif text-lg">Organizando suas páginas...</p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white border border-[#EADFD0] shadow-book hover:shadow-book-hover transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex gap-4">
                {/* Thumbnail Cover */}
                <div className="w-20 h-28 rounded-xl bg-[#F4EFE6] overflow-hidden flex-shrink-0 shadow-sm border border-[#EADFD0]">
                  {item.book.coverUrl ? (
                    <img
                      src={item.book.coverUrl}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#722F37]">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#722F37] bg-[#722F37]/10 px-2 py-0.5 rounded-md">
                      {item.status}
                    </span>
                    {item.isFavorite && (
                      <Heart className="w-4 h-4 fill-[#722F37] text-[#722F37]" />
                    )}
                  </div>

                  <Link href={`/livro/${encodeURIComponent(item.bookId)}`} className="hover:underline">
                    <h3 className="font-serif text-base font-bold text-[#2C2224] truncate mt-1.5">
                      {item.book.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-[#725E62] truncate">
                    {item.book.authors?.join(', ') || 'Autor Desconhecido'}
                  </p>

                  {/* Rating Stars if reviewed */}
                  {item.rating && (
                    <div className="flex items-center gap-0.5 mt-1.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="mt-4 pt-3 border-t border-[#EADFD0]/70 space-y-2">
                <div className="flex justify-between text-xs text-[#725E62]">
                  <span className="font-medium text-[#722F37]">
                    {item.progressPercent}% lido
                  </span>
                  <span>
                    {formatNumberBR(item.wordsRead)} / {formatNumberBR(item.book.estimatedWords || 50000)} palavras
                  </span>
                </div>
                <div className="w-full h-2 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#EADFD0]">
                  <div
                    className="h-full bg-gradient-to-r from-[#722F37] to-[#D4AF37] rounded-full"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>

                {/* Review Snippet if available */}
                {item.review && (
                  <p className="text-xs text-[#725E62] italic line-clamp-2 mt-2 bg-[#F4EFE6]/60 p-2 rounded-xl">
                    "{item.review}"
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleOpenProgress(item)}
                    className="text-xs font-semibold text-[#722F37] hover:text-[#581825] flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-[#F4EFE6] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Progresso
                  </button>

                  <Link
                    href={`/livro/${encodeURIComponent(item.bookId)}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EADFD0] text-[#2C2224] transition-colors"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#EADFD0] max-w-md mx-auto space-y-4">
          <BookOpen className="w-12 h-12 text-[#C97D8A]/60 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-[#2C2224]">Nenhum livro nesta categoria</h3>
          <p className="text-xs text-[#725E62] leading-relaxed">
            Adicione novos títulos à sua estante pesquisando no catálogo com milhares de clássicos disponíveis.
          </p>
          <Link
            href="/buscar"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
          >
            Explorar Catálogo
          </Link>
        </div>
      )}

      {/* Modal de Atualização de Progresso */}
      {selectedBookForProgress && (
        <ProgressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          book={selectedBookForProgress}
          libraryItemId={selectedBookForProgress.libraryItemId}
          currentPercent={selectedBookForProgress.progressPercent || 0}
          maxHistoricalPercent={selectedBookForProgress.progressPercent || 0}
          totalWords={selectedBookForProgress.estimatedWords || 50_000}
          currentChapter={selectedBookForProgress.currentChapter}
          onSuccess={fetchLibrary}
        />
      )}
    </div>
  );
}
