import { ProviderCapabilities } from './types';
import { PROVIDERS_REGISTRY_CONFIG, ProviderDefinition } from './providers.config';

export type ProviderHealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'CONFIG_REQUIRED' | 'RATE_LIMITED';

export interface ProviderHealthReport {
  id: string;
  name: string;
  status: ProviderHealthStatus;
  enabled: boolean;
  priority: number;
  lastChecked?: Date;
  latencyMs: number;
  errorRatePercent: number;
  lastError?: string;
  capabilities: ProviderCapabilities;
  requiresApiKey: boolean;
  isConfigured: boolean;
  requestsCount: number;
  errorsCount: number;
}

export class ProviderHealthService {
  private metrics: Map<
    string,
    {
      requestsCount: number;
      errorsCount: number;
      lastLatencyMs: number;
      lastError?: string;
      lastChecked?: Date;
      status: ProviderHealthStatus;
    }
  > = new Map();

  constructor() {
    // Inicializa métricas para todos os provedores registrados
    for (const [id, def] of Object.entries(PROVIDERS_REGISTRY_CONFIG)) {
      const isConfigured = this.checkCredentials(def);
      const initialStatus: ProviderHealthStatus = !isConfigured ? 'CONFIG_REQUIRED' : 'UP';

      this.metrics.set(id, {
        requestsCount: 0,
        errorsCount: 0,
        lastLatencyMs: 0,
        status: initialStatus,
      });
    }
  }

  private checkCredentials(def: ProviderDefinition): boolean {
    if (!def.requiresApiKey && !def.credentialsEnvVars?.length) {
      return true;
    }
    if (def.apiKeyEnvVar && !process.env[def.apiKeyEnvVar]) {
      return false;
    }
    if (def.credentialsEnvVars?.length) {
      for (const envVar of def.credentialsEnvVars) {
        if (!process.env[envVar]) return false;
      }
    }
    return true;
  }

  recordSuccess(providerId: string, latencyMs: number) {
    const record = this.metrics.get(providerId);
    if (!record) return;

    record.requestsCount++;
    record.lastLatencyMs = latencyMs;
    record.lastChecked = new Date();

    const def = PROVIDERS_REGISTRY_CONFIG[providerId];
    if (def && !this.checkCredentials(def)) {
      record.status = 'CONFIG_REQUIRED';
    } else if (latencyMs > 5000) {
      record.status = 'DEGRADED';
    } else {
      record.status = 'UP';
    }
  }

  recordError(providerId: string, errorMsg: string, status?: number) {
    const record = this.metrics.get(providerId);
    if (!record) return;

    record.requestsCount++;
    record.errorsCount++;
    record.lastError = errorMsg;
    record.lastChecked = new Date();

    if (status === 429) {
      record.status = 'RATE_LIMITED';
    } else {
      const errorRate = record.errorsCount / record.requestsCount;
      if (errorRate > 0.5 && record.requestsCount >= 4) {
        record.status = 'DOWN';
      } else {
        record.status = 'DEGRADED';
      }
    }
  }

  getHealth(providerId: string): ProviderHealthReport | null {
    const def = PROVIDERS_REGISTRY_CONFIG[providerId];
    if (!def) return null;

    const metric = this.metrics.get(providerId) || {
      requestsCount: 0,
      errorsCount: 0,
      lastLatencyMs: 0,
      status: this.checkCredentials(def) ? 'UP' : 'CONFIG_REQUIRED',
    };

    const isConfigured = this.checkCredentials(def);
    const errorRate = metric.requestsCount > 0 ? (metric.errorsCount / metric.requestsCount) * 100 : 0;

    return {
      id: def.id,
      name: def.displayName,
      status: !isConfigured ? 'CONFIG_REQUIRED' : metric.status,
      enabled: def.enabled,
      priority: def.priority,
      lastChecked: metric.lastChecked,
      latencyMs: metric.lastLatencyMs,
      errorRatePercent: parseFloat(errorRate.toFixed(1)),
      lastError: metric.lastError,
      capabilities: def.capabilities,
      requiresApiKey: def.requiresApiKey || Boolean(def.credentialsEnvVars?.length),
      isConfigured,
      requestsCount: metric.requestsCount,
      errorsCount: metric.errorsCount,
    };
  }

  getAllHealth(): ProviderHealthReport[] {
    return Object.keys(PROVIDERS_REGISTRY_CONFIG).map((id) => this.getHealth(id)!);
  }
}

export const providerHealthService = new ProviderHealthService();
