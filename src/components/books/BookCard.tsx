import React from 'react';
import Link from 'next/link';
import { BookOpen, Download, Heart, Check, Sparkles, Headphones, Layers, FileText, ShoppingCart, BookCopy, AlertCircle } from 'lucide-react';
import { UnifiedBook } from '@/lib/providers/book-provider.interface';
import { WorkRecord, AccessType } from '@/lib/providers/types';
import { WorkAvailabilitySummary } from '@/lib/search/content-availability-analyzer';

interface BookCardProps {
  book: UnifiedBook & { workRecord?: WorkRecord; availabilitySummary?: WorkAvailabilitySummary };
  progressPercent?: number;
  status?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (bookId: string) => void;
  onOpenProgress?: (book: any) => void;
}

export default function BookCard({
  book,
  progressPercent,
  status,
  isFavorite,
  onToggleFavorite,
  onOpenProgress,
}: BookCardProps) {
  const work = book.workRecord;
  const avail = book.availabilitySummary;

  const hasAudiobook = Boolean(book.hasAudiobook || book.audiobookDetails || work?.audiobooks?.length);
  const sourcesCount = work?.sourcesCount || book.sourcesCount || (book.sources ? book.sources.length : 1);
  const editionsCount = work?.editions?.length || 1;
  const primaryAuthor = Array.isArray(book.authors) ? book.authors[0] : (book as any).author || 'Autor Desconhecido';
  const detailUrl = `/livro/${encodeURIComponent(book.id || book.slug)}`;

  // Identifica título alternativo ou traduzido relevante
  const aliasPt = work?.aliases?.find((a) => a.aliasType === 'TRANSLATED_TITLE' || a.language === 'pt');
  const aliasOrig = work?.aliases?.find((a) => a.aliasType === 'ORIGINAL_TITLE');
  const aliasDisplay = aliasPt?.title || aliasOrig?.title || (work?.aliases?.[0]?.title);

  return (
    <div className="group bg-white rounded-2xl border border-[#EADFD0] overflow-hidden shadow-book hover:shadow-book-hover transition-all duration-300 flex flex-col justify-between">
      {/* Top Cover Area */}
      <div className="relative aspect-[2/3] w-full bg-[#F4EFE6] overflow-hidden flex items-center justify-center">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="p-6 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-[#C97D8A]/50 mb-2 stroke-[1.25]" />
            <span className="font-serif text-sm font-bold text-[#2C2224] line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        {/* Floating Badges V2 (Honestos e Rigorosos) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start max-w-[85%]">
          {sourcesCount > 1 && (
            <span className="bg-amber-700/90 text-amber-100 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1 border border-amber-500/30">
              <Layers className="w-2.5 h-2.5 text-amber-300" />
              {sourcesCount} fontes · {editionsCount} edições
            </span>
          )}

          {/* Badge Primária de Disponibilidade Honesta */}
          {avail ? (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border flex items-center gap-1 ${avail.primaryBadge.badgeClass}`}>
              {avail.hasLegalDownload && <Download className="w-2.5 h-2.5" />}
              {avail.hasLibraryBorrow && !avail.hasLegalDownload && <BookCopy className="w-2.5 h-2.5" />}
              {avail.hasPreviewOnly && !avail.hasLegalDownload && !avail.hasLibraryBorrow && <AlertCircle className="w-2.5 h-2.5" />}
              {avail.hasCommercialPurchase && !avail.hasLegalDownload && !avail.hasLibraryBorrow && !avail.hasPreviewOnly && <ShoppingCart className="w-2.5 h-2.5" />}
              <span>{avail.primaryBadge.label}</span>
            </span>
          ) : book.downloadOptions && book.downloadOptions.some(d => d.isDirectDownload) ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border flex items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-300">
              <Download className="w-2.5 h-2.5" />
              <span>Download Legal Disponível</span>
            </span>
          ) : book.isPublicDomain ? (
            <span className="bg-[#1B4D3E]/90 text-white text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm">
              Domínio Público
            </span>
          ) : null}

          {hasAudiobook && (
            <span className="bg-purple-800/90 text-purple-100 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm border border-purple-400/30">
              <Headphones className="w-2.5 h-2.5 text-purple-200" />
              Audiolivro
            </span>
          )}
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(book.id);
            }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#722F37] flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 shadow-sm"
            aria-label="Favoritar"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#722F37] text-[#722F37]' : 'text-[#725E62]'}`} />
          </button>
        )}

        {/* Progress bar overlay if active */}
        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/30 backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-[#C97D8A] to-[#D4AF37] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#725E62] mb-1">
            <span className="font-medium truncate">{primaryAuthor}</span>
            {book.publicationYear && (
              <>
                <span>•</span>
                <span>{book.publicationYear}</span>
              </>
            )}
          </div>

          <Link href={detailUrl} className="block group-hover:text-[#722F37] transition-colors">
            <h3 className="font-serif text-base font-bold text-[#2C2224] line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>

          {/* Subtítulo ou Título Traduzido / Alias Canônico */}
          {aliasDisplay && aliasDisplay.toLowerCase() !== book.title.toLowerCase() && (
            <p className="text-[11px] text-[#722F37] font-medium italic mt-1 line-clamp-1">
              {aliasPt ? '🇧🇷 No Brasil: ' : 'Também conhecido como: '}
              <span className="font-semibold">{aliasDisplay}</span>
            </p>
          )}

          {/* Genres tags */}
          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.genres.slice(0, 2).map((g: string) => (
                <span
                  key={g}
                  className="text-[10px] bg-[#F4EFE6] text-[#725E62] px-2 py-0.5 rounded-md font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3 border-t border-[#EADFD0]/60 flex items-center justify-between gap-2 flex-wrap">
          {typeof progressPercent === 'number' && onOpenProgress ? (
            <button
              onClick={() => onOpenProgress(book)}
              className="text-xs font-semibold text-[#722F37] hover:text-[#581825] flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-[#F4EFE6] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              {progressPercent}% lido
            </button>
          ) : (
            <span className="text-[11px] text-[#725E62]">
              {sourcesCount > 1 ? `${sourcesCount} fontes consultadas` : 'Registro bibliográfico'}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const allDownloads = [
                ...(book.downloadOptions || []),
                ...((book as any).downloads || [])
              ];
              if (allDownloads.length === 0) return null;
              
              const directDownloads = allDownloads.filter(d => d.isDirectDownload && d.format);
              
              // Deduplicar por formato
              const uniqueFormats = new Map();
              directDownloads.forEach(d => {
                const fmt = d.format.toUpperCase();
                if (!uniqueFormats.has(fmt) || d.providerName === 'gutenberg') { // prefere gutenberg
                  uniqueFormats.set(fmt, d);
                }
              });

              return Array.from(uniqueFormats.values()).map((dl, idx) => {
                const handleDownload = (e: React.MouseEvent) => {
                  e.preventDefault();
                  const proxyUrl = `/api/download?url=${encodeURIComponent(dl.url)}&format=${encodeURIComponent(dl.format)}&title=${encodeURIComponent(book.title)}`;
                  window.open(proxyUrl, '_blank');
                };

                return (
                  <button
                    key={idx}
                    onClick={handleDownload}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#F4EFE6] border border-[#EADFD0] text-[#722F37] hover:bg-[#EADFD0] transition-all shadow-sm active:scale-95 flex items-center gap-1"
                    title={`Baixar arquivo .${dl.format.toUpperCase()}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {dl.format.toUpperCase()}
                  </button>
                );
              });
            })()}

            <Link
              href={detailUrl}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              Ver Obra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
