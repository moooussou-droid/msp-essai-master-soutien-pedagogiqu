export interface EnrollmentNameRecord {
  nom?: string | null;
  prenoms?: string | null;
  classLevel?: string | null;
}

const frenchNameCollator = new Intl.Collator('fr', {
  sensitivity: 'base',
  numeric: true,
});

/** Compare deux élèves par nom de famille, puis par prénoms. */
export function compareEnrollmentNames(a: EnrollmentNameRecord, b: EnrollmentNameRecord): number {
  const bySurname = frenchNameCollator.compare((a.nom || '').trim(), (b.nom || '').trim());
  if (bySurname !== 0) return bySurname;
  return frenchNameCollator.compare((a.prenoms || '').trim(), (b.prenoms || '').trim());
}

/**
 * Trie une copie de la liste : les données enregistrées gardent leur ordre de
 * saisie. Si `levelOrder` est fourni, les niveaux restent groupés dans cet
 * ordre et les élèves sont triés alphabétiquement à l'intérieur de chacun.
 */
export function sortEnrollmentRecords<T extends EnrollmentNameRecord>(
  records: readonly T[],
  levelOrder?: readonly string[],
): T[] {
  const levelRank = levelOrder
    ? new Map(levelOrder.map((level, index) => [level, index]))
    : null;

  return [...records].sort((a, b) => {
    if (levelRank) {
      const rankA = levelRank.get(a.classLevel || '') ?? levelRank.size;
      const rankB = levelRank.get(b.classLevel || '') ?? levelRank.size;
      if (rankA !== rankB) return rankA - rankB;
    }
    return compareEnrollmentNames(a, b);
  });
}
