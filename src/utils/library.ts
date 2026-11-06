/**
 * BIBLIOTHÈQUE DE LIVRES (v38).
 *
 * Les livres mis en ligne suivent EXACTEMENT la même règle que les cours :
 * un livre payant n'est consultable qu'en extrait ; l'accès complet et le
 * téléchargement du PDF exigent un paiement auprès du Super Administrateur,
 * qui déverrouille ensuite l'ouvrage.
 */

export interface BookItem {
  id: string;
  title: string;
  author: string;
  level: string;
  category: string;
  description: string;
  /** Extrait librement consultable (premières pages, résumé). */
  excerpt: string;
  /** Contenu intégral, réservé aux utilisateurs ayant payé. */
  content: string;
  type: 'gratuit' | 'payant';
  price: string;
  /** PDF téléchargeable après déverrouillage. */
  pdfUrl?: string;
  coverUrl?: string;
  createdAt: number;
}

export const BOOKS_KEY = 'msp_library_books';

export function loadBooks(): BookItem[] {
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveBooks(books: BookItem[]): void {
  try { localStorage.setItem(BOOKS_KEY, JSON.stringify(books)); } catch { /* quota */ }
}

export function addBook(book: Omit<BookItem, 'id' | 'createdAt'>): BookItem {
  const b: BookItem = { ...book, id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
  saveBooks([b, ...loadBooks()]);
  return b;
}

export function removeBook(id: string): void {
  saveBooks(loadBooks().filter((b) => b.id !== id));
}

export function filterBooks(query: string, category: string, books = loadBooks()): BookItem[] {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return books.filter((b) => {
    if (category && category !== 'Toutes' && b.category !== category) return false;
    if (!q) return true;
    const hay = `${b.title} ${b.author} ${b.description} ${b.level} ${b.category}`
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return hay.includes(q);
  });
}

export const BOOK_CATEGORIES = [
  'Manuel scolaire',
  'Littérature',
  'Pédagogie',
  'Documentation',
  'Annales et sujets',
  'Jeunesse',
];
