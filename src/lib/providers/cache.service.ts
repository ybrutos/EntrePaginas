import { db } from '../db';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Obtém um item do cache (primeiro memória, depois banco de dados)
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Memória local
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (mem.expiresAt > now) {
        this.stats.hits++;
        return mem.data as T;
      }
      this.memoryCache.delete(key);
    }

    // 2. Persistência no Banco (SearchCache)
    try {
      const dbEntry = await db.searchCache.findUnique({
        where: { queryHash: key },
      });

      if (dbEntry && dbEntry.expiresAt.getTime() > now) {
        const parsed = JSON.parse(dbEntry.responseJson) as T;
        this.memoryCache.set(key, { data: parsed, expiresAt: dbEntry.expiresAt.getTime() });
        this.stats.hits++;
        return parsed;
      }
    } catch {
      // Ignora falhas de conexão de cache
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Salva um item no cache
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 86400, queryMeta?: { query: string; provider: string }): Promise<void> {
    const expiresAtMs = Date.now() + ttlSeconds * 1000;
    const expiresAtDate = new Date(expiresAtMs);

    // Salva na memória
    this.memoryCache.set(key, { data, expiresAt: expiresAtMs });

    // Salva no banco de dados em background
    try {
      await db.searchCache.upsert({
        where: { queryHash: key },
        create: {
          queryHash: key,
          query: queryMeta?.query || key.slice(0, 100),
          provider: queryMeta?.provider || 'aggregated',
          responseJson: JSON.stringify(data),
          expiresAt: expiresAtDate,
        },
        update: {
          responseJson: JSON.stringify(data),
          expiresAt: expiresAtDate,
        },
      });
    } catch {
      // Falha silenciosa no banco
    }
  }

  /**
   * Estatísticas de hit/miss
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatePercent: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : '0.0',
      memoryEntriesCount: this.memoryCache.size,
    };
  }

  /**
   * Limpa cache de memória
   */
  clear() {
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
