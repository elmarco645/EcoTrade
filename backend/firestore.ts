/**
 * Firestore Service Layer
 * Provides typed CRUD helpers for common EcoTrade collections
 */
import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  coverURL?: string;
  bio?: string;
  dob?: string;
  whatsapp?: string;
  instagram?: string;
  location?: string;
  rating?: number;
  totalTrades?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Listing {
  id?: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  images: string[];
  sellerId: string;
  sellerName?: string;
  status: 'active' | 'sold' | 'reserved' | 'removed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TradeRequest {
  id?: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  listingId?: string;
  text: string;
  read: boolean;
  createdAt?: Timestamp;
}

// ──────────────────────────────────────────────
// Collection References
// ──────────────────────────────────────────────
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de';

// Use the named database if specified
const db = FIRESTORE_DB_ID && FIRESTORE_DB_ID !== '(default)'
  ? adminDb  // adminDb is already initialized; for named DBs you'd use getFirestore(app, dbId)
  : adminDb;

export const collections = {
  users: db.collection('users'),
  listings: db.collection('listings'),
  trades: db.collection('trades'),
  messages: db.collection('messages'),
  notifications: db.collection('notifications'),
} as const;

// ──────────────────────────────────────────────
// Generic CRUD Helpers
// ──────────────────────────────────────────────

/**
 * Create a document with auto-generated ID
 */
export async function createDoc<T extends Record<string, any>>(
  collectionName: keyof typeof collections,
  data: T
): Promise<string> {
  const docRef = await collections[collectionName].add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Create or overwrite a document with a specific ID
 */
export async function setDoc<T extends Record<string, any>>(
  collectionName: keyof typeof collections,
  docId: string,
  data: T,
  merge = true
): Promise<void> {
  await collections[collectionName].doc(docId).set(
    {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge }
  );
}

/**
 * Get a single document by ID
 */
export async function getDoc<T>(
  collectionName: keyof typeof collections,
  docId: string
): Promise<(T & { id: string }) | null> {
  const snap = await collections[collectionName].doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/**
 * Update specific fields on a document
 */
export async function updateDoc(
  collectionName: keyof typeof collections,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  await collections[collectionName].doc(docId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a document
 */
export async function deleteDoc(
  collectionName: keyof typeof collections,
  docId: string
): Promise<void> {
  await collections[collectionName].doc(docId).delete();
}

/**
 * Query documents with optional filters
 */
export async function queryDocs<T>(
  collectionName: keyof typeof collections,
  filters?: Array<{
    field: string;
    op: FirebaseFirestore.WhereFilterOp;
    value: any;
  }>,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  limitCount?: number
): Promise<(T & { id: string })[]> {
  let query: FirebaseFirestore.Query = collections[collectionName];

  if (filters) {
    for (const filter of filters) {
      query = query.where(filter.field, filter.op, filter.value);
    }
  }

  if (orderByField) {
    query = query.orderBy(orderByField, orderDirection);
  }

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (T & { id: string })[];
}

// ──────────────────────────────────────────────
// User-specific helpers
// ──────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDoc<UserProfile>('users', uid);
}

export async function upsertUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  return setDoc('users', uid, data, true);
}

// ──────────────────────────────────────────────
// Listing-specific helpers
// ──────────────────────────────────────────────

export async function getActiveListings(limit = 20): Promise<(Listing & { id: string })[]> {
  return queryDocs<Listing>(
    'listings',
    [{ field: 'status', op: '==', value: 'active' }],
    'createdAt',
    'desc',
    limit
  );
}

export async function getUserListings(sellerId: string): Promise<(Listing & { id: string })[]> {
  return queryDocs<Listing>(
    'listings',
    [{ field: 'sellerId', op: '==', value: sellerId }],
    'createdAt',
    'desc'
  );
}

// ──────────────────────────────────────────────
// Re-exports for convenience
// ──────────────────────────────────────────────
export { FieldValue, Timestamp };
export { db as firestoreDb };
