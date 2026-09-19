'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (userLogin: string, pass: string) => {
    setLogin(userLogin);
    setPassword(pass);
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
            Bem-vindo de volta
          </h1>
          <p className="text-xs text-[#725E62]">
            Acesse sua estante pessoal e continue sua jornada literária.
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
              Email ou Nome de Usuário
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="seu_usuario ou email@exemplo.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#725E62] mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#EADFD0] text-sm text-[#2C2224] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#722F37] to-[#581825] text-white font-semibold text-sm hover:opacity-95 shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar no Entre Páginas'}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="pt-2 border-t border-[#EADFD0]/60 space-y-2">
          <span className="text-[11px] text-[#725E62] block text-center font-medium">
            Acesso Rápido para Demonstração:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('karolayne', 'karolayne123')}
              className="py-2 px-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EADFD0] text-[11px] font-semibold text-[#722F37] transition-colors text-center"
            >
              Leitora (Karolayne)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin', 'admin123')}
              className="py-2 px-2.5 rounded-xl bg-[#F4EFE6] hover:bg-[#EADFD0] text-[11px] font-semibold text-[#2C2224] transition-colors text-center"
            >
              Administrador (Admin)
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center text-xs text-[#725E62]">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-[#722F37] hover:underline">
            Criar conta gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
}
