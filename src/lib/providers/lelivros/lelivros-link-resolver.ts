/**
 * LeLivros Link Resolver
 *
 * Resolve links candidatos encontrados pelo scraper:
 * 1. Resolve redirects HTTP públicos (301/302)
 * 2. Abre páginas intermediárias e re-executa scraping
 * 3. Valida URL com HTTP HEAD (ou GET-range pequeno)
 * 4. Detecta formato via Content-Type
 * 5. Classifica o resultado em SourceAccess
 *
 * LIMITES ÉTICOS:
 * - Apenas acesso público normal
 * - Sem bypass de CAPTCHA, Cloudflare, autenticação
 * - Sem fabricação de URLs
 * - Todo resultado de fonte não verificada → UNVERIFIED_DOWNLOAD
 */

import type { SourceAccess, SourceAccessType, BackendDownloadStatus } from '../types';
import type { CandidateLink } from './lelivros-page-scraper';
import { scrapeBookPage } from './lelivros-page-scraper';

const DEBUG = process.env.NODE_ENV === 'development';
function log(msg: string) {
  if (DEBUG) console.warn(`[LeLivros:Resolver] ${msg}`);
}

const PROVIDER_NAME = 'lelivros';
const PROVIDER_LABEL = 'Le Livros';

/** Map de Content-Type → formato legível */
const CONTENT_TYPE_FORMAT: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/epub+zip': 'EPUB',
  'application/x-mobipocket-ebook': 'MOBI',
  'application/vnd.amazon.ebook': 'AZW',
  'application/zip': 'ZIP',
  'audio/mpeg': 'MP3',
  'audio/mp4': 'M4B',
  'text/plain': 'TXT',
};

function detectFormatFromContentType(ct: string): string | undefined {
  for (const [mime, fmt] of Object.entries(CONTENT_TYPE_FORMAT)) {
    if (ct.includes(mime)) return fmt;
  }
  return undefined;
}

function detectFormatFromUrl(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf')) return 'PDF';
  if (lower.includes('.epub')) return 'EPUB';
  if (lower.includes('.mobi')) return 'MOBI';
  if (lower.includes('.azw')) return 'AZW3';
  if (lower.includes('.mp3')) return 'MP3';
  if (lower.includes('.m4b')) return 'M4B';
  if (lower.includes('.txt')) return 'TXT';
  return undefined;
}

interface UrlValidationResult {
  accessible: boolean;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  finalUrl?: string;
  isBlocked: boolean;
  isRedirect: boolean;
}

/**
 * Valida uma URL usando HTTP HEAD (ou GET-range como fallback).
 * NÃO baixa o arquivo completo.
 */
