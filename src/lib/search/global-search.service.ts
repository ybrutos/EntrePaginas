import { WorkRecord, BookSearchQuery, BookProviderResult, AccessType } from '../providers/types';
import { providerRegistry } from '../providers/provider-registry';
import { queryExpansionService } from './query-expansion.service';
import { isbnResolutionService } from './isbn-resolution.service';
import { bookEntityResolver } from './book-entity-resolver';
import { contentAvailabilityAnalyzer } from './content-availability-analyzer';
import { cacheService } from '../providers/cache.service';
import { db } from '../db';

export interface GlobalSearchResult {
  query: string;
  normalizedQuery: string;
  expandedQueries: string[];
  totalWorks: number;
  works: WorkRecord[];
  providersExecuted: string[];
  providersFailed: string[];
  durationMs: number;
  sourcesOverview: {
    totalQueried: number;
    responded: number;
    failed: number;
    configRequired: number;
  };
}

export class GlobalSearchService {
  /**
   * Executa a busca universal em todos os provedores legítimos
   */
  async search(rawQuery: string, options?: Partial<BookSearchQuery>): Promise<GlobalSearchResult> {
    const start = Date.now();
    const cleanRaw = (rawQuery || '').trim();

    // 1. Cache Check
    const cacheKey = `v2:global:${cleanRaw.toLowerCase()}:${JSON.stringify(options || {})}`;
    const cached = await cacheService.get<GlobalSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Query Normalization & Expansion
    const expanded = queryExpansionService.expand(cleanRaw);

    // 3. Montagem da Query Central
    const searchQuery: BookSearchQuery = {
      rawQuery: cleanRaw,
      title: options?.title || expanded.detectedTitle,
      author: options?.author || expanded.detectedAuthor,
      isbn: options?.isbn || expanded.detectedIsbn,
      oclc: options?.oclc || expanded.detectedOclc,
      language: options?.language,
      genre: options?.genre,
      year: options?.year,
      limit: options?.limit || 12,
      page: options?.page || 1,
    };

    // 4. Busca Paralela nos Provedores (Promise.allSettled)
    const providerResults = await providerRegistry.searchAll(searchQuery);

    const rawWorks: WorkRecord[] = [];
    const providersExecuted: string[] = [];
    const providersFailed: string[] = [];
    let configRequiredCount = 0;

    for (const res of providerResults) {
      if (res.status === 'fulfilled') {
        const val = res.value;
        providersExecuted.push(val.providerId);
        if (val.error?.includes('CONFIG_REQUIRED')) {
          configRequiredCount++;
        }
        if (val.works && val.works.length > 0) {
          rawWorks.push(...val.works);
        }
      } else {
        providersFailed.push(res.reason?.message || 'Falha no provedor');
      }
    }

    // 5. Cascade ISBN Lookup se identificadores novos foram descobertos
    const discoveredIsbns = new Set<string>();
    for (const w of rawWorks) {
      for (const ident of w.identifiers) {
        if (ident.type.startsWith('ISBN') && ident.value) {
          discoveredIsbns.add(ident.value);
        }
      }
    }

    // Se encontramos ISBNs e a busca inicial foi por texto, tenta cross-lookup
    if (discoveredIsbns.size > 0 && !searchQuery.isbn) {
      const firstIsbn = Array.from(discoveredIsbns)[0];
      const crossResults = await isbnResolutionService.crossLookup({ isbn: firstIsbn });
      for (const cr of crossResults) {
        if (cr.works && cr.works.length > 0) {
          rawWorks.push(...cr.works);
        }
      }
    }

    // 6. Entity Resolution & Deduplicação Canônica 2.0
    let consolidatedWorks = bookEntityResolver.deduplicateAndResolve(rawWorks);

    // 7. Enriquecimento de Metadados e Disponibilidade
    for (const work of consolidatedWorks) {
      // Se há traduções conhecidas na expansão de busca para este título, anexa como alias
      for (const t of expanded.translations) {
        const exists = work.aliases.some((a) => a.title.toLowerCase() === t.title.toLowerCase());
        if (!exists && work.canonicalTitle.toLowerCase() !== t.title.toLowerCase()) {
          work.aliases.push({
            title: t.title,
            language: t.language,
            aliasType: t.type === 'ORIGINAL' ? 'ORIGINAL_TITLE' : 'TRANSLATED_TITLE',
          });
        }
      }

      // Calcula resumo de disponibilidade
      const availabilitySummary = contentAvailabilityAnalyzer.analyze(work);
      // Anexa nos metadados da obra para renderização rica
      (work as any).availabilitySummary = availabilitySummary;
    }

    // 8. Ordenação e Ranking
    consolidatedWorks.sort((a, b) => {
      // Prioriza obras com maior quantidade de fontes e confiança
      const aScore = (a.matchConfidence || 0.5) * 10 + (a.sourcesCount || 1) * 2;
      const bScore = (b.matchConfidence || 0.5) * 10 + (b.sourcesCount || 1) * 2;
      return bScore - aScore;
    });

    const durationMs = Date.now() - start;

    const result: GlobalSearchResult = {
      query: cleanRaw,
      normalizedQuery: expanded.normalizedQuery,
      expandedQueries: expanded.searchVariants,
      totalWorks: consolidatedWorks.length,
      works: consolidatedWorks,
      providersExecuted,
      providersFailed,
      durationMs,
      sourcesOverview: {
        totalQueried: providerResults.length,
        responded: providersExecuted.length,
        failed: providersFailed.length,
        configRequired: configRequiredCount,
      },
    };

    // 9. Cache Salvo em Memória e Banco
    await cacheService.set(cacheKey, result, 86400, {
      query: cleanRaw,
      provider: 'global_search_v2',
    });

    // 10. Gravação Assíncrona de Log de Auditoria
    try {
      db.searchLog.create({
        data: {
          query: cleanRaw,
          normalizedQuery: expanded.normalizedQuery,
          expandedQueriesJson: JSON.stringify(expanded.searchVariants),
          providersExecuted: JSON.stringify(providersExecuted),
          providersFailed: JSON.stringify(providersFailed),
          durationMs,
          resultCount: consolidatedWorks.length,
          dedupCount: rawWorks.length - consolidatedWorks.length,
        },
      }).catch(() => {});
    } catch {
      // Ignora erro de telemetria
    }

    return result;
  }
}

export const globalSearchService = new GlobalSearchService();
