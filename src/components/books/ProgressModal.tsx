'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, BookOpen, Check } from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';
import { calculateXPProgress } from '@/lib/gamification/xp-calculator';
import confetti from 'canvas-confetti';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: any;
  libraryItemId: string;
  currentPercent: number;
  maxHistoricalPercent: number;
  totalWords: number;
  currentChapter?: string;
  onSuccess?: (newPercent: number, xpGained: number) => void;
}

export default function ProgressModal({
  isOpen,
  onClose,
  book,
  libraryItemId,
  currentPercent,
  maxHistoricalPercent,
  totalWords,
  currentChapter: initialChapter = '',
  onSuccess,
}: ProgressModalProps) {
  const [percent, setPercent] = useState<number>(currentPercent);
  const [chapter, setChapter] = useState<string>(initialChapter);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPercent(currentPercent);
      setChapter(initialChapter || '');
      setMessage(null);
    }
  }, [isOpen, currentPercent, initialChapter]);

  if (!isOpen || !book) return null;

  // Cálculo prévio em tempo real do XP que será conquistado
  const safeWords = totalWords || 50_000;
  const xpPreview = calculateXPProgress(safeWords, maxHistoricalPercent, percent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libraryItemId,
          progressPercent: percent,
          currentChapter: chapter,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar progresso');

      if (data.xpGained > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#722F37', '#D4AF37', '#E8B4B8'],
        });
      }

      if (onSuccess) {
        onSuccess(percent, data.xpGained);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-[#EADFD0] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#725E62] hover:bg-[#F4EFE6] hover:text-[#2C2224] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Book Header Preview */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-14 h-20 rounded-xl bg-[#F4EFE6] overflow-hidden flex-shrink-0 shadow-sm border border-[#EADFD0]">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#722F37]">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#725E62] font-semibold block">
              Registro de Leitura
            </span>
            <h3 className="font-serif text-lg font-bold text-[#2C2224] leading-snug line-clamp-1">
              {book.title}
            </h3>
            <p className="text-xs text-[#725E62] mt-0.5">
              {formatNumberBR(safeWords)} palavras estimadas
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Progress Slider Display */}
          <div className="p-4 rounded-2xl bg-[#F4EFE6] border border-[#EADFD0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#725E62]">Progresso Atual</span>
              <span className="font-serif text-2xl font-bold text-[#722F37]">
                {percent}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={percent}
              onChange={(e) => setPercent(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-[#DECFC0] rounded-lg appearance-none cursor-pointer accent-[#722F37]"
            />

            {/* Quick percent increment buttons */}
            <div className="flex items-center justify-between gap-2 mt-3">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg border transition-all ${
                    percent === p
                      ? 'bg-[#722F37] text-white border-[#722F37]'
                      : 'bg-white text-[#725E62] border-[#EADFD0] hover:border-[#C97D8A]'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* XP Anticipation Pill */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#FAF8F5] to-[#F4EFE6] border border-[#EADFD0]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-medium text-[#2C2224]">XP a Conquistar:</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#722F37]">
                +{formatNumberBR(xpPreview.xpDelta)} XP
              </span>
              {xpPreview.xpDelta === 0 && percent <= maxHistoricalPercent && (
                <span className="block text-[10px] text-[#725E62]">
                  (Já explorado até {maxHistoricalPercent}%)
                </span>
              )}
            </div>
          </div>

          {/* Optional Chapter / Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Capítulo ou Marcação (Opcional)
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="Ex: Capítulo V — O enigma de Capitu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFD0] bg-white text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          {message && (
            <div className="text-xs text-center text-red-600 font-medium">
              {message}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#722F37] to-[#4A1C23] text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Gravando Páginas...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Progresso & Conquistar XP</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
