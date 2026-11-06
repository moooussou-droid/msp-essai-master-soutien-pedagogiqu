/**
 * CONDITIONS D'UTILISATION (v47) — consultation par tous, édition par le
 * seul Super Administrateur.
 *
 * Le mode édition n'apparaît que si la session d'administration « owner »
 * est ouverte, cohérent avec la règle : la nomination, les codes et les
 * paramètres relèvent des seuls Super Administrateurs.
 */
import { useState } from 'react';
import { ArrowLeft, FileDown, Pencil, Save, RotateCcw, X } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { isPrincipalAdminSession } from '../utils/adminSession';
import {
  getTerms, saveTerms, resetTerms, getTermsMeta, isCustomTerms, splitArticles, DEFAULT_TERMS,
} from '../utils/termsOfUse';
import { makePdf } from '../utils/pdfMaker';
import { getProfile } from '../utils/userProfile';

/** Seul le principal peut modifier les conditions. */
function isSuperAdmin(): boolean {
  return isPrincipalAdminSession();
}

export default function TermsScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [text, setText] = useState(getTerms());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [meta, setMeta] = useState(getTermsMeta());
  const [custom, setCustom] = useState(isCustomTerms());
  const admin = isSuperAdmin();

  const articles = splitArticles(text);

  function startEdit() { setDraft(text); setEditing(true); }

  function handleSave() {
    const m = saveTerms(draft, profile.teacherName || 'Super Administrateur');
    setText(getTerms());
    setMeta(m);
    setCustom(isCustomTerms());
    setEditing(false);
    window.alert('Conditions d’utilisation mises à jour.');
  }

  function handleReset() {
    if (!window.confirm('Rétablir le texte d’origine livré avec l’application ?')) return;
    resetTerms();
    setText(DEFAULT_TERMS);
    setMeta(getTermsMeta());
    setCustom(false);
    setEditing(false);
  }

  function exportPdf() {
    const pdf = makePdf({
      title: 'Conditions générales d’utilisation',
      subtitle: `Master Soutien Pédagogique — version ${meta.version}`,
      establishment: profile.schoolName || 'Master Soutien Pédagogique',
    });
    for (const a of articles) {
      if (a.heading) pdf.sectionTitle(a.heading);
      if (a.body) pdf.paragraph(a.body);
    }
    pdf.save('conditions-utilisation-msp.pdf');
  }

  const dateLabel = meta.updatedAt
    ? new Date(meta.updatedAt).toLocaleDateString('fr-FR')
    : 'texte d’origine';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Conditions d’utilisation</h1>
            <p className="text-white/80 text-sm">Version {meta.version} — {dateLabel}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10">
        {!editing && (
          <>
            <div className="msp-card p-4" data-testid="texte-conditions">
              <div className="msp-flag-rule mb-3" />
              {articles.map((a, i) => (
                <div key={i} className="mb-4">
                  {a.heading && (
                    <h2 className="font-bold text-[#046a38] text-sm mb-1">{a.heading}</h2>
                  )}
                  {a.body && (
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{a.body}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center" data-testid="meta-conditions">
              Version {meta.version} · {custom ? `modifiée par ${meta.updatedBy} le ${dateLabel}` : 'texte d’origine'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-pdf-conditions" onClick={exportPdf}
                className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <FileDown className="w-5 h-5" /> PDF
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
              >
                Imprimer
              </button>
            </div>

            {admin && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="btn-modifier-conditions" onClick={startEdit}
                  className="bg-[#046a38] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Pencil className="w-5 h-5" /> Modifier
                </button>
                <button
                  data-testid="btn-reinitialiser-conditions" onClick={handleReset}
                  className="bg-amber-100 text-amber-800 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> Texte d’origine
                </button>
              </div>
            )}

            {!admin && (
              <p className="text-xs text-gray-500 text-center">
                Seul un Super Administrateur peut modifier ce texte.
              </p>
            )}
          </>
        )}

        {editing && admin && (
          <div className="msp-card p-4 space-y-3">
            <p className="text-xs text-gray-600">
              Rédigez librement. Les lignes commençant par « ARTICLE n » sont
              automatiquement mises en évidence à l’affichage.
            </p>
            <textarea
              data-testid="editeur-conditions"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={22}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-enregistrer-conditions" onClick={handleSave}
                className="bg-[#046a38] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> Enregistrer
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" /> Annuler
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
