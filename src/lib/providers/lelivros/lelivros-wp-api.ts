/**
 * LeLivros WordPress REST API Discovery Module
 *
 * Detecta dinamicamente namespaces e endpoints WP REST disponíveis,
 * sem presumir que /wp/v2/posts seja o endpoint correto.
 *
 * NOTA: Este módulo é projetado para ser agnóstico ao domínio.
 * O domínio é configurado via LELIVROS_BASE_URL no .env.
 */

const DEBUG = process.env.NODE_ENV === 'development';

function log(msg: string) {
  if (DEBUG) console.warn(`[LeLivros:WP-API] ${msg}`);
}

export interface WpSearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype?: string;
}

export interface WpPostResult {
  id: number;
  title: { rendered: string };
  link: string;
  excerpt?: { rendered: string };
  content?: { rendered: string };
  acf?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface WpApiIndex {
  namespaces: string[];
  routes: Record<string, { methods: string[] }>;
  available: boolean;
  searchEndpoint?: string;
  postsEndpoint?: string;
}

const FETCH_OPTS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html;q=0.9',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  signal: undefined as AbortSignal | undefined,
};

async function safeFetch(url: string, timeoutMs = 8000): Promise<Response | null> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...FETCH_OPTS, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Detecta a WordPress REST API do domínio e descobre endpoints disponíveis.
 * Retorna null se o site não tiver WP REST API habilitada.
 */
export async function discoverWpApi(baseUrl: string): Promise<WpApiIndex | null> {
  const indexUrl = `${baseUrl}/wp-json/`;
  log(`Tentando WP REST index: ${indexUrl}`);

  const res = await safeFetch(indexUrl);
  if (!res || !res.ok) {
    log(`WP REST não disponível (${res?.status ?? 'timeout'})`);
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    log(`WP REST retornou content-type inválido: ${contentType}`);
    return null;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    log('WP REST index JSON inválido');
    return null;
  }

  const namespaces: string[] = data.namespaces || [];
  const routes: Record<string, { methods: string[] }> = data.routes || {};

  log(`WP REST detectado. Namespaces: ${namespaces.join(', ')}`);

  // Detectar endpoint de busca
  let searchEndpoint: string | undefined;
  if (namespaces.includes('wp/v2')) {
    searchEndpoint = `${baseUrl}/wp-json/wp/v2/search`;
    log(`Endpoint de busca detectado: ${searchEndpoint}`);
  }

  // Detectar endpoint de posts
  let postsEndpoint: string | undefined;
  const postRoutes = Object.keys(routes).filter(
    (r) => r.includes('/wp/v2/posts') || r.includes('/wp/v2/books') || r.includes('/livros')
  );
  if (postRoutes.length > 0) {
    postsEndpoint = `${baseUrl}/wp-json${postRoutes[0]}`;
    log(`Endpoint de posts detectado: ${postsEndpoint}`);
  }

  return {
    namespaces,
    routes,
    available: true,
    searchEndpoint,
    postsEndpoint,
  };
}

/**
 * Busca via WordPress REST API /wp/v2/search
 */
export async function searchViaWpApi(
  baseUrl: string,
  query: string,
  apiIndex: WpApiIndex
): Promise<WpSearchResult[]> {
  if (!apiIndex.searchEndpoint) return [];

  const url = `${apiIndex.searchEndpoint}?search=${encodeURIComponent(query)}&type=post&per_page=5`;
  log(`WP API search: ${url}`);

  const res = await safeFetch(url);
  if (!res || !res.ok) {
    log(`WP search falhou: ${res?.status ?? 'timeout'}`);
    return [];
  }

  try {
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    log(`WP API retornou ${data.length} resultado(s)`);
    return data.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      url: item.url || item.link || '',
      type: item.type || 'post',
      subtype: item.subtype,
    }));
  } catch {
    return [];
  }
}

/**
 * Busca via endpoint de posts do WP (/wp/v2/posts?search=...)
 */
export async function searchViaWpPosts(
  baseUrl: string,
  query: string,
  apiIndex: WpApiIndex
): Promise<WpSearchResult[]> {
  if (!apiIndex.postsEndpoint) {
    // Tenta posts padrão
    const defaultUrl = `${baseUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=5&_fields=id,title,link`;
    log(`WP posts fallback: ${defaultUrl}`);
    const res = await safeFetch(defaultUrl);
    if (!res || !res.ok) return [];
    try {
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item: any) => ({
        id: item.id,
        title: item.title?.rendered || '',
        url: item.link || '',
        type: 'post',
      }));
    } catch {
      return [];
    }
  }

  const url = `${apiIndex.postsEndpoint}?search=${encodeURIComponent(query)}&per_page=5`;
  log(`WP posts search: ${url}`);
  const res = await safeFetch(url);
  if (!res || !res.ok) return [];

  try {
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      id: item.id,
      title: item.title?.rendered || item.title || '',
      url: item.link || item.url || '',
      type: 'post',
    }));
  } catch {
    return [];
  }
}
