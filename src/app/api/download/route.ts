import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'standardebooks.org',
  'www.gutenberg.org',
  'gutenberg.org',
  'archive.org',
  'librivox.org',
  // Internet archive subdomains are handled via string match
]);

function isHostAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith('.archive.org')) return true;
  return false;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'epub': 'application/epub+zip',
  'pdf': 'application/pdf',
  'mobi': 'application/x-mobipocket-ebook',
  'txt': 'text/plain',
  'mp3': 'audio/mpeg',
  'zip': 'application/zip'
};

const MAX_DOWNLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100MB 

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrlStr = searchParams.get('url');
  const format = (searchParams.get('format') || 'epub').toLowerCase();
  const title = searchParams.get('title') || 'livro';

  if (!fileUrlStr) {
    return NextResponse.json({ error: 'URL do arquivo não informada.' }, { status: 400 });
  }

  // 1. Validação de URL Segura (SSRF / IP Privado protegido por domínio exato e HTTPS obrigatório)
  let currentUrl: URL;
  try {
    currentUrl = new URL(fileUrlStr);
    if (currentUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Apenas protocolo HTTPS é permitido.' }, { status: 400 });
    }
    if (!isHostAllowed(currentUrl.hostname)) {
      return NextResponse.json({ error: 'Host não autorizado para download.' }, { status: 403 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
  }

  try {
    // 2. Resolução segura de Redirects
    let response: Response | null = null;
    let maxRedirects = 5;
    let urlToFetch = currentUrl.toString();

    for (let i = 0; i < maxRedirects; i++) {
      response = await fetch(urlToFetch, {
        headers: { 'User-Agent': 'EntrePaginas/2.0' },
        redirect: 'manual', 
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return NextResponse.json({ error: 'Redirecionamento inválido sem cabeçalho Location.' }, { status: 502 });
        }
        
        const nextUrl = new URL(location, urlToFetch);
        if (nextUrl.protocol !== 'https:') {
          return NextResponse.json({ error: 'Redirecionamento bloqueado: Protocolo inseguro.' }, { status: 403 });
        }
        if (!isHostAllowed(nextUrl.hostname)) {
          return NextResponse.json({ error: `Redirecionamento bloqueado: Host ${nextUrl.hostname} não autorizado.` }, { status: 403 });
        }
        urlToFetch = nextUrl.toString();
        continue;
      }
      
      break;
    }

    if (!response || response.status >= 300) {
      return NextResponse.json({ error: 'Muitos redirecionamentos ou falha na origem.' }, { status: 502 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Falha ao obter o arquivo externo. Status: ${response.status}` },
        { status: response.status }
      );
    }

    // 3. Validação de Content-Type real
    const actualContentType = (response.headers.get('content-type') || '').toLowerCase();
    if (actualContentType.includes('text/html') || actualContentType.includes('application/xhtml')) {
      return NextResponse.json(
        { error: 'A fonte retornou uma página web (HTML) em vez de um arquivo digital válido.' },
        { status: 422 }
      );
    }

    const expectedMime = ALLOWED_MIME_TYPES[format];
    const finalMime = expectedMime || actualContentType || 'application/octet-stream';

    // 4. Validação de Limite de Tamanho
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (bytes > MAX_DOWNLOAD_SIZE_BYTES) {
        return NextResponse.json({ error: 'Arquivo excede o tamanho máximo permitido (100MB).' }, { status: 413 });
      }
    }

    // 5. Content-Disposition Seguro
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${safeTitle || 'livro'}.${safeFormat || 'epub'}`;

    return new NextResponse(response.body as any, {
      status: 200,
      headers: {
        'Content-Type': finalMime,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Erro na rota /api/download:', error);
    return NextResponse.json({ error: 'Erro de SSRF ou falha de conexão com a fonte.' }, { status: 500 });
  }
}
