import { NextRequest, NextResponse } from 'next/server';
import { globalSearchService } from '@/lib/search/global-search.service';
import { UnifiedBook } from '@/lib/providers/book-provider.interface';
import { AccessType } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const author = searchParams.get('author') || undefined;
    const title = searchParams.get('title') || undefined;
    const genre = searchParams.get('genre') || undefined;
    const language = searchParams.get('language') || undefined;
    const isbn = searchParams.get('isbn') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const result = await globalSearchService.search(q, {
      author,
      title,
      genre,
      language,
      isbn,
      page,
      limit,
    });

    // Mapeamento retrocompatível para UnifiedBook[] para suportar componentes visuais existentes
    const unifiedItems: UnifiedBook[] = result.works.map((work) => {
      const isPublic = work.accessLinks.some((l) => l.type === AccessType.PUBLIC_DOMAIN);
      const isbnVal = work.identifiers.find((i) => i.type.startsWith('ISBN'))?.value;
      const firstEd = work.editions[0];

      return {
        id: work.id,
        slug: work.id.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        title: work.canonicalTitle,
        subtitle: firstEd?.subtitle,
        authors: work.authors,
        description: work.description,
        coverUrl: work.coverUrl,
        publicationYear: work.firstPublicationYear || firstEd?.publicationYear,
        language: firstEd?.language || 'pt',
        genres: work.genres,
        publisher: firstEd?.publisher,
        isbn: isbnVal,
        pageCount: firstEd?.pageCount,
        isPublicDomain: isPublic,
        hasAudiobook: work.audiobooks.length > 0,
        license: isPublic ? 'Domínio Público' : 'Consulta / Direitos Reservados',
        sourcesCount: work.sourcesCount,
        sources: work.editions.map((e) => ({
          sourceName: e.sourceName,
          externalId: e.externalId,
          isLegalDownload: e.accessLinks.some((l) => l.type === AccessType.LEGAL_FREE_DOWNLOAD || l.type === AccessType.OPEN_ACCESS),
          isAudiobook: e.format?.toLowerCase().includes('áudio') || e.format?.toLowerCase().includes('audio'),
        })),
        downloadOptions: work.accessLinks.map((l) => ({
          format: l.format || 'DIGITAL',
          url: l.url,
          isDirectDownload: Boolean(l.isDirectDownload),
          notes: l.notes,
        })),
        audioOptions: work.audiobooks.map((a) => ({
          format: 'MP3',
          url: a.streamUrl || a.downloadUrl || '',
          isDirectDownload: Boolean(a.downloadUrl),
          durationMinutes: a.durationMinutes,
          narrator: a.narrator,
          audioStreamingUrl: a.streamUrl,
        })),
        audiobookDetails: work.audiobooks[0]
          ? {
              durationMinutes: work.audiobooks[0].durationMinutes,
              durationSeconds: work.audiobooks[0].durationSeconds,
              narrator: work.audiobooks[0].narrator,
              streamUrl: work.audiobooks[0].streamUrl,
              sourceName: work.audiobooks[0].sourceName,
              chaptersCount: work.audiobooks[0].chaptersCount,
            }
          : undefined,
        // Anexação direta da Work V2 para renderização enriquecida
        ...( { workRecord: work, availabilitySummary: (work as any).availabilitySummary } as any ),
      };
    });

    return NextResponse.json({
      ...result,
      totalCount: result.totalWorks,
      items: unifiedItems,
      page,
      provider: 'global_aggregated_v2',
    });
  } catch (error) {
    console.error('[API /api/search] Erro:', error);
    return NextResponse.json(
      { error: 'Falha ao executar busca global', totalCount: 0, items: [], works: [] },
      { status: 500 }
    );
  }
}
