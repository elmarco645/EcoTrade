/**
 * Firestore Hooks & Helpers for Frontend
 * Typed wrappers around Firestore client SDK for React components
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type WhereFilterOp,
  type OrderByDirection,
} from 'firebase/firestore';
import { db } from '../firebase';

// ──────────────────────────────────────────────
// Generic CRUD Operations
// ──────────────────────────────────────────────

/**
 * Create a document with auto-generated ID
 */
export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Create or merge a document with a specific ID
 */
export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  merge = true
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge });
}

/**
 * Get a single document by ID
 */
export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/**
 * Update specific fields on a document
 */
export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Query documents with filters
 */
export async function queryDocuments<T>(
  collectionName: string,
  filters?: Array<{ field: string; op: WhereFilterOp; value: any }>,
  sortField?: string,
  sortDirection: OrderByDirection = 'desc',
  limitCount?: number
): Promise<(T & { id: string })[]> {
  const constraints: QueryConstraint[] = [];

  if (filters) {
    for (const f of filters) {
      constraints.push(where(f.field, f.op, f.value));
    }
  }

  if (sortField) {
    constraints.push(orderBy(sortField, sortDirection));
  }

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (T & { id: string })[];
}

/**
 * Subscribe to real-time updates on a collection
 * Returns an unsubscribe function
 */
export function subscribeToCollection<T>(
  collectionName: string,
  callback: (docs: (T & { id: string })[]) => void,
  filters?: Array<{ field: string; op: WhereFilterOp; value: any }>,
  sortField?: string,
  sortDirection: OrderByDirection = 'desc',
  limitCount?: number
): () => void {
  const constraints: QueryConstraint[] = [];

  if (filters) {
    for (const f of filters) {
      constraints.push(where(f.field, f.op, f.value));
    }
  }

  if (sortField) {
    constraints.push(orderBy(sortField, sortDirection));
  }

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, collectionName), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as (T & { id: string })[];
    callback(docs);
  });
}

/**
 * Subscribe to real-time updates on a single document
 * Returns an unsubscribe function
 */
export function subscribeToDocument<T>(
  collectionName: string,
  docId: string,
  callback: (data: (T & { id: string }) | null) => void
): () => void {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as T & { id: string });
  });
}

// Re-export commonly used Firestore utilities
export { serverTimestamp, collection, doc, query, where, orderBy, limit };
