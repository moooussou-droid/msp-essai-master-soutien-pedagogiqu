import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, transform } from 'esbuild';
import ExcelJS from 'exceljs';

const sortSource = await readFile(new URL('../src/utils/enrollmentSort.ts', import.meta.url), 'utf8');
const { code: sortCode } = await transform(sortSource, {
  loader: 'ts',
  format: 'esm',
  target: 'node20',
});
const sortModuleUrl = `data:text/javascript;base64,${Buffer.from(sortCode).toString('base64')}`;
const { sortEnrollmentRecords } = await import(sortModuleUrl);

function student(id, classLevel, nom, prenoms) {
  return {
    id,
    classLevel,
    nom,
    prenoms,
    sexe: '',
    dateNaissance: '',
    lieuNaissance: '',
    telephoneParents: '',
    nationalite: 'Béninoise',
    npi: '',
    createdAt: 1,
  };
}

test('le tri alphabétique respecte le nom, les prénoms, les accents et ne modifie pas la saisie', () => {
  const entered = [
    student('1', 'CM2', 'Zinsou', 'Awa'),
    student('2', 'CM2', 'KOFFI', 'Yao'),
    student('3', 'CM2', 'Àhoussi', 'Jean'),
    student('4', 'CM2', 'Koffi', 'Awa'),
  ];

  const sorted = sortEnrollmentRecords(entered);
  assert.deepEqual(sorted.map(item => `${item.nom}|${item.prenoms}`), [
    'Àhoussi|Jean',
    'Koffi|Awa',
    'KOFFI|Yao',
    'Zinsou|Awa',
  ]);
  assert.equal(entered[0].nom, 'Zinsou', 'l’ordre original des données reste intact');
});

test('« Toutes » conserve les niveaux groupés, puis trie les élèves dans chaque niveau', () => {
  const entered = [
    student('1', 'CM2', 'Zinsou', 'Awa'),
    student('2', 'CP', 'Koffi', 'Yao'),
    student('3', 'CP', 'Adéoti', 'Jean'),
    student('4', 'CM2', 'Akoto', 'Mariam'),
  ];
  const sorted = sortEnrollmentRecords(entered, ['CP', 'CM2']);
  assert.deepEqual(sorted.map(item => `${item.classLevel}|${item.nom}`), [
    'CP|Adéoti',
    'CP|Koffi',
    'CM2|Akoto',
    'CM2|Zinsou',
  ]);
});

test('l’export Excel garde les onglets par niveau et trie chaque onglet par ordre alphabétique', async () => {
  const tempDir = await mkdtemp(path.join(process.cwd(), 'tests/.tmp-enrollment-sort-'));
  try {
    const outfile = path.join(tempDir, 'enrollment.mjs');
    await build({
      entryPoints: [new URL('../src/utils/enrollment.ts', import.meta.url).pathname],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
      logLevel: 'silent',
    });
    const enrollment = await import(`${pathToFileURL(outfile).href}?test=${Date.now()}`);
    const records = [
      student('1', 'CM2', 'Zinsou', 'Awa'),
      student('2', 'CM2', 'Koffi', 'Yao'),
      student('3', 'CM2', 'Àhoussi', 'Jean'),
      student('4', 'CP', 'Yehouenou', 'Mariam'),
      student('5', 'CP', 'Adéoti', 'Jean'),
    ];
    const blob = await enrollment.generateEnrollmentExcel(records, []);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await blob.arrayBuffer()));

    assert.equal(workbook.worksheets.length, enrollment.ENROLLMENT_LEVELS.length);
    const cm2 = workbook.getWorksheet('CM2');
    const cp = workbook.getWorksheet('CP');
    assert.deepEqual([2, 3, 4].map(row => cm2.getCell(row, 1).value), ['ÀHOUSSI', 'KOFFI', 'ZINSOU']);
    assert.deepEqual([2, 3].map(row => cp.getCell(row, 1).value), ['ADÉOTI', 'YEHOUENOU']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('l’écran d’enrôlement utilise le tri partagé pour son rendu après saisie', async () => {
  const screen = await readFile(new URL('../src/components/EnrollmentScreen.tsx', import.meta.url), 'utf8');
  assert.ok(screen.includes("import { sortEnrollmentRecords } from '../utils/enrollmentSort';"));
  assert.ok(screen.includes('sortEnrollmentRecords('));
  assert.ok(screen.includes("filterLevel === 'Toutes' ? ENROLLMENT_LEVELS : undefined"));
  assert.ok(screen.includes('setFilterLevel(record.classLevel);'));
  assert.ok(screen.includes("setSearch('');"), 'après la saisie, la classe choisie reste visible sans filtre de recherche');
});
