import React from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';
import { LevelInfo } from '@/lib/gamification/level-system';

interface XPProgressBarProps {
  levelInfo: LevelInfo;
  className?: string;
  showDetails?: boolean;
}

export default function XPProgressBar({
  levelInfo,
  className = '',
  showDetails = true,
}: XPProgressBarProps) {
  const {
    level,
    title,
    currentXP,
    nextLevelXP,
    xpToNextLevel,
    progressPercent,
  } = levelInfo;

  return (
    <div className={`p-4 md:p-6 rounded-2xl bg-[#F4EFE6] border border-[#EADFD0] shadow-sm ${className}`}>
      {/* Top Header with Level & Title */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#722F37] to-[#C97D8A] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white/50">
            {level}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#725E62] font-semibold flex items-center gap-1">
              Nível Atual
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            </div>
            <h3 className="font-serif text-lg md:text-xl font-bold text-[#2C2224] leading-tight">
              {title}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-[#722F37] bg-[#722F37]/10 px-2.5 py-1 rounded-full">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3.5 bg-[#EADFD0] rounded-full overflow-hidden p-0.5 shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#722F37] via-[#C97D8A] to-[#D4AF37] relative"
          style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
        >
          {/* Subtle light shimmer overlay */}
          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
        </div>
      </div>

      {/* Footer Details */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs mt-3 pt-2.5 border-t border-[#EADFD0]/60 text-[#725E62]">
          <span className="font-medium">
            <strong className="text-[#2C2224] font-semibold">{formatNumberBR(currentXP)}</strong> XP acumulados
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
            Faltam <strong className="text-[#722F37]">{formatNumberBR(xpToNextLevel)} XP</strong> para o Nível {level + 1}
          </span>
        </div>
      )}
    </div>
  );
}
