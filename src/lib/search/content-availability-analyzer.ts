import { WorkRecord, BookAccessLink, AccessType, BookAvailabilityInfo } from '../providers/types';

export interface WorkAvailabilitySummary {
  hasLegalDownload: boolean;
  hasLibraryBorrow: boolean;
  hasPreviewOnly: boolean;
  hasCommercialPurchase: boolean;
  hasFullTextOnline: boolean;
  hasAudiobook: boolean;
  hasMetadataOnly: boolean;
  legalDownloadCount: number;
  borrowCount: number;
  previewCount: number;
  commercialCount: number;
  audiobookCount: number;
  totalAccessModesCount: number;
  primaryBadge: {
    label: string;
    badgeClass: string;
    description: string;
  };
  explanationText: string;
}

export class ContentAvailabilityAnalyzer {
  /**
   * Analisa rigorosamente os links de acesso da obra e gera o resumo de disponibilidade honesta
   */
  analyze(work: WorkRecord): WorkAvailabilitySummary {
    const links = work.accessLinks || [];
    const audiobooks = work.audiobooks || [];

    let hasLegalDownload = false;
    let hasLibraryBorrow = false;
    let hasPreviewOnly = false;
    let hasCommercialPurchase = false;
    let hasFullTextOnline = false;
    let hasAudiobook = audiobooks.length > 0;
    let hasMetadataOnly = false;

    let legalDownloadCount = 0;
    let borrowCount = 0;
    let previewCount = 0;
    let commercialCount = 0;
    let audiobookCount = audiobooks.length;

    for (const link of links) {
      switch (link.type) {
        case AccessType.LEGAL_FREE_DOWNLOAD:
        case AccessType.OPEN_ACCESS:
        case AccessType.PUBLIC_DOMAIN:
          hasLegalDownload = true;
          legalDownloadCount++;
          break;

        case AccessType.LIBRARY_BORROW:
        case AccessType.CONTROLLED_DIGITAL_LENDING:
          hasLibraryBorrow = true;
          borrowCount++;
          break;

        case AccessType.PREVIEW:
          hasPreviewOnly = true;
          previewCount++;
          break;

        case AccessType.COMMERCIAL_PURCHASE:
        case AccessType.COMMERCIAL_SUBSCRIPTION:
          hasCommercialPurchase = true;
          commercialCount++;
          break;

        case AccessType.FULL_TEXT_ONLINE:
          hasFullTextOnline = true;
          break;

        case AccessType.AUDIOBOOK_FREE:
        case AccessType.AUDIOBOOK_LIBRARY_BORROW:
          hasAudiobook = true;
          audiobookCount++;
          break;

        case AccessType.METADATA_ONLY:
        case AccessType.SEARCH_ONLY:
          hasMetadataOnly = true;
          break;
      }
    }

    const totalAccessModesCount =
      legalDownloadCount + borrowCount + previewCount + commercialCount + audiobookCount;

    // Determina o selo primário honesto
    let primaryBadge = {
      label: 'Registro Bibliográfico',
      badgeClass: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-900/60 dark:text-stone-300 dark:border-stone-800',
      description: 'Apenas catálogo e metadados disponíveis.',
    };

    if (hasLegalDownload) {
      primaryBadge = {
        label: 'Download Legal Disponível',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        description: 'Livro completo integral autorizado em domínio público ou acesso aberto.',
      };
    } else if (hasFullTextOnline) {
      primaryBadge = {
        label: 'Texto Online Completo',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        description: 'Leitura integral autorizada no navegador via fonte aberta.',
      };
    } else if (hasAudiobook) {
      primaryBadge = {
        label: 'Audiolivro Completo',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        description: 'Gravação voluntária ou parceira de audiolivro integral.',
      };
    } else if (hasLibraryBorrow) {
      primaryBadge = {
        label: 'Empréstimo em Biblioteca',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
        description: 'Disponível para empréstimo digital através de bibliotecas participantes.',
      };
    } else if (hasPreviewOnly) {
      primaryBadge = {
        label: 'Prévia Parcial (Amostra)',
        badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
        description: 'Apenas amostra de demonstração (não é o livro completo).',
      };
    } else if (hasCommercialPurchase) {
      primaryBadge = {
        label: 'eBook Comercial',
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
        description: 'Edição comercial paga sem download gratuito encontrado.',
      };
    }

    // Texto explicativo transparente
    const parts: string[] = [];
    if (legalDownloadCount > 0) parts.push(`🟢 ${legalDownloadCount} fonte(s) com download legal completo`);
    if (borrowCount > 0) parts.push(`🔵 ${borrowCount} fonte(s) com empréstimo digital de biblioteca`);
    if (previewCount > 0) parts.push(`🟡 ${previewCount} fonte(s) com prévia parcial`);
    if (commercialCount > 0) parts.push(`🟠 ${commercialCount} fonte(s) comerciais`);
    if (audiobookCount > 0) parts.push(`🎧 ${audiobookCount} opção(ões) de audiolivro`);
    if (hasMetadataOnly && parts.length === 0) parts.push('⚪ Catálogo bibliográfico para consulta');

    const explanationText = parts.length > 0 
      ? `Encontramos ${work.editions.length} edição(ões) nesta obra:\n` + parts.join('\n')
      : 'Registro bibliográfico localizado.';

    return {
      hasLegalDownload,
      hasLibraryBorrow,
      hasPreviewOnly,
      hasCommercialPurchase,
      hasFullTextOnline,
      hasAudiobook,
      hasMetadataOnly,
      legalDownloadCount,
      borrowCount,
      previewCount,
      commercialCount,
      audiobookCount,
      totalAccessModesCount,
      primaryBadge,
      explanationText,
    };
  }
}

export const contentAvailabilityAnalyzer = new ContentAvailabilityAnalyzer();
