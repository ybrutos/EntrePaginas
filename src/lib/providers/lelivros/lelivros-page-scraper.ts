/**
 * LeLivros Page Scraper
 *
 * Analisa HTML de uma página de livro e extrai:
 * - Metadados (título, autor, ISBN, capa, descrição)
 * - Todos os links candidatos a download/acesso
 * - Dados estruturados (JSON-LD, OpenGraph, meta tags)
 *
 * NÃO depende de seletores CSS específicos — usa heurísticas múltiplas.
 * NÃO fabrica URLs — retorna somente URLs encontradas no HTML.
 */

const DEBUG = process.env.NODE_ENV === 'development';
function log(msg: string) {
  if (DEBUG) console.warn(`[LeLivros:Scraper] ${msg}`);
}

/** Palavras-chave que indicam link de download/acesso */
const DOWNLOAD_KEYWORDS = [
  'download', 'baixar', 'baixe', 'ebook', 'e-book', 'livro', 'pdf', 'epub',
  'mobi', 'azw', 'azw3', 'kindle', 'ler', 'leia', 'arquivo', 'formato',
  'grátis', 'gratis', 'gratuito', 'free', 'acesso', 'acessar',
];

/** Extensões de arquivo que indicam download direto */
const FILE_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw', '.azw3', '.txt', '.mp3', '.m4b', '.zip'];

/** Map de extensão → formato */
const EXT_FORMAT_MAP: Record<string, string> = {
  '.pdf': 'PDF',
  '.epub': 'EPUB',
  '.mobi': 'MOBI',
  '.azw': 'AZW',
  '.azw3': 'AZW3',
  '.txt': 'TXT',
  '.mp3': 'MP3',
  '.m4b': 'M4B',
  '.zip': 'ZIP',
};

export interface ScrapedMetadata {
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
  pages?: number;
  description?: string;
  coverUrl?: string;
  categories?: string[];
  sourceUrl: string;
}

export interface CandidateLink {
  url: string;
  text: string;
  format?: string;
  isDirectFile: boolean;
  confidence: number;
  context: string;  // Como foi encontrado
}

export interface ScrapedBookPage {
  metadata: ScrapedMetadata;
  candidateLinks: CandidateLink[];
  rawHtml?: string;
}

/** Resolve URL relativa em absoluta */
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    if (href.startsWith('javascript:') || href.startsWith('mailto:') || href === '#') return null;
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    const base = new URL(baseUrl);
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Detecta formato pelo href/texto */
function detectFormat(href: string, text: string): string | undefined {
  const combined = `${href} ${text}`.toLowerCase();

  // Extensão direta
  for (const [ext, fmt] of Object.entries(EXT_FORMAT_MAP)) {
    if (combined.includes(ext)) return fmt;
  }

  // Palavras-chave de formato
  if (/\bpdf\b/.test(combined)) return 'PDF';
  if (/\bepub\b/.test(combined)) return 'EPUB';
  if (/\bmobi\b/.test(combined)) return 'MOBI';
  if (/\bazw3?\b/.test(combined)) return 'AZW3';
  if (/\baudiobook|audiolivro|mp3|m4b\b/.test(combined)) return 'MP3';

  return undefined;
}

/** Verifica se um href é um arquivo direto */
function isDirectFileUrl(href: string): boolean {
  try {
    const url = new URL(href);
    const path = url.pathname.toLowerCase();
    return FILE_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return FILE_EXTENSIONS.some((ext) => href.toLowerCase().endsWith(ext));
  }
}

/** Calcula confiança do link como candidato de download */
function scoreLink(href: string, text: string): number {
  let score = 0;
  const combined = `${href} ${text}`.toLowerCase();

  if (isDirectFileUrl(href)) score += 0.5;

  for (const kw of DOWNLOAD_KEYWORDS) {
    if (combined.includes(kw)) {
      score += 0.1;
      break;
    }
  }

  if (detectFormat(href, text)) score += 0.2;
  if (href.includes('download') || href.includes('baixar')) score += 0.15;

  return Math.min(score, 1.0);
}

/**
 * Extrai metadados de texto simples via regex leve.
 * Funciona sem parser DOM completo.
 */
function extractMetadata(html: string, sourceUrl: string): ScrapedMetadata {
  const meta: ScrapedMetadata = { sourceUrl };

  // OpenGraph
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
  const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1];
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];

  // HTML title tag
  const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  // JSON-LD
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  let jsonLd: any = null;
  if (jsonLdMatch) {
    try {
      jsonLd = JSON.parse(jsonLdMatch[1]);
    } catch { /* ignora */ }
  }

  meta.title = ogTitle || jsonLd?.name || jsonLd?.['@type'] === 'Book' ? jsonLd?.name : undefined;
  if (!meta.title && pageTitle) {
    // Remove sufixo do site (ex: "Dom Casmurro – Le Livros")
    meta.title = pageTitle.replace(/\s*[-–|]\s*[^-–|]+$/, '').trim();
  }

  meta.description = ogDescription || jsonLd?.description;
  meta.coverUrl = ogImage || jsonLd?.image;

  // Autor via JSON-LD
  if (jsonLd?.author) {
    const authorRaw = Array.isArray(jsonLd.author) ? jsonLd.author : [jsonLd.author];
    meta.authors = authorRaw.map((a: any) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
  }

  // ISBN via JSON-LD ou padrão no HTML
  meta.isbn13 = jsonLd?.isbn || html.match(/ISBN[:\s-]*(97[89][0-9]{10})/i)?.[1];
  meta.isbn10 = html.match(/ISBN-?10[:\s-]*([0-9]{9}[0-9X])/i)?.[1];
  meta.isbn = meta.isbn13 || meta.isbn10;

  // Ano de publicação
  const yearMatch = html.match(/(?:Publicado|Published|Ano|Year|publicação)[:\s]*(\d{4})/i);
  if (yearMatch) meta.year = parseInt(yearMatch[1]);
  if (!meta.year && jsonLd?.datePublished) {
    meta.year = parseInt(jsonLd.datePublished.substring(0, 4));
  }

  // Editora
  meta.publisher = jsonLd?.publisher?.name || jsonLd?.publisher;

  log(`Metadados extraídos: título="${meta.title}", autores=${JSON.stringify(meta.authors)}`);

  return meta;
}