async function validateUrl(url: string): Promise<UrlValidationResult> {
  log(`Validando URL: ${url}`);

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8000);

  const HEADERS = {
    'User-Agent': 'EntrePageas-Bot/1.0 (+https://entre-paginas.vercel.app; link-validation)',
    'Accept': '*/*',
    'Range': 'bytes=0-0',  // GET-range para não baixar tudo
  };

  try {
    // Tentativa 1: HEAD
    let res = await fetch(url, { method: 'HEAD', headers: HEADERS, signal: controller.signal, redirect: 'follow' });

    // Se HEAD não suportado, tenta GET-range
    if (res.status === 405 || res.status === 501) {
      log(`HEAD não suportado, tentando GET-range`);
      res = await fetch(url, { method: 'GET', headers: HEADERS, signal: controller.signal, redirect: 'follow' });
    }

    const finalUrl = res.url || url;
    const ct = res.headers.get('content-type') || '';
    const cl = parseInt(res.headers.get('content-length') || '0') || undefined;

    log(`Validação resultado: status=${res.status}, ct=${ct}, url-final=${finalUrl}`);

    const isBlocked = [401, 403, 429, 503].includes(res.status);
    const isRedirect = finalUrl !== url;

    return {
      accessible: res.ok,
      statusCode: res.status,
      contentType: ct || undefined,
      contentLength: cl,
      finalUrl: isRedirect ? finalUrl : undefined,
      isBlocked,
      isRedirect,
    };
  } catch (err: any) {
    log(`Validação falhou: ${err.message}`);
    return {
      accessible: false,
      isBlocked: false,
      isRedirect: false,
    };
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Determina o accessType e backendDownloadStatus baseado nos resultados.
 * REGRA: Toda fonte não verificada (Le Livros) → UNVERIFIED_DOWNLOAD.
 */
function classifyAccess(
  validation: UrlValidationResult | null,
  hasDownloadUrl: boolean,
  hasAccessPage: boolean,
  isUnverifiedSource: boolean
): { accessType: SourceAccessType; backendDownloadStatus: BackendDownloadStatus } {
  if (!hasDownloadUrl && !hasAccessPage) {
    return { accessType: 'METADATA_ONLY', backendDownloadStatus: 'NOT_ATTEMPTED' };
  }

  if (!hasDownloadUrl && hasAccessPage) {
    return { accessType: 'ACCESS_PAGE', backendDownloadStatus: 'NOT_ATTEMPTED' };
  }

  if (!validation) {
    // URL encontrada mas não validada
    const accessType: SourceAccessType = isUnverifiedSource ? 'UNVERIFIED_DOWNLOAD' : 'EXTERNAL_DOWNLOAD';
    return { accessType, backendDownloadStatus: 'NOT_ATTEMPTED' };
  }

  if (validation.isBlocked) {
    const accessType: SourceAccessType = isUnverifiedSource ? 'UNVERIFIED_DOWNLOAD' : 'EXTERNAL_DOWNLOAD';
    return { accessType, backendDownloadStatus: 'BLOCKED' };
  }

  if (!validation.accessible) {
    const accessType: SourceAccessType = isUnverifiedSource ? 'UNVERIFIED_DOWNLOAD' : 'EXTERNAL_DOWNLOAD';
    return { accessType, backendDownloadStatus: 'FAILED' };
  }

  // URL acessível
  const accessType: SourceAccessType = isUnverifiedSource ? 'UNVERIFIED_DOWNLOAD' : 'EXTERNAL_DOWNLOAD';
  return { accessType, backendDownloadStatus: 'BLOCKED' };
  // Nota: BLOCKED aqui significa que o backend não baixou — o usuário acessa externamente
}

/**
 * Resolve um link candidato e retorna um SourceAccess.
 * Segue a cadeia: URL → validação HEAD → página intermediária (se necessário) → classificação.
 */
async function resolveCandidateLink(
  candidate: CandidateLink,
  sourcePageUrl: string,
  chain: string[] = []
): Promise<SourceAccess | null> {
  const newChain = [...chain, candidate.url];

  // Se é arquivo direto, valida diretamente
  if (candidate.isDirectFile) {
    log(`Link direto de arquivo: ${candidate.url}`);
    const validation = await validateUrl(candidate.url);

    const format = candidate.format
      || (validation.contentType ? detectFormatFromContentType(validation.contentType) : undefined)
      || detectFormatFromUrl(candidate.url);

    const { accessType, backendDownloadStatus } = classifyAccess(
      validation, true, false, true /* isUnverifiedSource = always true for LeLivros */
    );

    return {
      sourcePageUrl,
      downloadUrl: candidate.url,
      resolvedDownloadUrl: validation.finalUrl || candidate.url,
      format,
      detectedContentType: validation.contentType,
      detectedSizeBytes: validation.contentLength,
      accessType,
      backendDownloadStatus,
      backendStatusCode: validation.statusCode,
      confidence: candidate.confidence,
      providerName: PROVIDER_NAME,
      providerLabel: PROVIDER_LABEL,
      discoveryChain: newChain,
    };
  }

  // Se parece ser uma página intermediária (não arquivo direto)
  log(`Link intermediário: ${candidate.url} — abrindo para nova busca`);

  // Evita loops infinitos
  if (chain.length >= 2) {
    log(`Limite de profundidade atingido para: ${candidate.url}`);
    return {
      sourcePageUrl,
      accessPageUrl: candidate.url,
      accessType: 'ACCESS_PAGE',
      backendDownloadStatus: 'NOT_ATTEMPTED',
      confidence: candidate.confidence * 0.7,
      providerName: PROVIDER_NAME,
      providerLabel: PROVIDER_LABEL,
      discoveryChain: newChain,
    };
  }

  // Abre a página intermediária e scrapa novamente
  const intermediatePage = await scrapeBookPage(candidate.url);

  if (!intermediatePage || intermediatePage.candidateLinks.length === 0) {
    log(`Página intermediária sem links de arquivo`);
    return {
      sourcePageUrl,
      accessPageUrl: candidate.url,
      accessType: 'ACCESS_PAGE',
      backendDownloadStatus: 'NOT_ATTEMPTED',
      confidence: candidate.confidence * 0.6,
      providerName: PROVIDER_NAME,
      providerLabel: PROVIDER_LABEL,
      discoveryChain: newChain,
    };
  }

  // Resolve os novos links candidatos encontrados na página intermediária
  const fileLinks = intermediatePage.candidateLinks.filter((l) => l.isDirectFile);
  if (fileLinks.length > 0) {
    const resolved = await resolveCandidateLink(fileLinks[0], sourcePageUrl, newChain);
    if (resolved) {
      resolved.accessPageUrl = candidate.url;
      return resolved;
    }
  }

  // Nenhum arquivo encontrado — retorna ACCESS_PAGE
  return {
    sourcePageUrl,
    accessPageUrl: candidate.url,
    accessType: 'ACCESS_PAGE',
    backendDownloadStatus: 'NOT_ATTEMPTED',
    confidence: candidate.confidence * 0.5,
    providerName: PROVIDER_NAME,
    providerLabel: PROVIDER_LABEL,
    discoveryChain: newChain,
  };
}

/**
 * Resolve múltiplos links candidatos e retorna todos os SourceAccess únicos por formato.
 * Garante que NUNCA retorna duplicatas do mesmo formato.
 */
export async function resolveAllCandidates(
  candidates: CandidateLink[],
  sourcePageUrl: string,
  maxCandidates = 8
): Promise<SourceAccess[]> {
  const toProcess = candidates.slice(0, maxCandidates);
  const results: SourceAccess[] = [];
  const seenFormats = new Set<string>();
  const seenUrls = new Set<string>();

  log(`Resolvendo ${toProcess.length} link(s) candidato(s)...`);

  for (const candidate of toProcess) {
    try {
      const resolved = await resolveCandidateLink(candidate, sourcePageUrl);
      if (!resolved) continue;

      const urlKey = resolved.downloadUrl || resolved.accessPageUrl || '';
      if (seenUrls.has(urlKey)) continue;
      seenUrls.add(urlKey);

      // Permite múltiplos formatos diferentes
      const formatKey = resolved.format || 'UNKNOWN';
      if (resolved.format && seenFormats.has(formatKey)) continue;
      if (resolved.format) seenFormats.add(formatKey);

      results.push(resolved);
    } catch (err: any) {
      log(`Erro ao resolver candidato: ${err.message}`);
    }
  }

  log(`Resolução completa: ${results.length} acesso(s) encontrado(s)`);
  return results;
}

/**
 * Cria um resultado METADATA_ONLY quando nenhuma URL de arquivo foi encontrada.
 */
export function makeMetadataOnlyAccess(sourcePageUrl: string): SourceAccess {
  return {
    sourcePageUrl,
    accessType: 'METADATA_ONLY',
    backendDownloadStatus: 'NOT_ATTEMPTED',
    confidence: 0.3,
    providerName: PROVIDER_NAME,
    providerLabel: PROVIDER_LABEL,
    discoveryChain: [sourcePageUrl],
  };
}
