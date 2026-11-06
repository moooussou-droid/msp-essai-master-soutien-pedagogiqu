/**
 * Rapport d'orientation imprimable (conseil de classe / entretien parents).
 * Document HTML propre, 100 % hors-ligne, texte échappé.
 */

import { DOMAIN_LABELS, OrientationRecommendation, SubjectPerformance, ClassOrientationRow, SchoolLevel, LEVEL_LABELS } from './orientation';

export interface OrientationReportData {
  studentName: string;
  className: string;
  school: string;
  schoolYear: string;
  performances: SubjectPerformance[];
  recommendations: OrientationRecommendation[];
  domainScores: Record<string, number>;
  advice: string;
}

function esc(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOrientationReportHtml(data: OrientationReportData): string {
  const perfRows = data.performances
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(p => `<tr><td>${esc(p.subjectName)}</td><td class="num">${p.score.toFixed(2)}/20</td><td>${esc(DOMAIN_LABELS[p.domain] || p.domain)}</td></tr>`)
    .join('');

  const domainRows = Object.entries(data.domainScores)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => {
      const pct = Math.min(100, ((v ?? 0) / 20) * 100);
      return `<tr><td>${esc(DOMAIN_LABELS[k] || k)}</td><td class="num">${(v ?? 0).toFixed(1)}/20</td><td><div class="bar"><span style="width:${pct}%"></span></div></td></tr>`;
    })
    .join('');

  const recBlocks = data.recommendations
    .map(
      r => `
  <div class="rec">
    <h3>${esc(r.title)} <em>(${esc(r.priority)})</em></h3>
    <p><strong>Séries / filières :</strong> ${esc(r.series)}</p>
    <p><strong>Études :</strong> ${esc(r.studies.join(', '))}</p>
    <p><strong>Débouchés :</strong> ${esc(r.careers.join(', '))}</p>
    <p><strong>Matières à renforcer :</strong> ${esc(r.subjectsToStrengthen.join(', '))}</p>
  </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Conseil d'orientation — ${esc(data.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 22px; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .meta { font-size: 12px; color: #444; margin-bottom: 16px; }
  h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 2px solid #059669; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td, th { border: 1px solid #ccc; padding: 4px 7px; text-align: left; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .bar { background: #eee; border-radius: 4px; overflow: hidden; height: 10px; }
  .bar span { display: block; height: 10px; background: #059669; }
  .rec { border: 1px solid #ccc; border-left: 4px solid #059669; padding: 8px 10px; margin-bottom: 8px; break-inside: avoid; font-size: 12px; }
  .rec h3 { font-size: 13px; margin: 0 0 4px; }
  .rec p { margin: 2px 0; }
  .advice { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; font-size: 12.5px; margin-top: 10px; }
  .foot { margin-top: 20px; font-size: 11px; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Conseil d'orientation — ${esc(data.studentName)}</h1>
<p class="meta">${esc(data.className)} · ${esc(data.school)} · Année scolaire ${esc(data.schoolYear)} — Master Soutien Pédagogique</p>

<h2>Performances par matière</h2>
<table>
  <tr><th>Matière</th><th>Score</th><th>Domaine</th></tr>
  ${perfRows || '<tr><td colspan="3">Aucune note saisie pour cet élève.</td></tr>'}
</table>

<h2>Score par domaine</h2>
${domainRows ? `<table><tr><th>Domaine</th><th>Score</th><th>Niveau</th></tr>${domainRows}</table>` : '<p class="meta">Valeurs indisponibles (aucune note).</p>'}

<h2>Recommandations d'orientation</h2>
${recBlocks}

<h2>Conseil personnalisé</h2>
<div class="advice">${esc(data.advice)}</div>

<p class="foot">Document généré par Master Soutien Pédagogique — à remettre lors de l'entretien d'orientation.</p>
</body>
</html>`;
}

/** Ouvre une fenêtre d'impression avec le rapport. */
export function printOrientationReport(data: OrientationReportData): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildOrientationReportHtml(data));
  win.document.close();
  win.focus();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}

