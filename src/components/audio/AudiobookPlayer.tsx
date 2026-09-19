'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Headphones, 
  Volume2, 
  VolumeX, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

interface AudiobookPlayerProps {
  bookTitle: string;
  author: string;
  coverUrl?: string;
  audioUrl: string;
  libraryItemId?: string;
  initialMinutesListened?: number;
  initialChapter?: number;
  narrator?: string;
  onXPUpdate?: (xpGained: number) => void;
}

export default function AudiobookPlayer({
  bookTitle,
  author,
  coverUrl,
  audioUrl,
  libraryItemId,
  initialMinutesListened = 0,
  initialChapter = 1,
  narrator = 'Voluntário LibriVox',
  onXPUpdate,
}: AudiobookPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [minutesSession, setMinutesSession] = useState(0);
  const [xpSessionGained, setXpSessionGained] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const minutes = Math.floor(audio.currentTime / 60);
      if (minutes > minutesSession) {
        setMinutesSession(minutes);
        // Salva progresso de áudio
        if (libraryItemId && minutes > 0) {
          fetch('/api/progress/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              libraryItemId,
              currentChapter: initialChapter,
              positionSeconds: Math.floor(audio.currentTime),
              minutesListened: initialMinutesListened + minutes,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.listeningXPGained > 0) {
                setXpSessionGained((prev) => prev + data.listeningXPGained);
                if (onXPUpdate) onXPUpdate(data.listeningXPGained);
              }
            })
            .catch(() => {});
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [libraryItemId, minutesSession, initialMinutesListened, initialChapter, onXPUpdate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.error('Erro ao tocar:', e));
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changeRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#2D0E14] via-[#4A1C23] to-[#1F080D] text-white shadow-book border border-[#EADFD0]/20 space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-white/10 overflow-hidden flex-shrink-0 border border-white/20 flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt={bookTitle} className="w-full h-full object-cover" />
          ) : (
            <Headphones className="w-6 h-6 text-[#D4AF37]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-[#F5E8C7] uppercase font-bold tracking-wider">
            <Headphones className="w-3.5 h-3.5 text-[#D4AF37]" />
            Audiolivro em Domínio Público
          </div>
          <h4 className="font-serif text-lg font-bold text-white truncate leading-tight mt-0.5">
            {bookTitle}
          </h4>
          <p className="text-xs text-[#F5EFE6]/70 truncate">
            Narrado por: {narrator} • {author}
          </p>
        </div>

        {/* Listening XP Pill */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            Listening XP
          </span>
          <span className="text-xs font-bold text-white">
            +{formatNumberBR(xpSessionGained)} XP
          </span>
        </div>
      </div>

      {/* Seek Range Slider */}
      <div className="space-y-1.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
        />
        <div className="flex justify-between text-[11px] text-[#F5EFE6]/60 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Rate */}
        <button
          onClick={changeRate}
          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#F5E8C7] transition-colors"
        >
          {playbackRate}x
        </button>

        {/* Playback Center Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => seek(-15)}
            className="p-2 text-[#F5EFE6]/80 hover:text-white transition-colors"
            title="Voltar 15s"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5E8C7] text-[#2C2224] flex items-center justify-center shadow-glow-gold hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seek(30)}
            className="p-2 text-[#F5EFE6]/80 hover:text-white transition-colors"
            title="Avançar 30s"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Mute Toggle */}
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }
          }}
          className="p-2 text-[#F5EFE6]/80 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
