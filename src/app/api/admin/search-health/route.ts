import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { cacheService } from '@/lib/providers/cache.service';
import { providerHealthService } from '@/lib/providers/provider-health.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    // Últimos 20 logs de busca
    const recentLogs = await db.searchLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const totalSearches = await db.searchLog.count();
    const cacheStats = cacheService.getStats();
    const providersHealth = providerHealthService.getAllHealth();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalSearches,
      cacheStats,
      providersHealth,
      recentLogs,
    });
  } catch (error) {
    console.error('[API /api/admin/search-health] Erro:', error);
    return NextResponse.json({ error: 'Falha ao obter telemetria de busca' }, { status: 500 });
  }
}
