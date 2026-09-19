'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Key, 
  Clock, 
  Download, 
  Headphones, 
  ShieldCheck, 
  Layers, 
  Zap,
  ArrowLeft
} from 'lucide-react';

interface ProviderHealth {
  name: string;
  displayName: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  rateLimit: number;
  requiresApiKey: boolean;
  hasApiKey: boolean;
  supportsDownload: boolean;
  supportsAudiobook: boolean;
  totalResultsSeen?: number;
  lastQueriedAt?: string;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>('');

  const fetchHealth = () => {
    setIsLoading(true);
    fetch('/api/admin/providers')
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) {
          setProviders(data.providers);
          setLastCheck(new Date(data.timestamp).toLocaleTimeString('pt-BR'));
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const onlineCount = providers.filter((p) => p.online).length;
  const avgLatency = providers.length > 0
    ? Math.round(providers.reduce((acc, p) => acc + (p.latencyMs || 0), 0) / providers.length)
    : 0;

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

        <div className="flex items-center gap-3">
          <Link
            href="/usuarios"
            className="px-4 py-2 rounded-xl bg-white border border-[#EADFD0] hover:border-[#722F37] text-xs font-semibold text-[#2C2224] transition-colors"
          >
            👥 Gerenciar Usuários
          </Link>
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Status</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            Diagnóstico de Infraestrutura
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
            Status dos Provedores & Fontes Abertas
          </h1>
          <p className="text-xs md:text-sm text-[#725E62] max-w-2xl leading-relaxed">
            Monitoramento em tempo real dos 8 agregadores de bibliotecas digitais, latência de rede, políticas de rate limit e disponibilidade legal de downloads.
          </p>
        </div>

        {lastCheck && (
          <div className="text-right text-xs text-[#725E62]">
            <span>Última verificação:</span>
            <span className="font-semibold text-[#2C2224] ml-1">{lastCheck}</span>
          </div>
        )}
      </section>

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Fontes Integradas</span>
          <span className="font-serif text-2xl font-bold text-[#2C2224] mt-1 block">
            {providers.length} bibliotecas
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            100% Fontes Legítimas
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Disponibilidade</span>
          <span className="font-serif text-2xl font-bold text-emerald-600 mt-1 block">
            {onlineCount} / {providers.length} Online
          </span>
          <span className="text-[10px] text-[#725E62] mt-1 block">
            Tolerância a falhas ativa
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Latência Média</span>
          <span className="font-serif text-2xl font-bold text-[#722F37] mt-1 block">
            {avgLatency} ms
          </span>
          <span className="text-[10px] text-[#725E62] mt-1 block">
            Cache em memória de 30m
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Audiolivros</span>
          <span className="font-serif text-2xl font-bold text-purple-700 mt-1 block">
            LibriVox Ativo
          </span>
          <span className="text-[10px] text-purple-600 font-semibold mt-1 block">
            + listeningXP habilitado
          </span>
        </div>
      </section>

      {/* Providers Table */}
      <section className="bg-white rounded-3xl border border-[#EADFD0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#EADFD0] flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-[#2C2224] flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Matriz de Saúde dos 8 Provedores
          </h2>
          <span className="text-xs text-[#725E62]">
            Políticas com rate limit e checagem de timeout
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#EADFD0] text-[#725E62] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Provedor</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Tempo Médio</th>
                <th className="px-4 py-3.5">Rate Limit</th>
                <th className="px-4 py-3.5">Chave de API</th>
                <th className="px-4 py-3.5">Recursos</th>
                <th className="px-5 py-3.5">Diagnóstico / Erro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADFD0]">
              {providers.map((p) => (
                <tr key={p.name} className="hover:bg-[#FAF8F5]/60 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <span className="font-bold text-sm text-[#2C2224] block">
                        {p.displayName}
                      </span>
                      <span className="text-[10px] text-[#725E62] font-mono">
                        provider.config.{p.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {p.online ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Indisponível
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span className="font-mono text-xs font-semibold text-[#2C2224]">
                      {p.latencyMs} ms
                    </span>
                  </td>

                  <td className="px-4 py-4 text-[#725E62]">
                    <span className="font-medium text-[#2C2224]">{p.rateLimit}</span> req/min
                  </td>

                  <td className="px-4 py-4">
                    {p.requiresApiKey ? (
                      p.hasApiKey ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Configurada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Chave Ausente
                        </span>
                      )
                    ) : (
                      <span className="text-stone-400">Pública / Livre</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {p.supportsDownload && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                          <Download className="w-2.5 h-2.5" /> Download
                        </span>
                      )}
                      {p.supportsAudiobook && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold flex items-center gap-1">
                          <Headphones className="w-2.5 h-2.5" /> Áudio
                        </span>
                      )}
                      {!p.supportsDownload && !p.supportsAudiobook && (
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-medium">
                          Metadados
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {p.error ? (
                      <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-1 rounded block max-w-xs truncate" title={p.error}>
                        {p.error}
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-medium">
                        Operacional sem anomalias
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
