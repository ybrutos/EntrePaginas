import { BookProvider, BookSearchQuery, BookProviderResult } from './types';
import { PROVIDERS_REGISTRY_CONFIG } from './providers.config';
import { providerHealthService } from './provider-health.service';

import { OpenLibraryProvider } from './openlibrary/openlibrary.provider';
import { GutenbergProvider } from './gutenberg/gutenberg.provider';
import { StandardEbooksProvider } from './standardebooks/standardebooks.provider';
import { LibriVoxProvider } from './librivox/librivox.provider';
import { InternetArchiveProvider } from './internetarchive/internetarchive.provider';
import { GoogleBooksProvider } from './googlebooks/googlebooks.provider';
import { OverDriveProvider } from './overdrive/overdrive.provider';
import { WorldCatProvider } from './worldcat/worldcat.provider';
import { HathiTrustProvider } from './hathitrust/hathitrust.provider';
import { EuropeanaProvider } from './europeana/europeana.provider';
import { WikisourceProvider } from './wikisource/wikisource.provider';
import { DOABProvider } from './doab/doab.provider';
import { OAPENProvider } from './oapen/oapen.provider';
import { ScieloBooksProvider } from './brazilian/scielo.provider';
import { LeLivrosProvider } from './lelivros/lelivros.provider';

export class ProviderRegistry {
  private providers: Map<string, BookProvider> = new Map();

  constructor() {
    this.register(new OpenLibraryProvider());
    this.register(new GutenbergProvider());
    this.register(new StandardEbooksProvider());
    this.register(new LibriVoxProvider());
    this.register(new InternetArchiveProvider());
    this.register(new GoogleBooksProvider());
    this.register(new OverDriveProvider());
    this.register(new WorldCatProvider());
    this.register(new HathiTrustProvider());
    this.register(new EuropeanaProvider());
    this.register(new WikisourceProvider());
    this.register(new DOABProvider());
    this.register(new OAPENProvider());
    this.register(new ScieloBooksProvider());
    this.register(new LeLivrosProvider());
  }

  register(provider: BookProvider) {
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  get(id: string): BookProvider | undefined {
    return this.providers.get(id);
  }

  list(): BookProvider[] {
    return Array.from(this.providers.values());
  }

  listEnabled(): BookProvider[] {
    return this.list().filter((p) => {
      const cfg = PROVIDERS_REGISTRY_CONFIG[p.id];
      return cfg ? cfg.enabled : true;
    });
  }

  /**
   * Executa busca paralela em todos os provedores habilitados com Promise.allSettled()
   * Cada provedor roda isolado e com telemetria automática.
   */
  async searchAll(query: BookSearchQuery): Promise<PromiseSettledResult<BookProviderResult>[]> {
    const activeProviders = this.listEnabled();

    return Promise.allSettled(
      activeProviders.map(async (provider) => {
        const start = Date.now();
        try {
          const res = await provider.search(query);
          const latency = Date.now() - start;

          if (res.error) {
            providerHealthService.recordError(provider.id, res.error);
          } else {
            providerHealthService.recordSuccess(provider.id, latency);
          }

          return res;
        } catch (err: any) {
          providerHealthService.recordError(provider.id, err.message);
          return {
            providerId: provider.id,
            totalCount: 0,
            page: query.page || 1,
            works: [],
            editions: [],
            error: err.message,
            latencyMs: Date.now() - start,
          };
        }
      })
    );
  }
}

export const providerRegistry = new ProviderRegistry();
