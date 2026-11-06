/**
 * ② SUIVI DES PAIEMENTS PAR ÉLÈVE (v52).
 *
 * Répond à la question quotidienne du directeur : « cet élève a-t-il
 * payé, et combien reste-t-il ? » Chaque versement génère un REÇU
 * numéroté et imprimable — la trace écrite qui évite les litiges.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, FileDown, Printer, Search, X, Receipt, Wallet,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses, generateId } from '../utils/database';
import {
  FeeRecord, Payment, DEFAULT_FEE_TYPES, loadFees, saveFees, totalPaid, balanceOf,
  statusOf, STATUS_LABELS, summarize, nextReceiptNo, amountInWords, formatFcfa,
} from '../utils/schoolFees';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';

const today = () => new Date().toISOString().slice(0, 10);
const frDate = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Année scolaire courante : bascule au 1er septembre. */
function currentSchoolYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const STATUS_STYLES: Record<string, string> = {
  solde: 'bg-emerald-100 text-emerald-700',
  partiel: 'bg-amber-100 text-amber-700',
  impaye: 'bg-red-100 text-red-700',
  trop_percu: 'bg-purple-100 text-purple-700',
};

export default function SchoolFeesScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FeeRecord | null>(null);
  const [payFor, setPayFor] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Espèces');

  useEffect(() => {
    getAllClasses().then((list) => {
      setClasses(list);
      if (list.length && !classId) setClassId(list[0].id);
    });
    setRecords(loadFees());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classData = classes.find((c) => c.id === classId) || null;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => !classId || r.classId === classId)
      .filter((r) => !q || r.studentLabel.toLowerCase().includes(q));
  }, [records, classId, query]);

  const summary = useMemo(() => summarize(visible), [visible]);

  function persist(next: FeeRecord[]) {
    setRecords(next);
    saveFees(next);
  }

  /** Crée une ligne d'appel de frais pour chaque élève de la classe. */
  function createForClass(feeTypeId: string) {
    if (!classData) return;
    const type = DEFAULT_FEE_TYPES.find((t) => t.id === feeTypeId);
    if (!type) return;
    const montant = Number(window.prompt(`Montant appelé par élève pour « ${type.label} » (FCFA) ?`, '0'));
    if (!Number.isFinite(montant) || montant < 0) return;

    const year = currentSchoolYear();
    const existing = new Set(
      records.filter((r) => r.classId === classId && r.feeTypeId === feeTypeId && r.schoolYear === year)
        .map((r) => r.studentId),
    );
    const nouveaux: FeeRecord[] = classData.students
      .filter((s) => !existing.has(s.id))
      .map((s) => ({
        id: generateId(),
        studentId: s.id,
        studentLabel: `${s.nom} ${s.prenoms}`.trim(),
        classId: classData.id,
        className: classData.name,
        feeTypeId: type.id,
        feeLabel: type.label,
        amountDue: montant,
        discount: 0,
        payments: [],
        schoolYear: year,
        updatedAt: Date.now(),
      }));
    if (nouveaux.length === 0) {
      window.alert('Tous les élèves de cette classe ont déjà une ligne pour ce type de frais.');
      return;
    }
    persist([...records, ...nouveaux]);
  }

  function addPayment() {
    if (!payFor) return;
    const amount = Number((payAmount || '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Montant invalide.');
      return;
    }
    const payment: Payment = {
      id: generateId(),
      date: today(),
      amount: Math.round(amount),
      receiptNo: nextReceiptNo(records),
      method: payMethod,
    };
    const next = records.map((r) =>
      r.id === payFor.id ? { ...r, payments: [...(r.payments || []), payment], updatedAt: Date.now() } : r);
    persist(next);
    const maj = next.find((r) => r.id === payFor.id)!;
    setPayFor(null);
    setPayAmount('');
    printReceipt(maj, payment);
  }

  /** Reçu officiel : un vrai PDF, plus l'impression (règle v41). */
  function printReceipt(record: FeeRecord, payment: Payment) {
    const pdf = makePdf({
      title: 'Reçu de paiement',
      subtitle: `N° ${payment.receiptNo}`,
      establishment: record.className
        ? `${profile.schoolName || 'Mon établissement'} — ${record.className}`
        : profile.schoolName,
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le percepteur', date: frDate(payment.date) },
    });
    pdf.keyValues([
      ['Reçu n°', payment.receiptNo],
      ['Date', frDate(payment.date)],
      ['Élève', record.studentLabel],
      ['Classe', record.className],
      ['Objet', record.feeLabel],
      ['Année scolaire', record.schoolYear],
      ['Mode de paiement', payment.method || 'Espèces'],
      ['Montant reçu', formatFcfa(payment.amount)],
    ]);
    pdf.paragraph(`Arrêté le présent reçu à la somme de ${amountInWords(payment.amount)}.`);
    pdf.sectionTitle('Situation du compte');
    pdf.keyValues([
      ['Montant appelé', formatFcfa(record.amountDue)],
      ['Remise', formatFcfa(record.discount)],
      ['Total versé', formatFcfa(totalPaid(record))],
      ['Reste dû', formatFcfa(balanceOf(record))],
    ]);
    if (balanceOf(record) < 0) {
      pdf.alert('Trop-perçu constaté : à régulariser auprès de la famille.');
    }
    pdf.save(`recu-${payment.receiptNo}.pdf`);
  }

  function exportSituationPdf() {
    const pdf = makePdf({
      title: 'Situation des paiements',
      subtitle: classData ? classData.name : 'Toutes les classes',
      establishment: profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le Directeur / La Directrice' },
    });
    pdf.keyValues([
      ['Montant attendu', formatFcfa(summary.expected)],
      ['Encaissé', formatFcfa(summary.collected)],
      ['Reste à recouvrer', formatFcfa(summary.outstanding)],
      ['Taux de recouvrement', `${summary.recoveryRate.toString().replace('.', ',')} %`],
      ['Soldés / partiels / impayés', `${summary.countSolde} / ${summary.countPartiel} / ${summary.countImpaye}`],
    ]);
    pdf.table(
      [
        { header: 'Élève', width: 2.2 },
        { header: 'Objet', width: 1.4 },
        { header: 'Appelé', width: 1, align: 'right' },
        { header: 'Versé', width: 1, align: 'right' },
        { header: 'Reste', width: 1, align: 'right' },
        { header: 'État', width: 0.9 },
      ],
      visible.map((r) => [
        r.studentLabel, r.feeLabel,
        formatFcfa(r.amountDue), formatFcfa(totalPaid(r)),
        formatFcfa(balanceOf(r)), STATUS_LABELS[statusOf(r)],
      ]),
    );
    if (summary.countTropPercu > 0) {
      pdf.alert(`${summary.countTropPercu} trop-perçu(s) à régulariser.`);
    }
    pdf.save('situation-paiements.pdf');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Paiements des élèves</h1>
            <p className="text-white/80 text-sm">Scolarité, cantine, fournitures</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule" />
          <select
            data-testid="select-classe-frais" value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
          >
            {classes.length === 0 && <option value="">Aucune classe</option>}
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_FEE_TYPES.map((t) => (
              <button
                key={t.id}
                data-testid={`btn-appel-${t.id}`}
                onClick={() => createForClass(t.id)}
                className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2"
              >
                + {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Crée une ligne pour chaque élève de la classe, avec le montant appelé.
          </p>
        </div>

        <div className="msp-card p-4" data-testid="synthese-frais">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" /> Recouvrement
          </h2>
          <div className="text-center bg-emerald-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-gray-600">Taux de recouvrement</p>
            <p className="text-3xl font-bold text-emerald-700" data-testid="taux-recouvrement">
              {summary.recoveryRate.toString().replace('.', ',')} %
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-600">Attendu</p>
              <p className="font-bold text-gray-800">{formatFcfa(summary.expected)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-600">Encaissé</p>
              <p className="font-bold text-emerald-700" data-testid="total-encaisse">{formatFcfa(summary.collected)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-600">Reste</p>
              <p className="font-bold text-red-700" data-testid="reste-du">{formatFcfa(summary.outstanding)}</p>
            </div>
          </div>
          {summary.countTropPercu > 0 && (
            <p className="mt-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-2">
              ⚠️ {summary.countTropPercu} trop-perçu(s) : à régulariser.
            </p>
          )}
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search" data-testid="recherche-eleve-frais" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un élève"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-3 text-base"
          />
        </div>

        <div className="space-y-2" data-testid="liste-frais">
          {visible.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune ligne. Utilisez les boutons ci-dessus pour appeler des frais.
            </p>
          )}
          {visible.map((r) => {
            const st = statusOf(r);
            return (
              <div key={r.id} className="msp-card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.studentLabel}</p>
                    <p className="text-xs text-gray-500">{r.feeLabel} · {r.schoolYear}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${STATUS_STYLES[st]}`}>
                    {STATUS_LABELS[st]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-center">
                  <div><p className="text-gray-500">Appelé</p><p className="font-semibold">{formatFcfa(r.amountDue)}</p></div>
                  <div><p className="text-gray-500">Versé</p><p className="font-semibold text-emerald-700">{formatFcfa(totalPaid(r))}</p></div>
                  <div>
                    <p className="text-gray-500">Reste</p>
                    <p className={`font-semibold ${balanceOf(r) > 0 ? 'text-red-600' : balanceOf(r) < 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                      {formatFcfa(balanceOf(r))}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    data-testid={`btn-verser-${r.studentId}`}
                    onClick={() => { setPayFor(r); setPayAmount(''); }}
                    className="bg-emerald-600 text-white py-2 rounded-lg text-xs font-semibold"
                  >
                    Encaisser
                  </button>
                  <button onClick={() => setEditing(r)} className="bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-semibold">Modifier</button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer cette ligne ?')) persist(records.filter((x) => x.id !== r.id)); }}
                    className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Suppr.
                  </button>
                </div>
                {(r.payments || []).length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    {r.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] text-gray-600 py-0.5">
                        <span>{frDate(p.date)} · {p.receiptNo} · {p.method}</span>
                        <span className="flex items-center gap-2">
                          <strong>{formatFcfa(p.amount)}</strong>
                          <button onClick={() => printReceipt(r, p)} className="text-emerald-700" title="Rééditer le reçu">
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={exportSituationPdf} data-testid="btn-pdf-frais" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>

      {/* Encaissement */}
      {payFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Encaisser un versement</h2>
              <button onClick={() => setPayFor(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600">{payFor.studentLabel} — {payFor.feeLabel}</p>
            <p className="text-xs text-gray-500">Reste dû : <strong>{formatFcfa(balanceOf(payFor))}</strong></p>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Montant reçu (FCFA)</span>
              <input
                type="number" inputMode="numeric" data-testid="champ-montant-verse"
                value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Mode</span>
              <select
                value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
              >
                <option>Espèces</option>
                <option>Mobile Money</option>
                <option>Virement</option>
                <option>Chèque</option>
              </select>
            </label>
            {payAmount && Number(payAmount) > 0 && (
              <p className="text-[11px] text-gray-500 italic">
                Soit {amountInWords(Number(payAmount))}.
              </p>
            )}
            <button
              data-testid="btn-valider-versement" onClick={addPayment}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" /> Valider et éditer le reçu
            </button>
          </div>
        </div>
      )}

      {/* Modification d'une ligne */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editing.studentLabel}</h2>
              <button onClick={() => setEditing(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Montant appelé (FCFA)</span>
              <input
                type="number" data-testid="champ-montant-appele" value={editing.amountDue}
                onChange={(e) => setEditing({ ...editing, amountDue: Number(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Remise (bourse, fratrie, cas social)</span>
              <input
                type="number" data-testid="champ-remise" value={editing.discount}
                onChange={(e) => setEditing({ ...editing, discount: Number(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>
            <button
              data-testid="btn-enregistrer-frais"
              onClick={() => {
                persist(records.map((r) => (r.id === editing.id ? { ...editing, updatedAt: Date.now() } : r)));
                setEditing(null);
              }}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
