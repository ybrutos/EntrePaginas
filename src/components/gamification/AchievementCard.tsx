import React from 'react';
import { 
  BookOpen, 
  Flame, 
  Crown, 
  Sparkles, 
  Trophy, 
  Library, 
  Brain, 
  Compass, 
  Scale, 
  Palette, 
  Zap, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

interface AchievementCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  badgeLevel: 'bronze' | 'silver' | 'gold' | 'diamond' | string;
  xpReward: number;
  unlocked?: boolean;
  unlockedAt?: string | Date;
}

const ICON_MAP: Record<string, any> = {
  BookOpen,
  Flame,
  Crown,
  Sparkles,
  Trophy,
  Library,
  Brain,
  Compass,
  Scale,
  Palette,
  Zap,
};

const BADGE_STYLES: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  bronze: {
    ring: 'border-[#CD7F32]/50 text-[#8B4513]',
    bg: 'bg-[#CD7F32]/10',
    text: 'text-[#8B4513]',
    label: 'Bronze',
  },
  silver: {
    ring: 'border-slate-300 text-slate-700',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: 'Prata',
  },
  gold: {
    ring: 'border-[#D4AF37] text-[#996515]',
    bg: 'bg-[#D4AF37]/15',
    text: 'text-[#B38E22]',
    label: 'Ouro',
  },
  diamond: {
    ring: 'border-sky-400 text-sky-800',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    label: 'Diamante',
  },
};

export default function AchievementCard({
  title,
  description,
  icon,
  badgeLevel,
  xpReward,
  unlocked = false,
  unlockedAt,
}: AchievementCardProps) {
  const IconComponent = ICON_MAP[icon] || Sparkles;
  const style = BADGE_STYLES[badgeLevel] || BADGE_STYLES.bronze;

  return (
    <div
      className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
        unlocked
          ? 'bg-white border-[#EADFD0] shadow-sm hover:shadow-md hover:border-[#C97D8A]/50'
          : 'bg-[#FAF8F5]/60 border-dashed border-[#DECFC0] opacity-70 grayscale-[30%]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
              unlocked
                ? `${style.bg} ${style.ring} shadow-sm`
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
          >
            {unlocked ? (
              <IconComponent className="w-6 h-6 stroke-[2]" />
            ) : (
              <Lock className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* XP Reward & Category Badge */}
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.ring} ${style.bg}`}
            >
              {style.label}
            </span>
            <span className="text-[11px] font-semibold text-[#722F37]">
              +{formatNumberBR(xpReward)} XP
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <h4 className="font-serif text-base font-bold text-[#2C2224] leading-snug mb-1">
          {title}
        </h4>
        <p className="text-xs text-[#725E62] line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Status Footer */}
      <div className="mt-4 pt-2.5 border-t border-[#EADFD0]/60 flex items-center justify-between text-[11px]">
        {unlocked ? (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Conquistada
          </span>
        ) : (
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Bloqueada
          </span>
        )}

        {unlockedAt && (
          <span className="text-[#9A8B8E]">
            {new Date(unlockedAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}
