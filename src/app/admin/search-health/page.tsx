'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft,
  Database,
  Layers,
  Zap,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';

export default function AdminSearchHealthPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTelemetry = () => {
    setIsLoading(true);
    fetch('/api/admin/search-health')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/providers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#725E62] hover:text-[#722F37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver Provedores
        </Link>

        <button
          onClick={fetchTelemetry}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* Header Banner */}
      <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#EADFD0] shadow-book">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-[11px] font-bold uppercase tracking-wider mb-2">
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          Telemetria do Motor Global de Busca
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2C2224]">
          Saúde de Pesquisa, Latência & Cache
        </h1>
        <p className="text-xs md:text-sm text-[#725E62] mt-1 max-w-2xl leading-relaxed">
          Monitoramento do pipeline de expansão de termos, circuit breaker por provedor, taxas de acerto do cache (hit/miss) e histórico de deduplicações.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Buscas Registradas</span>
          <span className="font-serif text-2xl font-bold text-[#2C2224] mt-1 block">
            {data?.totalSearches || 0}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            Auditoria Ativa
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Cache Hit Rate</span>
          <span className="font-serif text-2xl font-bold text-emerald-600 mt-1 block">
            {data?.cacheStats?.hitRatePercent || '0.0'}%
          </span>
          <span className="text-[10px] text-[#725E62] mt-1 block">
            {data?.cacheStats?.hits || 0} hits / {data?.cacheStats?.misses || 0} misses
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Entradas em Memória</span>
          <span className="font-serif text-2xl font-bold text-[#722F37] mt-1 block">
            {data?.cacheStats?.memoryEntriesCount || 0}
          </span>
          <span className="text-[10px] text-[#725E62] mt-1 block">
            TTL: 24 horas
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EADFD0] shadow-sm">
          <span className="text-[11px] text-[#725E62] block font-medium">Provedores Ativos</span>
          <span className="font-serif text-2xl font-bold text-purple-700 mt-1 block">
            {data?.providersHealth?.filter((p: any) => p.status === 'UP').length || 0} / 14
          </span>
          <span className="text-[10px] text-purple-600 font-semibold mt-1 block">
            Circuit Breaker Pronto
          </span>
        </div>
      </section>

      {/* Recent Searches Table */}
      <section className="bg-white rounded-3xl border border-[#EADFD0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#EADFD0] flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-[#2C2224] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#722F37]" />
            Últimas Buscas Executadas no Motor Global
          </h2>
          <span className="text-xs text-[#725E62]">Logs auditáveis sem dados sensíveis</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#EADFD0] text-[#725E62] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Consulta (Query)</th>
                <th className="px-4 py-3.5">Duração</th>
                <th className="px-4 py-3.5">Obras Resultantes</th>
                <th className="px-4 py-3.5">Deduplicados</th>
                <th className="px-5 py-3.5">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADFD0]">
              {data?.recentLogs && data.recentLogs.length > 0 ? (
                data.recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#2C2224]">
                      {log.query}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#722F37]">
                      {log.durationMs} ms
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                        {log.resultCount} obras
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {log.dedupCount} registros mesclados
                    </td>
                    <td className="px-5 py-3 text-[#725E62]">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#725E62]">
                    Nenhum log de pesquisa recente registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
