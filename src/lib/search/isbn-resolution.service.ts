import { BookProviderResult, EditionRecord } from '../providers/types';
import { providerRegistry } from '../providers/provider-registry';

export class IsbnResolutionService {
  /**
   * Executa busca cruzada automática por ISBN ou OCLC nos provedores que suportam isbnLookup
   */
  async crossLookup(identifiers: { isbn?: string; oclc?: string }): Promise<BookProviderResult[]> {
    if (!identifiers.isbn && !identifiers.oclc) return [];

    const capableProviders = providerRegistry.listEnabled().filter((p) => p.capabilities.isbnLookup);

    const results = await Promise.allSettled(
      capableProviders.map((provider) =>
        provider.search({
          rawQuery: identifiers.isbn || identifiers.oclc || '',
          isbn: identifiers.isbn,
          oclc: identifiers.oclc,
          limit: 3,
        })
      )
    );

    const successful: BookProviderResult[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && (res.value.works.length > 0 || res.value.editions.length > 0)) {
        successful.push(res.value);
      }
    }

    return successful;
  }
}

export const isbnResolutionService = new IsbnResolutionService();
