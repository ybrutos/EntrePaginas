import { describe, it, expect } from 'vitest';
import { contentAvailabilityAnalyzer } from '../src/lib/search/content-availability-analyzer';
import { WorkRecord, AccessType } from '../src/lib/providers/types';

describe('ContentAvailabilityAnalyzer • Classificação Honesta de Disponibilidade', () => {
  const baseWork: WorkRecord = {
    id: 'sample_work',
    canonicalTitle: 'Obra de Teste',
    normalizedTitle: 'obra de teste',
    authors: ['Autor Teste'],
    genres: [],
    aliases: [],
    identifiers: [],
    editions: [],
    accessLinks: [],
    audiobooks: [],
    sourcesCount: 1,
  };

  it('NUNCA deve classificar uma prévia parcial ou amostra como download gratuito', () => {
    const previewWork: WorkRecord = {
      ...baseWork,
      accessLinks: [
        {
          type: AccessType.PREVIEW,
          url: 'https://books.google.com/sample',
          label: 'Amostra de 30 páginas',
          isExternal: true,
          sourceName: 'Google Books',
          verifiedAt: new Date(),
          notes: 'Apenas amostra parcial de páginas.',
        }
      ],
    };

    const analysis = contentAvailabilityAnalyzer.analyze(previewWork);
    expect(analysis.hasLegalDownload).toBe(false);
    expect(analysis.hasPreviewOnly).toBe(true);
    expect(analysis.primaryBadge.label).toBe('Prévia Parcial (Amostra)');
    expect(analysis.explanationText).toContain('prévia parcial');
  });

  it('deve classificar corretamente um livro comercial pago sem download autorizado', () => {
    const commercialWork: WorkRecord = {
      ...baseWork,
      accessLinks: [
        {
          type: AccessType.COMMERCIAL_PURCHASE,
          url: 'https://kobo.com/ebook/123',
          label: 'Comprar eBook Comercial (R$ 49,90)',
          price: 'BRL 49.90',
          isExternal: true,
          sourceName: 'Kobo',
          verifiedAt: new Date(),
        }
      ],
    };

    const analysis = contentAvailabilityAnalyzer.analyze(commercialWork);
    expect(analysis.hasLegalDownload).toBe(false);
    expect(analysis.hasCommercialPurchase).toBe(true);
    expect(analysis.primaryBadge.label).toBe('eBook Comercial');
  });

  it('deve classificar empréstimo digital de biblioteca participante honestamente como LIBRARY_BORROW', () => {
    const borrowWork: WorkRecord = {
      ...baseWork,
      accessLinks: [
        {
          type: AccessType.LIBRARY_BORROW,
          url: 'https://libbyapp.com/search/sample',
          label: 'Empréstimo no Libby',
          isExternal: true,
          sourceName: 'OverDrive / Libby',
          verifiedAt: new Date(),
        }
      ],
    };

    const analysis = contentAvailabilityAnalyzer.analyze(borrowWork);
    expect(analysis.hasLegalDownload).toBe(false);
    expect(analysis.hasLibraryBorrow).toBe(true);
    expect(analysis.primaryBadge.label).toBe('Empréstimo em Biblioteca');
  });

  it('deve classificar obras em Domínio Público e Open Access com selo verde de Download Legal', () => {
    const publicDomainWork: WorkRecord = {
      ...baseWork,
      accessLinks: [
        {
          type: AccessType.PUBLIC_DOMAIN,
          url: 'https://www.gutenberg.org/ebooks/1.epub',
          label: 'Baixar EPUB',
          format: 'EPUB',
          isExternal: false,
          sourceName: 'Project Gutenberg',
          isDirectDownload: true,
          verifiedAt: new Date(),
        }
      ],
    };

    const analysis = contentAvailabilityAnalyzer.analyze(publicDomainWork);
    expect(analysis.hasLegalDownload).toBe(true);
    expect(analysis.primaryBadge.label).toBe('Download Legal Disponível');
  });
});
