import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');
  const format = (searchParams.get('format') || 'epub').toLowerCase();
  const title = searchParams.get('title') || 'livro';

  if (!fileUrl) {
    return NextResponse.json({ error: 'URL do arquivo não informada.' }, { status: 400 });
  }

  try {
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Falha ao obter o arquivo externo. Status: ${response.status}` },
        { status: response.status }
      );
    }

    const contentTypes: Record<string, string> = {
      epub: 'application/epub+zip',
      mobi: 'application/x-mobipocket-ebook',
      pdf: 'application/pdf',
    };

    const contentType = contentTypes[format] || response.headers.get('content-type') || 'application/octet-stream';
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const fileName = `${safeTitle || 'livro'}.${format}`;

    return new NextResponse(response.body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Erro na rota /api/download:', error);
    return NextResponse.json({ error: 'Erro ao processar download do arquivo.' }, { status: 500 });
  }
}
