import { WorkRecord, EditionRecord } from '../providers/types';
import { normalizeString } from '../utils/text';

export interface EntityResolutionMatch {
  matched: boolean;
  confidence: number;
  reasons: string[];
}

export class BookEntityResolver {
  /**
   * Calcula se duas obras representam a mesma obra canônica e atribui pontuação ponderada
   */
  resolveMatch(a: WorkRecord, b: WorkRecord): EntityResolutionMatch {
    const reasons: string[] = [];
    let score = 0;

    // 1. Correspondência exata por ISBN-13 ou ISBN-10 (Extremamente Forte: 1.0)
    const aIsbns = a.identifiers.filter((i) => i.type.startsWith('ISBN')).map((i) => i.value.replace(/[^\dX]/gi, ''));
    const bIsbns = b.identifiers.filter((i) => i.type.startsWith('ISBN')).map((i) => i.value.replace(/[^\dX]/gi, ''));
    const commonIsbn = aIsbns.find((isbn) => bIsbns.includes(isbn));

    if (commonIsbn) {
      reasons.push(`Mesmo ISBN identificado (${commonIsbn})`);
      score = Math.max(score, 1.0);
    }

    // 2. Correspondência exata por OCLC (Extremamente Forte: 0.95)
    const aOclc = a.identifiers.find((i) => i.type === 'OCLC')?.value;
    const bOclc = b.identifiers.find((i) => i.type === 'OCLC')?.value;
    if (aOclc && bOclc && aOclc === bOclc) {
      reasons.push(`Mesmo identificador OCLC (${aOclc})`);
      score = Math.max(score, 0.95);
    }

    // 3. Título Traduzido ou Alias Canônico Registrado (0.85)
    const aAliases = a.aliases.map((al) => normalizeString(al.title));
    const bAliases = b.aliases.map((al) => normalizeString(al.title));
    const normATitle = normalizeString(a.canonicalTitle);
    const normBTitle = normalizeString(b.canonicalTitle);

    const isAliasMatch =
      aAliases.includes(normBTitle) ||
      bAliases.includes(normATitle) ||
      (a.originalTitle && normalizeString(a.originalTitle) === normBTitle) ||
      (b.originalTitle && normalizeString(b.originalTitle) === normATitle);

    if (isAliasMatch) {
      reasons.push('Título traduzido ou alias oficial correspondente');
      score = Math.max(score, 0.85);
    }

    // 4. Autor e Título correspondentes (Forte: 0.85)
    const normAAuthor = normalizeString(a.primaryAuthorName || a.authors[0] || '');
    const normBAuthor = normalizeString(b.primaryAuthorName || b.authors[0] || '');

    const hasSameAuthor = normAAuthor && normBAuthor && (normAAuthor.includes(normBAuthor) || normBAuthor.includes(normAAuthor));
    const hasSameTitle = normATitle === normBTitle;

    if (hasSameAuthor && hasSameTitle) {
      reasons.push('Mesmo autor e mesmo título canônico');
      score = Math.max(score, 0.90);
    } else if (hasSameAuthor && (normATitle.includes(normBTitle) || normBTitle.includes(normATitle))) {
      reasons.push('Mesmo autor e variação do subtítulo da obra');
      score = Math.max(score, 0.75);
    }

    // 5. Ano e Editora (Complementar: 0.35)
    if (a.firstPublicationYear && b.firstPublicationYear && Math.abs(a.firstPublicationYear - b.firstPublicationYear) <= 1) {
      if (hasSameTitle) {
        reasons.push('Ano de primeira publicação compatível');
        score = Math.min(1.0, score + 0.1);
      }
    }

    const matched = score >= 0.70;

    return {
      matched,
      confidence: parseFloat(score.toFixed(2)),
      reasons,
    };
  }

  /**
   * Consolida duas obras que representam o mesmo livro canônico
   */
  mergeWorks(target: WorkRecord, source: WorkRecord, reasons: string[], confidence: number): WorkRecord {
    // Mescla edições sem duplicar identificador externo
    const existingEdExternalIds = new Set(target.editions.map((e) => e.externalId));
    for (const ed of source.editions) {
      if (!existingEdExternalIds.has(ed.externalId)) {
        target.editions.push(ed);
        existingEdExternalIds.add(ed.externalId);
      }
    }

    // Mescla links de acesso
    const existingLinkUrls = new Set(target.accessLinks.map((l) => l.url));
    for (const link of source.accessLinks) {
      if (!existingLinkUrls.has(link.url)) {
        target.accessLinks.push(link);
        existingLinkUrls.add(link.url);
      }
    }

    // Mescla audiolivros
    const existingAudioIds = new Set(target.audiobooks.map((a) => a.id));
    for (const audio of source.audiobooks) {
      if (!existingAudioIds.has(audio.id)) {
        target.audiobooks.push(audio);
        existingAudioIds.add(audio.id);
      }
    }

    // Mescla identificadores
    const existingIdentValues = new Set(target.identifiers.map((i) => `${i.type}:${i.value}`));
    for (const ident of source.identifiers) {
      const key = `${ident.type}:${ident.value}`;
      if (!existingIdentValues.has(key)) {
        target.identifiers.push(ident);
        existingIdentValues.add(key);
      }
    }

    // Mescla aliases
    const existingAliasTitles = new Set(target.aliases.map((a) => normalizeString(a.title)));
    for (const alias of source.aliases) {
      const norm = normalizeString(alias.title);
      if (!existingAliasTitles.has(norm)) {
        target.aliases.push(alias);
        existingAliasTitles.add(norm);
      }
    }

    // Se a fonte possui título em português e o target em inglês, preserva como alias
    if (source.canonicalTitle !== target.canonicalTitle) {
      const normSource = normalizeString(source.canonicalTitle);
      if (!existingAliasTitles.has(normSource)) {
        target.aliases.push({
          title: source.canonicalTitle,
          aliasType: 'ALTERNATIVE_TITLE',
          source: source.editions[0]?.sourceName,
        });
      }
    }

    // Preserva melhor capa
    if (!target.coverUrl && source.coverUrl) {
      target.coverUrl = source.coverUrl;
    }

    // Preserva melhor descrição
    if (!target.description && source.description) {
      target.description = source.description;
    }

    // Atualiza contadores e score
    target.sourcesCount = new Set(target.editions.map((e) => e.sourceName)).size;
    target.matchConfidence = Math.max(target.matchConfidence || 0, confidence);
    target.matchReasons = Array.from(new Set([...(target.matchReasons || []), ...reasons]));

    return target;
  }

  /**
   * Deduplica e resolve entidades em uma lista de obras agregadas
   */
  deduplicateAndResolve(works: WorkRecord[]): WorkRecord[] {
    const resolved: WorkRecord[] = [];

    for (const incoming of works) {
      let matchedWork: WorkRecord | null = null;
      let highestMatch: EntityResolutionMatch = { matched: false, confidence: 0, reasons: [] };

      for (const existing of resolved) {
        const match = this.resolveMatch(existing, incoming);
        if (match.matched && match.confidence > highestMatch.confidence) {
          highestMatch = match;
          matchedWork = existing;
        }
      }

      if (matchedWork) {
        this.mergeWorks(matchedWork, incoming, highestMatch.reasons, highestMatch.confidence);
      } else {
        resolved.push({
          ...incoming,
          matchConfidence: 1.0,
          matchReasons: ['Registro primário'],
        });
      }
    }

    return resolved;
  }
}

export const bookEntityResolver = new BookEntityResolver();