/**
 * Extrai todos os links candidatos a download do HTML.
 * Usa múltiplas estratégias: <a>, data-*, iframe, scripts com URLs, JSON embutido.
 */
function extractCandidateLinks(html: string, baseUrl: string): CandidateLink[] {
  const candidates: CandidateLink[] = [];
  const seen = new Set<string>();

  function addCandidate(href: string, text: string, context: string) {
    const resolved = resolveUrl(href, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    const score = scoreLink(resolved, text);
    if (score < 0.1) return;  // Ignora links irrelevantes
    seen.add(resolved);
    candidates.push({
      url: resolved,
      text: text.trim().substring(0, 200),
      format: detectFormat(resolved, text),
      isDirectFile: isDirectFileUrl(resolved),
      confidence: score,
      context,
    });
    log(`Link candidato: ${resolved} (confiança: ${score.toFixed(2)}, formato: ${detectFormat(resolved, text) || 'desconhecido'})`);
  }

  // Estratégia 1: <a href="">
  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    addCandidate(href, text, '<a href>');
  }

  // Estratégia 2: data-url, data-download, data-href
  const dataAttrRegex = /data-(?:url|download|href|link|src)=["']([^"']+)["']/gi;
  while ((match = dataAttrRegex.exec(html)) !== null) {
    addCandidate(match[1], '', 'data-attribute');
  }

  // Estratégia 3: iframe src com arquivo
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((match = iframeRegex.exec(html)) !== null) {
    addCandidate(match[1], 'iframe', 'iframe-src');
  }

  // Estratégia 4: JSON embutido com URLs de arquivo
  const jsonUrlRegex = /"(?:url|download_url|file_url|downloadUrl|href)":\s*"(https?:[^"]+)"/gi;
  while ((match = jsonUrlRegex.exec(html)) !== null) {
    addCandidate(match[1], '', 'json-embedded');
  }

  // Estratégia 5: URLs de arquivo soltas no texto (mencionadas sem tag <a>)
  const bareUrlRegex = /https?:\/\/[^\s"'<>]+(?:\.pdf|\.epub|\.mobi|\.azw3?)/gi;
  while ((match = bareUrlRegex.exec(html)) !== null) {
    addCandidate(match[0], '', 'bare-url');
  }

  // Ordena por confiança decrescente
  candidates.sort((a, b) => b.confidence - a.confidence);

  log(`Total de links candidatos: ${candidates.length}`);
  return candidates;
}

const FETCH_OPTS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
};

/**
 * Faz scraping de uma página de livro e retorna metadados + links candidatos.
 * Retorna null se a página não puder ser acessada.
 */
export async function scrapeBookPage(pageUrl: string): Promise<ScrapedBookPage | null> {
  log(`Scraping página: ${pageUrl}`);

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);

  let html: string;
  try {
    const res = await fetch(pageUrl, { ...FETCH_OPTS, signal: controller.signal });
    if (!res.ok) {
      log(`Página retornou ${res.status}`);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) {
      log(`Content-type inesperado: ${ct}`);
      return null;
    }
    html = await res.text();
  } catch (err: any) {
    log(`Erro ao acessar página: ${err.message}`);
    return null;
  } finally {
    clearTimeout(tid);
  }

  const metadata = extractMetadata(html, pageUrl);
  const candidateLinks = extractCandidateLinks(html, pageUrl);

  return { metadata, candidateLinks };
}

/**
 * Busca via formulário de busca HTML do site (?s=query ou /search?q=query).
 * Retorna URLs das páginas de resultado encontradas.
 */
export async function searchViaHtmlForm(baseUrl: string, query: string): Promise<string[]> {
  const searchUrls = [
    `${baseUrl}/?s=${encodeURIComponent(query)}`,
    `${baseUrl}/search?q=${encodeURIComponent(query)}`,
    `${baseUrl}/busca?q=${encodeURIComponent(query)}`,
  ];

  for (const url of searchUrls) {
    log(`Tentando busca HTML: ${url}`);
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { ...FETCH_OPTS, signal: controller.signal });
      if (!res.ok) continue;
      const html = await res.text();

      // Extrai links de resultados de busca (artigos, posts)
      const bookLinks: string[] = [];
      const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
      let match: RegExpExecArray | null;
      const baseDomain = new URL(baseUrl).hostname;

      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        try {
          const linkUrl = new URL(href, baseUrl);
          // Só links do mesmo domínio, não a página de busca em si
          if (
            linkUrl.hostname === baseDomain &&
            !linkUrl.pathname.includes('/wp-') &&
            !linkUrl.pathname.includes('/feed') &&
            linkUrl.pathname.length > 1 &&
            !bookLinks.includes(linkUrl.toString()) &&
            !href.includes('?s=') &&
            !href.includes('/page/')
          ) {
            bookLinks.push(linkUrl.toString());
          }
        } catch { /* ignora */ }
      }

      const uniqueLinks = [...new Set(bookLinks)].slice(0, 10);
      log(`Busca HTML "${url}" retornou ${uniqueLinks.length} link(s) de resultado`);
      if (uniqueLinks.length > 0) return uniqueLinks;
    } catch { /* tenta próxima URL */ } finally {
      clearTimeout(tid);
    }
  }

  return [];
}
