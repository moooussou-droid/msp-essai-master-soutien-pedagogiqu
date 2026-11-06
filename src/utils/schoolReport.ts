/**
 * Rapport de pilotage d'établissement imprimable.
 * Synthèse destinée au directeur / à la circonscription / à l'inspection :
 * classes, effectifs, résultats, taux de réussite, saisie, alertes et élèves
 * à accompagner. Document HTML propre, 100 % hors-ligne, texte échappé.
 */

import { SchoolSummary } from './schoolStats';
import { StudentSupportItem } from './schoolStats';

export interface SchoolReportClassRow {
  name: string;
  level: string;
  effectif: number;
  moyenne: number | null;
  taux: number; // réussite %
  completion: number; // saisie %
  alert: boolean;
}

export interface SchoolReportStudents {
  className: string;
  items: StudentSupportItem[];
}

export interface SchoolReportData {
  school: string;
  circonscription: string;
  author: string;
  yearLabel: string;
  date: string;
  summary: SchoolSummary;
  classes: SchoolReportClassRow[];
  studentsToSupport: SchoolReportStudents[];
}

function esc(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSchoolReportHtml(data: SchoolReportData): string {
  const s = data.summary;

  const classRows = data.classes
    .map(c => {
      const moy = c.moyenne !== null ? c.moyenne.toFixed(2) : '—';
      const status = c.alert
        ? '<span style="color:#b45309">À suivre</span>'
        : '<span style="color:#059669">OK</span>';
      return `<tr>
  <td>${esc(c.name)} <span class="lvl">${esc(c.level || '')}</span></td>
  <td class="num">${c.effectif}</td>
  <td class="num">${moy}</td>
  <td class="num">${Math.round(c.taux)}%</td>
  <td class="num">${Math.round(c.completion)}%</td>
  <td>${status}</td>
</tr>`;
    })
    .join('');

  const studentsHtml = data.studentsToSupport
    .filter(g => g.items.length > 0)
    .map(g => `
<h3>${esc(g.className)} — ${g.items.length} élève${g.items.length > 1 ? 's' : ''} à accompagner</h3>
<table>
  <tr><th>Élève</th><th>Moyenne</th><th>Mention</th><th>Matières &lt; 10</th></tr>
  ${g.items.map(it => `<tr><td>${esc(it.name)}</td><td class="num">${it.moyenne?.toFixed(2)}/20</td><td>${esc(it.mention)}</td><td class="num">${it.weakCount}</td></tr>`).join('')}
</table>`)
    .join('');

  const alertsHtml = data.classes.filter(c => c.alert).length
    ? `<table>
  <tr><th>Classe</th><th>Effectif</th><th>Moyenne</th><th>Réussite</th><th>Saisie</th></tr>
  ${data.classes.filter(c => c.alert).map(c => `<tr><td>${esc(c.name)}</td><td class="num">${c.effectif}</td><td class="num">${c.moyenne !== null ? c.moyenne.toFixed(2) : '—'}</td><td class="num">${Math.round(c.taux)}%</td><td class="num">${Math.round(c.completion)}%</td></tr>`).join('')}
</table>`
    : '<p class="meta">Aucune classe nécessitant un suivi particulier.</p>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport de pilotage — ${esc(data.school)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 22px; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .meta { font-size: 12px; color: #444; margin-bottom: 14px; line-height: 1.5; }
  h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 2px solid #059669; padding-bottom: 3px; }
  h3 { font-size: 13px; margin: 12px 0 4px; color: #065f46; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td, th { border: 1px solid #ccc; padding: 4px 7px; text-align: left; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .lvl { color: #888; font-size: 11px; }
  .cards { display: flex; gap: 8px; margin-bottom: 14px; }
  .card { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 8px; text-align: center; }
  .card .v { font-size: 18px; font-weight: bold; color: #047857; }
  .card .l { font-size: 11px; color: #555; }
  .foot { margin-top: 20px; font-size: 11px; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Rapport de pilotage — ${esc(data.school)}</h1>
<p class="meta">
${esc(data.circonscription || 'Circonscription scolaire')}<br>
${esc(data.yearLabel)} — Établi le ${esc(data.date)}${data.author ? ` par ${esc(data.author)}` : ''}
</p>

<div class="cards">
  <div class="card"><div class="v">${s.totalStudents}</div><div class="l">Élèves (${s.count} classe${s.count > 1 ? 's' : ''})</div></div>
  <div class="card"><div class="v">${s.moyenneEcole !== null ? s.moyenneEcole.toFixed(2) : '—'}</div><div class="l">Moyenne école /20</div></div>
  <div class="card"><div class="v">${Math.round(s.tauxGlobal)}%</div><div class="l">Réussite globale</div></div>
  <div class="card"><div class="v">${Math.round(s.completionMoyenne)}%</div><div class="l">Saisie moyenne</div></div>
</div>

<h2>Vue détaillée par classe</h2>
<table>
  <tr><th>Classe</th><th>Effectif</th><th>Moyenne</th><th>Réussite</th><th>Saisie</th><th>Statut</th></tr>
  ${classRows || '<tr><td colspan="6">Aucune classe créée.</td></tr>'}
</table>

<h2>Priorités (classes à suivre)</h2>
${alertsHtml}

${studentsHtml ? `<h2>Élèves à accompagner (moyenne &lt; 10/20)</h2>${studentsHtml}` : '<h2>Élèves à accompagner (moyenne &lt; 10/20)</h2><p class="meta">Aucun élève sous la moyenne sur les classes renseignées.</p>'}

<p class="foot">Document généré par Master Soutien Pédagogique — rapport de pilotage à joindre au dossier de l'école.</p>
</body>
</html>`;
}

/** Ouvre une fenêtre d'impression avec le rapport de pilotage. */
export function printSchoolReport(data: SchoolReportData): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildSchoolReportHtml(data));
  win.document.close();
  win.focus();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}
