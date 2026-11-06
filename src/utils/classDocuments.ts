import { openDB, DBSchema, IDBPDatabase } from 'idb';
import mammoth from 'mammoth';

export type ClassDocumentType = 'programme' | 'planification';

export interface ClassDocument {
  id: string;
  classId: string;
  type: ClassDocumentType;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  extractedText?: string;
  createdAt: number;
}

interface ClassDocumentsDB extends DBSchema {
  documents: {
    key: string;
    value: ClassDocument;
    indexes: {
      'by-class': string;
      'by-class-type': [string, ClassDocumentType];
    };
  };
}

let db: IDBPDatabase<ClassDocumentsDB> | null = null;

async function getDB() {
  if (db) return db;
  db = await openDB<ClassDocumentsDB>('MasterSoutienClassDocuments', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('documents')) {
        const store = database.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('by-class', 'classId');
        store.createIndex('by-class-type', ['classId', 'type']);
      }
    },
  });
  return db;
}

async function extractText(file: File): Promise<string | undefined> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'docx') {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value?.trim() || undefined;
    } catch {
      return undefined;
    }
  }
  if (ext === 'txt') return file.text();
  if (ext === 'doc') {
    return 'Aperçu limité : le format Word .DOC ancien ne peut pas toujours être lu dans le navigateur. Convertissez le document en PDF ou DOCX pour un affichage complet dans l’application.';
  }
  return undefined;
}

export async function addClassDocument(classId: string, type: ClassDocumentType, file: File) {
  const database = await getDB();
  const doc: ClassDocument = {
    id: `class-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classId,
    type,
    title: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
    extractedText: await extractText(file),
    createdAt: Date.now(),
  };
  await database.put('documents', doc);
  return doc;
}

export async function getClassDocuments(classId: string, type?: ClassDocumentType) {
  const database = await getDB();
  const docs = type
    ? await database.getAllFromIndex('documents', 'by-class-type', [classId, type])
    : await database.getAllFromIndex('documents', 'by-class', classId);
  return docs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteClassDocument(id: string) {
  const database = await getDB();
  await database.delete('documents', id);
}

export function formatDocSize(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function isPreviewablePdf(doc: ClassDocument) {
  return doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');
}
