/**
 * ④ MANUELS ET MATÉRIEL (v52).
 *
 * Qui détient quel manuel, ce qui est prêté, perdu, à racheter.
 * Le stock disponible est DÉDUIT des prêts : l'utilisateur ne saisit
 * jamais une quantité calculée (règle constante du projet).
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileDown, Printer, X, AlertTriangle, Package } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses, generateId } from '../utils/database';
import {
  InventoryItem, Loan, LoanState,
  loadInventory, saveInventory, itemStatus, inventorySummary,
} from '../utils/schoolLife';
import { formatFcfa } from '../utils/schoolFees';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

export default function SchoolInventoryScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [lendFor, setLendFor] = useState<InventoryItem | null>(null);
  const [lendStudent, setLendStudent] = useState('');

  useEffect(() => {
    setItems(loadInventory());
    getAllClasses().then(setClasses);
  }, []);

  const allStudents = useMemo(
    () => classes.flatMap((c) => c.students.map((s) => ({
      id: s.id, label: `${s.nom} ${s.prenoms}`.trim(), className: c.name,
    }))),
    [classes],
  );

  const summary = useMemo(() => inventorySummary(items), [items]);

  function persist(next: InventoryItem[]) {
    setItems(next);
    saveInventory(next);
  }

  function addLoan() {
    if (!lendFor || !lendStudent) return;
    const stu = allStudents.find((s) => s.id === lendStudent);
    if (!stu) return;
    const loan: Loan = {
      id: generateId(), studentId: stu.id, studentLabel: stu.label,
      date: new Date().toISOString().slice(0, 10), state: 'pret',
    };
    persist(items.map((i) =>
      i.id === lendFor.id ? { ...i, loans: [...(i.loans || []), loan], updatedAt: Date.now() } : i));
    setLendFor(null);
    setLendStudent('');
  }

  function setLoanState(itemId: string, loanId: string, state: LoanState) {
    persist(items.map((i) => (i.id !== itemId ? i : {
      ...i,
      loans: i.loans.map((l) => (l.id === loanId
        ? { ...l, state, returnedAt: state === 'rendu' ? new Date().toISOString().slice(0, 10) : l.returnedAt }
        : l)),
      updatedAt: Date.now(),
    })));
  }

  function exportPdf() {
    const pdf = makePdf({
      title: 'Inventaire des manuels et du matériel',
      subtitle: `${summary.items} article(s)`,
      establishment: profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le Directeur / La Directrice' },
    });
    pdf.keyValues([
      ['Articles', String(summary.items)],
      ['Exemplaires', String(summary.totalQuantity)],
      ['En prêt', String(summary.totalOnLoan)],
      ['Perdus ou abîmés', String(summary.totalLost)],
      ['Valeur des pertes', formatFcfa(summary.totalLossValue)],
    ]);
    pdf.table(
      [
        { header: 'Article', width: 2 },
        { header: 'Catégorie', width: 1.2 },
        { header: 'Total', width: 0.7, align: 'right' },
        { header: 'Prêtés', width: 0.8, align: 'right' },
        { header: 'Perdus', width: 0.8, align: 'right' },
        { header: 'Dispo.', width: 0.8, align: 'right' },
      ],
      items.map((i) => {
        const s = itemStatus(i);
        return [i.label, i.category, String(i.quantity), String(s.outOnLoan),
          String(s.lost + s.damaged), String(s.available)];
      }),
    );
    if (summary.inconsistencies > 0) {
      pdf.alert(`${summary.inconsistencies} article(s) en incohérence : plus d’exemplaires prêtés que possédés.`);
    }
    pdf.save('inventaire-manuels.pdf');
  }

  async function exportWord() {
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'INVENTAIRE DES MANUELS ET DU MATÉRIEL', bold: true, size: 14 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: profile.schoolName || '', size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Article', 'Catégorie', 'Total', 'Prêtés', 'Perdus', 'Disponibles', 'Valeur pertes'],
          ...items.map((i) => {
            const s = itemStatus(i);
            return [i.label, i.category, String(i.quantity), String(s.outOnLoan),
              String(s.lost + s.damaged), String(s.available), formatFcfa(s.lossValue)];
          }),
        ],
      },
    ], 'inventaire-manuels.docx', { landscape: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Manuels et matériel</h1>
            <p className="text-white/80 text-sm">Prêts, retours, pertes</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4" data-testid="synthese-inventaire">
          <div className="msp-flag-rule mb-3" />
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" /> État du stock
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div><p className="text-gray-600">Articles</p><p className="text-lg font-bold" data-testid="nb-articles">{summary.items}</p></div>
            <div><p className="text-gray-600">Total</p><p className="text-lg font-bold">{summary.totalQuantity}</p></div>
            <div><p className="text-gray-600">En prêt</p><p className="text-lg font-bold text-blue-700" data-testid="nb-prets">{summary.totalOnLoan}</p></div>
            <div><p className="text-gray-600">Perdus</p><p className="text-lg font-bold text-red-700">{summary.totalLost}</p></div>
          </div>
          {summary.totalLossValue > 0 && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              Valeur des pertes : <strong className="text-red-700">{formatFcfa(summary.totalLossValue)}</strong>
            </p>
          )}
          {summary.inconsistencies > 0 && (
            <p className="mt-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {summary.inconsistencies} incohérence(s) : plus de prêts que d’exemplaires.
            </p>
          )}
        </div>

        <button
          data-testid="btn-nouvel-article"
          onClick={() => setEditing({
            id: generateId(), label: '', category: 'Manuel', quantity: 1,
            unitValue: 0, loans: [], updatedAt: Date.now(),
          })}
          className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Ajouter un article
        </button>

        <div className="space-y-2" data-testid="liste-articles">
          {items.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Aucun article.</p>}
          {items.map((item) => {
            const s = itemStatus(item);
            return (
              <div key={item.id} className="msp-card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{item.label || 'Sans nom'}</p>
                    <p className="text-xs text-gray-500">{item.category} · {formatFcfa(item.unitValue)} l’unité</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                    s.inconsistent ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    {s.available} dispo.
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-center">
                  <div><p className="text-gray-500">Total</p><p className="font-semibold">{item.quantity}</p></div>
                  <div><p className="text-gray-500">Prêtés</p><p className="font-semibold text-blue-700">{s.outOnLoan}</p></div>
                  <div><p className="text-gray-500">Perdus</p><p className="font-semibold text-red-700">{s.lost + s.damaged}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    data-testid={`btn-preter-${item.id}`}
                    onClick={() => { setLendFor(item); setLendStudent(''); }}
                    className="bg-orange-600 text-white py-2 rounded-lg text-xs font-semibold"
                  >
                    Prêter
                  </button>
                  <button onClick={() => setEditing(item)} className="bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-semibold">Modifier</button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer cet article ?')) persist(items.filter((x) => x.id !== item.id)); }}
                    className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Suppr.
                  </button>
                </div>
                {(item.loans || []).filter((l) => l.state === 'pret').length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2 space-y-1">
                    {item.loans.filter((l) => l.state === 'pret').map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600 truncate">{l.studentLabel}</span>
                        <span className="flex gap-1 shrink-0">
                          <button onClick={() => setLoanState(item.id, l.id, 'rendu')} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-semibold">Rendu</button>
                          <button onClick={() => setLoanState(item.id, l.id, 'perdu')} className="bg-red-50 text-red-600 px-2 py-1 rounded font-semibold">Perdu</button>
                          <button onClick={() => setLoanState(item.id, l.id, 'abime')} className="bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold">Abîmé</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-inventaire" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-inventaire" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Article</h2>
              <button onClick={() => setEditing(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <input
              data-testid="champ-article" value={editing.label} placeholder="Ex. Manuel de lecture CM2"
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
            <select
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              {['Manuel', 'Cahier', 'Matériel pédagogique', 'Mobilier', 'Sport', 'Autre']
                .map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Quantité totale</span>
                <input
                  type="number" min={0} data-testid="champ-quantite" value={editing.quantity}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Valeur unitaire</span>
                <input
                  type="number" min={0} value={editing.unitValue}
                  onChange={(e) => setEditing({ ...editing, unitValue: Number(e.target.value) || 0 })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                />
              </label>
            </div>
            <button
              data-testid="btn-enregistrer-article"
              onClick={() => {
                if (!editing.label.trim()) { window.alert('Le nom est obligatoire.'); return; }
                const exists = items.some((i) => i.id === editing.id);
                persist(exists
                  ? items.map((i) => (i.id === editing.id ? editing : i))
                  : [...items, editing]);
                setEditing(null);
              }}
              className="w-full bg-[#046a38] text-white py-3 rounded-xl font-bold"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {lendFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Prêter « {lendFor.label} »</h2>
              <button onClick={() => setLendFor(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <select
              data-testid="select-eleve-pret" value={lendStudent}
              onChange={(e) => setLendStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              <option value="">Choisir un élève…</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.label} ({s.className})</option>
              ))}
            </select>
            <button
              data-testid="btn-valider-pret" onClick={addLoan} disabled={!lendStudent}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              Enregistrer le prêt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
