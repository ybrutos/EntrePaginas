'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao registrar.');
      }

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 border border-[#EADFD0] shadow-book space-y-6">
        {/* Brand Icon */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#722F37] to-[#4A1C23] flex items-center justify-center text-white mx-auto shadow-sm">
            <BookOpen className="w-6 h-6 text-[#FAF8F5]" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#2C2224]">
            Comece sua Jornada
          </h1>
          <p className="text-xs text-[#725E62]">
            Crie sua conta no Entre Páginas e tenha sua própria estante, progresso e conquistas.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Seu Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Beatriz Lima"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Nome de Usuário (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="ex: beatriz_leitora"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
            <span className="text-[10px] text-[#725E62] mt-1 block">
              Será seu link público: entrepaginas.app/u/{username || 'seu_usuario'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Senha (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#722F37] to-[#581825] text-white font-semibold text-sm hover:opacity-95 shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            {isLoading ? 'Criando Conta...' : 'Criar Conta & Iniciar'}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center text-xs text-[#725E62] pt-2 border-t border-[#EADFD0]/60">
          Já possui conta?{' '}
          <Link href="/login" className="font-semibold text-[#722F37] hover:underline">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
