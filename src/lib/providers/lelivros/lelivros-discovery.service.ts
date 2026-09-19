/**
 * LeLivros Discovery Service — Orquestrador Principal
 *
 * Implementa o pipeline de descoberta em cascata:
 * A. WordPress REST API → B. Busca HTML → C. Query Expansion
 *
 * Para cada candidato encontrado:
 * 1. Scraping da página da obra
 * 2. Extração de metadados
 * 3. Descoberta de links candidatos
 * 4. Resolução de redirects + validação
 * 5. Retorno de SourceAccess[] estruturado
 *
 * Fluxo de decisão (Regra de Ouro):
 *   ENCONTROU OBRA? → ENCONTROU ARQUIVO? → VALIDAÇÃO → CLASSIFICAÇÃO
 *   Falha no download ≠ Falha na descoberta
 */

import { discoverWpApi, searchViaWpApi, searchViaWpPosts, WpApiIndex } from './lelivros-wp-api';
import { scrapeBookPage, searchViaHtmlForm, ScrapedBookPage, ScrapedMetadata } from './lelivros-page-scraper';
import { resolveAllCandidates, makeMetadataOnlyAccess } from './lelivros-link-resolver';
import type { SourceAccess } from '../types';

const DEBUG = process.env.NODE_ENV === 'development';
function log(msg: string) {
  if (DEBUG) console.warn(`[LeLivros:Discovery] ${msg}`);
}

export interface DiscoveryQuery {
  rawQuery: string;
  title?: string;
  author?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
}

export interface DiscoveredBook {
  title?: string;
  originalTitle?: string;
  authors?: string[];
  translator?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  description?: string;
  coverUrl?: string;
  categories?: string[];
  sourcePageUrl: string;
  sourceAccesses: SourceAccess[];
}

/** Variações de query para expandir a busca */
function expandQuery(query: DiscoveryQuery): string[] {
  const variants: string[] = [];
  const raw = query.rawQuery.trim();

  variants.push(raw);

  // Variações de maiúsculas
  variants.push(raw.toLowerCase());

  // Sem artigos iniciais comuns
  const noArticle = raw.replace(/^(o|a|os|as|um|uma|the|an|a)\s+/i, '').trim();
  if (noArticle !== raw) variants.push(noArticle);

  // Autor separado
  if (query.author) {
    variants.push(query.author);
    variants.push(`${query.author} ${raw}`);
  }

  // Título limpo (sem subtítulo)
  const noSubtitle = raw.split(/[:\-–]/, 1)[0].trim();
  if (noSubtitle !== raw && noSubtitle.length > 3) variants.push(noSubtitle);

  // ISBNs
  if (query.isbn13) variants.push(query.isbn13);
  if (query.isbn10) variants.push(query.isbn10);
  if (query.isbn) variants.push(query.isbn);

  log(`Query expandida para ${variants.length} variante(s): ${variants.join(' | ')}`);

  // Remove duplicatas e limita
  return [...new Set(variants)].slice(0, 6);
}

/** Calcula pontuação de similaridade simples entre dois títulos */
function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 2));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Verifica se uma página candidata parece ser sobre a obra buscada */
function isCandidateRelevant(pageTitle: string | undefined, query: DiscoveryQuery): boolean {
  if (!pageTitle) return true;  // Sem título para comparar — mantém candidato
  const similarity = titleSimilarity(pageTitle, query.rawQuery);
  log(`Relevância "${pageTitle}" vs "${query.rawQuery}": ${similarity.toFixed(2)}`);
  return similarity >= 0.2;  // Limiar baixo — prefere não descartar
}

/**
 * Executa uma tentativa de descoberta para uma URL de resultado de busca.
 * Retorna DiscoveredBook ou null se não for relevante.
 */
