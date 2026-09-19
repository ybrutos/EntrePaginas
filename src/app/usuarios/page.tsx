'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ShieldAlert, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  Mail, 
  Clock, 
  ArrowLeft,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { formatNumberBR } from '@/lib/utils/text';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  level: number;
  levelTitle: string;
  totalXP: number;
  totalWordsRead: number;
  totalMinutesListened: number;
  streakDays: number;
  createdAt: string;
  lastActiveDate?: string;
  totalBooks: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (r) => {
        if (r.status === 403) {
          throw new Error('Acesso restrito a administradores. Faça login como admin para visualizar.');
        }
        if (!r.ok) {
          throw new Error('Erro ao carregar usuários.');
        }
        return r.json();
      })
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#725E62] hover:text-[#722F37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Início
        </Link>

        <Link
          href="/admin/providers"
          className="px-4 py-2 rounded-xl bg-white border border-[#EADFD0] hover:border-[#722F37] text-xs font-semibold text-[#2C2224] transition-colors"
        >
          ⚡ Status dos Provedores
        </Link>
      </div>

      {/* Header Banner */}
      <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] text-[11px] font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            Administração • Gestão de Usuários
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
            Usuários Cadastrados na Plataforma
          </h1>
          <p className="text-xs md:text-sm text-[#725E62] max-w-2xl leading-relaxed">
            Área restrita à administração para acompanhamento de métricas de uso, data de cadastro, nível, progresso de leitura e status das contas.
          </p>
        </div>

        <div className="text-right text-xs text-[#725E62]">
          <span className="block">Total de leitores:</span>
          <span className="font-serif text-2xl font-bold text-[#722F37]">
            {users.length} contas
          </span>
        </div>
      </section>

      {error ? (
        <div className="p-8 md:p-12 text-center bg-white rounded-3xl border border-rose-200 space-y-4 max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#2C2224]">Acesso Administrativo Restrito</h2>
          <p className="text-xs text-[#725E62] leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#722F37] text-white text-xs font-semibold"
            >
              Fazer Login como Admin
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#722F37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-serif text-base text-[#725E62]">Carregando base de usuários...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#EADFD0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#EADFD0] text-[#725E62] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Nome / Usuário</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Papel</th>
                  <th className="px-4 py-3.5">Data de Cadastro</th>
                  <th className="px-4 py-3.5 text-center">Livros na Estante</th>
                  <th className="px-4 py-3.5">Nível</th>
                  <th className="px-5 py-3.5 text-right">XP Total</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFD0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-sm text-[#2C2224] block">{u.name}</span>
                        <span className="text-[11px] text-[#725E62]">@{u.username}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-[#725E62]">
                      <span className="font-mono text-xs">{u.email}</span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-[#725E62]">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-[#2C2224]">
                      {u.totalBooks}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold text-[#722F37]">Nv. {u.level}</span>{' '}
                      <span className="text-[11px] text-[#725E62]">({u.levelTitle})</span>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-[#722F37]">
                      {formatNumberBR(u.totalXP)} XP
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