// ---------- Synthèse d'orientation de la classe ----------

export const STAGE_LABELS: Record<string, string> = {
  forte: 'Profil affirmé',
  moyenne: 'Profil à confirmer',
  exploratoire: 'À consolider',
  sans_note: 'Sans notes',
};

export interface ClassOrientationReportData {
  className: string;
  school: string;
  schoolYear: string;
  level: SchoolLevel;
  rows: ClassOrientationRow[];
  distribution: { domain: string; count: number }[];
  withoutNotes: number;
}

/** Rapport de synthèse d'orientation de la classe (conseil des professeurs). */
export function buildClassOrientationReportHtml(data: ClassOrientationReportData): string {
  const rowHtml = data.rows
    .map(r => {
      const name = `${esc(r.student.nom.toUpperCase())} ${esc(r.student.prenoms)}`;
      const domain = r.dominantDomain ? esc(DOMAIN_LABELS[r.dominantDomain] || r.dominantDomain) : '—';
      const score = r.dominantScore !== null ? `${r.dominantScore.toFixed(1)}/20` : '—';
      const strong = r.strongestSubject ? `${esc(r.strongestSubject)} (${r.strongestScore?.toFixed(2)}/20)` : '—';
      const stage = esc(STAGE_LABELS[r.stage] || r.stage);
      return `<tr><td>${name}</td><td>${domain}</td><td class="num">${score}</td><td>${strong}</td><td>${stage}</td></tr>`;
    })
    .join('');

  const total = Math.max(1, data.rows.length || 1);
  const distRows = (data.distribution.length
    ? data.distribution
    : [])
    .map(({ domain, count }) => {
      const pct = Math.round((count / total) * 100);
      return `<tr><td>${esc(DOMAIN_LABELS[domain] || domain)}</td><td class="num">${count} élève${count > 1 ? 's' : ''}</td><td><div class="bar"><span style="width:${pct}%"></span></div></td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Synthèse d'orientation — ${esc(data.className)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 22px; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .meta { font-size: 12px; color: #444; margin-bottom: 16px; }
  h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 2px solid #059669; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td, th { border: 1px solid #ccc; padding: 4px 7px; text-align: left; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .bar { background: #eee; border-radius: 4px; overflow: hidden; height: 10px; min-width: 120px; }
  .bar span { display: block; height: 10px; background: #059669; }
  .foot { margin-top: 20px; font-size: 11px; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Synthèse d'orientation — ${esc(data.className)}</h1>
<p class="meta">${esc(data.school)} · Année scolaire ${esc(data.schoolYear)} — ${esc(LEVEL_LABELS[data.level] || data.level)} — Master Soutien Pédagogique</p>

<h2>Profil d'orientation par élève (${data.rows.length})</h2>
<table>
  <tr><th>Élève</th><th>Profil dominant</th><th>Score</th><th>Matière la plus forte</th><th>Stade</th></tr>
  ${rowHtml || '<tr><td colspan="5">Aucun élève.</td></tr>'}
</table>

<h2>Répartition des profils</h2>
${distRows ? `<table><tr><th>Domaine</th><th>Effectif</th><th>Part de la classe</th></tr>${distRows}</table>` : '<p class="meta">Aucun profil dominant détecté (notes insuffisantes).</p>'}
${data.withoutNotes > 0 ? `<p class="meta">${data.withoutNotes} élève(s) sans notes : l'analyse d'orientation nécessite des notes — à compléter avant le conseil.</p>` : ''}

<p class="foot">Document généré par Master Soutien Pédagogique — synthèse à discuter en conseil des professeurs.</p>
</body>
</html>`;
}

/** Ouvre une fenêtre d'impression avec la synthèse de classe. */
export function printClassOrientationReport(data: ClassOrientationReportData): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildClassOrientationReportHtml(data));
  win.document.close();
  win.focus();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}