async function discoverFromUrl(
  url: string,
  query: DiscoveryQuery
): Promise<DiscoveredBook | null> {
  log(`Abrindo página candidata: ${url}`);
  const page = await scrapeBookPage(url);

  if (!page) {
    log(`Página inacessível: ${url}`);
    return null;
  }

  if (!isCandidateRelevant(page.metadata.title, query)) {
    log(`Página irrelevante (título muito diferente): ${page.metadata.title}`);
    return null;
  }

  log(`Obra identificada: "${page.metadata.title}" (${page.candidateLinks.length} link(s) candidato(s))`);

  // Resolução de links
  let sourceAccesses: SourceAccess[] = [];

  if (page.candidateLinks.length > 0) {
    sourceAccesses = await resolveAllCandidates(page.candidateLinks, url);
  }

  // Se nenhum link foi resolvido, retorna ACCESS_PAGE
  if (sourceAccesses.length === 0) {
    sourceAccesses = [makeMetadataOnlyAccess(url)];
  }

  return {
    title: page.metadata.title,
    authors: page.metadata.authors,
    isbn: page.metadata.isbn,
    isbn10: page.metadata.isbn10,
    isbn13: page.metadata.isbn13,
    publisher: page.metadata.publisher,
    year: page.metadata.year,
    description: page.metadata.description,
    coverUrl: page.metadata.coverUrl,
    sourcePageUrl: url,
    sourceAccesses,
  };
}

export class LeLivrosDiscoveryService {
  private readonly baseUrl: string;
  private wpApiIndex: WpApiIndex | null | undefined = undefined;  // undefined = não verificado ainda

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /** Obtém ou descobre o índice da WP REST API (cacheado por instância) */
  private async getWpApiIndex(): Promise<WpApiIndex | null> {
    if (this.wpApiIndex !== undefined) return this.wpApiIndex;
    this.wpApiIndex = await discoverWpApi(this.baseUrl);
    return this.wpApiIndex;
  }

  /**
   * Pipeline principal de descoberta.
   * Retorna lista de obras descobertas (possivelmente vazia).
   */
  async discover(query: DiscoveryQuery): Promise<DiscoveredBook[]> {
    log(`\n═══ INÍCIO DA DESCOBERTA ═══`);
    log(`Query: "${query.rawQuery}"`);

    const variants = expandQuery(query);
    const candidateUrls = new Set<string>();
    const results: DiscoveredBook[] = [];

    // ─── ESTRATÉGIA A: WordPress REST API ───
    log(`[Estratégia A] WordPress REST API`);
    const wpIndex = await this.getWpApiIndex();

    if (wpIndex?.available) {
      for (const variant of variants.slice(0, 3)) {
        log(`[WP-API] Buscando: "${variant}"`);
        const wpResults = await searchViaWpApi(this.baseUrl, variant, wpIndex);

        if (wpResults.length === 0) {
          const postResults = await searchViaWpPosts(this.baseUrl, variant, wpIndex);
          wpResults.push(...postResults);
        }

        for (const r of wpResults) {
          if (r.url) candidateUrls.add(r.url);
        }

        if (candidateUrls.size > 0) {
          log(`[WP-API] Encontrou ${candidateUrls.size} candidato(s) com "${variant}"`);
          break;
        }
      }
    } else {
      log(`[WP-API] Não disponível — pulando`);
    }

    // ─── ESTRATÉGIA B: Busca HTML ───
    if (candidateUrls.size === 0) {
      log(`[Estratégia B] Busca HTML`);
      for (const variant of variants.slice(0, 4)) {
        log(`[HTML] Buscando: "${variant}"`);
        const htmlLinks = await searchViaHtmlForm(this.baseUrl, variant);

        for (const l of htmlLinks) candidateUrls.add(l);

        if (candidateUrls.size > 0) {
          log(`[HTML] Encontrou ${candidateUrls.size} candidato(s) com "${variant}"`);
          break;
        }
      }
    }

    // ─── ANÁLISE DOS CANDIDATOS ───
    if (candidateUrls.size === 0) {
      log(`Nenhum candidato encontrado — retornando vazio`);
      return [];
    }

    log(`[Análise] Processando ${candidateUrls.size} candidato(s)...`);

    const urlList = Array.from(candidateUrls).slice(0, 5);

    for (const url of urlList) {
      try {
        const discovered = await discoverFromUrl(url, query);
        if (discovered) {
          results.push(discovered);
          if (results.length >= 3) break;  // Máximo de 3 resultados por busca
        }
      } catch (err: any) {
        log(`Erro ao processar candidato "${url}": ${err.message}`);
      }
    }

    log(`═══ FIM DA DESCOBERTA: ${results.length} obra(s) ═══\n`);
    return results;
  }
}
