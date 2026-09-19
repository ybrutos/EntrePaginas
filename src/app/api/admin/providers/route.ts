import { NextResponse } from 'next/server';
import { providerHealthService } from '@/lib/providers/provider-health.service';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    // Protege endpoint administrativo
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const healthList = providerHealthService.getAllHealth();
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      providers: healthList.map((h) => ({
        name: h.id,
        displayName: h.name,
        online: h.status === 'UP' || h.status === 'DEGRADED',
        status: h.status,
        latencyMs: h.latencyMs,
        error: h.lastError,
        rateLimit: 60,
        requiresApiKey: h.requiresApiKey,
        hasApiKey: h.isConfigured,
        supportsDownload: h.capabilities.legalDownload,
        supportsAudiobook: h.capabilities.audiobook,
        errorRatePercent: h.errorRatePercent,
        requestsCount: h.requestsCount,
      })),
    });
  } catch (error) {
    console.error('[API /api/admin/providers] Erro:', error);
    return NextResponse.json({ error: 'Falha ao verificar saúde dos provedores' }, { status: 500 });
  }
}
