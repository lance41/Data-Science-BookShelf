/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  deleteField,
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getBlob,
  getDownloadURL, 
  deleteObject,
  getMetadata
} from 'firebase/storage';
import {
  getAuth
} from 'firebase/auth';
import { Book } from '../types';

// The Firebase config should be:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Add safe console logs showing whether each env variable exists, but do not print the actual API key.
console.log('[Firebase Init] Checking environment variables:');
console.log(' - VITE_FIREBASE_API_KEY exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log(' - VITE_FIREBASE_AUTH_DOMAIN exists:', !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? `(${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN})` : '(missing)');
console.log(' - VITE_FIREBASE_PROJECT_ID exists:', !!import.meta.env.VITE_FIREBASE_PROJECT_ID, import.meta.env.VITE_FIREBASE_PROJECT_ID ? `(${import.meta.env.VITE_FIREBASE_PROJECT_ID})` : '(missing)');
console.log(' - VITE_FIREBASE_STORAGE_BUCKET exists:', !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? `(${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET})` : '(missing)');
console.log(' - VITE_FIREBASE_MESSAGING_SENDER_ID exists:', !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? `(${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID})` : '(missing)');
console.log(' - VITE_FIREBASE_APP_ID exists:', !!import.meta.env.VITE_FIREBASE_APP_ID, import.meta.env.VITE_FIREBASE_APP_ID ? `(${import.meta.env.VITE_FIREBASE_APP_ID})` : '(missing)');

// Check if any config parameter is present (do not require measurementId, check required fields)
export const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

let app: any = null;
export let db: any = null;
export let storage: any = null;
export let auth: any = null;

if (isFirebaseConfigured) {
  try {
    // Initialize Firebase app only once.
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Firestore using getFirestore(app).
    db = getFirestore(app);
    // Initialize Auth using getAuth(app).
    auth = getAuth(app);
    // Initialize Storage using getStorage(app).
    storage = getStorage(app);
    
    console.log('[Firebase] Successfully initialized custom project cloud database, auth, and storage services.');

    // After Firebase initializes, query the Firestore collection named exactly "books" and log the number of books loaded.
    getDocs(collection(db, 'books'))
      .then(snapshot => {
        console.log(`[Firebase Startup Verification] Successfully queried "books" collection. Loaded ${snapshot.size} books.`);
        snapshot.forEach(doc => {
          console.log(`   - Book document ID: "${doc.id}", title: "${doc.data().title || 'Untitled'}"`);
        });
      })
      .catch(err => {
        console.error('[Firebase Startup Verification] Error loading from "books" collection:', err);
      });
  } catch (err) {
    console.error('[Firebase] Lazy initialization error:', err);
  }
} else {
  console.log('[Firebase] Cloud credentials not found in env, activating ultra-durable Local IndexedDB storage fallback.');
}

// -------------------------------------------------------------
// LOCAL DURABLE PERSISTENCE: INDEXEDDB ENGINE FOR FILES & BLOB URL COVERS
// -------------------------------------------------------------
const DB_NAME = 'datascience_library_files';
const STORE_NAME = 'book_blobs';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store a binary file in local IndexedDB
export async function storeFileInIndexedDB(id: string, file: Blob | File): Promise<string> {
  const localDb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = localDb.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, id);
    request.onsuccess = () => resolve(`idxdb://${id}`);
    request.onerror = () => reject(request.error);
  });
}

// Load a binary file from IndexedDB
export async function getFileFromIndexedDB(id: string): Promise<Blob | null> {
  const localDb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = localDb.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Delete a binary file from IndexedDB
export async function deleteFileFromIndexedDB(id: string): Promise<void> {
  const localDb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = localDb.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// UNIFIED DATA OPERATIONS BLOCK
// -------------------------------------------------------------

/**
 * Validate storagePath strictly:
 * - Must be a relative Firebase Storage path starting with 'books/'
 * - Must not contain query strings, tokens, HTTP/HTTPS protocols, or path traversal
 */
export function validateStoragePath(storagePath?: string | null): boolean {
  if (!storagePath || typeof storagePath !== 'string') return false;
  const path = storagePath.trim();
  if (!path.startsWith('books/')) return false;
  if (path.includes('?') || path.includes('&') || path.includes('token=')) return false;
  if (path.startsWith('http://') || path.startsWith('https://')) return false;
  if (path.includes('../') || path.includes('..\\')) return false;
  return true;
}

/**
 * Helper to determine if a URL/path references an app-owned Firebase Storage object
 */
export function isAppOwnedStorageObject(urlOrPath?: string | null): boolean {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;
  const clean = urlOrPath.trim();
  if (clean.startsWith('books/')) return true;
  if (clean.includes('firebasestorage.googleapis.com') || clean.includes('storage.googleapis.com')) {
    return clean.includes('books%2F') || clean.includes('/books/');
  }
  return false;
}

/**
 * Sanitize filename to ensure safe storage path
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'book_file.pdf';
  const cleanName = filename.split('/').pop()?.split('\\').pop() || filename;
  return cleanName.replace(/[^a-zA-Z0-9_.\-]/g, '_');
}

/**
 * Derive storagePath from Firebase Storage URL (decodes encoded paths like books%2Fcustom-123%2Fbook.pdf)
 */
export function deriveStoragePathFromUrl(fileUrl?: string): string | null {
  if (!fileUrl) return null;
  try {
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      const match = fileUrl.match(/\/o\/([^?#]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('books/') || decoded.includes('/')) {
          return decoded;
        }
        return decoded;
      }
    } else if (fileUrl.includes('storage.googleapis.com')) {
      const urlObj = new URL(fileUrl);
      const pathname = decodeURIComponent(urlObj.pathname);
      const booksIdx = pathname.indexOf('books/');
      if (booksIdx !== -1) {
        return pathname.substring(booksIdx);
      }
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    }
  } catch (err) {
    console.error('[Safe Log] Failed to parse storage URL path:', err);
  }
  return null;
}

/**
 * Upload protected book file to Firebase Storage (books/{bookId}/{sanitizedFilename})
 * Does NOT call getDownloadURL() or return permanent download URLs.
 */
export async function uploadBookProtectedFile(
  bookId: string,
  file: File | Blob,
  originalFilename?: string,
  fileType: 'pdf' | 'epub' = 'pdf'
): Promise<{ storagePath: string }> {
  const cleanBookId = bookId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const sFilename = sanitizeFilename(originalFilename || (file instanceof File ? file.name : `book.${fileType}`));
  const storagePath = `books/${cleanBookId}/${sFilename}`;

  if (!validateStoragePath(storagePath)) {
    throw new Error(`Generated storagePath is invalid: ${storagePath}`);
  }

  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, storagePath);
      console.log(`[Safe Log] Uploading protected book file. book ID: ${cleanBookId}, storagePath present: yes`);
      await uploadBytes(storageRef, file);
      return { storagePath };
    } catch (err) {
      console.error(`[Safe Log] Storage upload failed for book ID: ${cleanBookId}`, err);
      throw err;
    }
  }

  // Fallback to IndexedDB
  const idValue = `${cleanBookId}_${fileType}`;
  await storeFileInIndexedDB(idValue, file);
  return { storagePath: `idxdb://${idValue}` };
}

/**
 * Fetch authenticated blob from Firebase Storage and create an in-memory object URL.
 * Returns the object URL and a cleanup handler to revoke URL.
 */
export async function getProtectedFileObjectUrl(storagePath: string): Promise<{ url: string; cleanup: () => void }> {
  if (!storagePath) {
    throw new Error('No storagePath provided.');
  }

  // Handle IndexedDB fallback
  if (storagePath.startsWith('idxdb://')) {
    const res = await resolveBookFileUrl(storagePath);
    return {
      url: res.url,
      cleanup: res.cleanup || (() => {})
    };
  }

  // Validate path strictly
  if (!validateStoragePath(storagePath)) {
    throw new Error(`Invalid storagePath format: "${storagePath}". Path must be a relative Firebase Storage path starting with 'books/'.`);
  }

  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  try {
    const storageRef = ref(storage, storagePath);
    console.log(`[Safe Log] Fetching authenticated blob for storagePath present: yes`);
    const blob = await getBlob(storageRef);
    const objectUrl = URL.createObjectURL(blob);
    console.log(`[Safe Log] Created in-memory object URL for storagePath present: yes`);

    return {
      url: objectUrl,
      cleanup: () => {
        try {
          URL.revokeObjectURL(objectUrl);
          console.log(`[Safe Log] Revoked object URL`);
        } catch (_) {}
      }
    };
  } catch (err: any) {
    console.error(`[Safe Log] Error loading authenticated blob for storagePath:`, err?.code || err?.message);
    if (err?.code === 'storage/cors-unauthorized' || String(err?.message || '').toLowerCase().includes('cors') || String(err?.message || '').toLowerCase().includes('cross-origin')) {
      throw new Error(`Firebase Storage CORS restriction encountered. Please configure CORS origin headers on your storage bucket gs://${firebaseConfig.storageBucket} or ensure you are signed in.`);
    }
    throw err;
  }
}

/**
 * Get dynamic protected download URL at runtime for authorized viewers
 */
export async function getProtectedDownloadUrl(storagePath: string): Promise<string> {
  const res = await getProtectedFileObjectUrl(storagePath);
  return res.url;
}

/**
 * Admin Replacement Workflow: Replace Book File
 */
export async function replaceBookFile(
  book: Book,
  newFile: File
): Promise<{ storagePath: string; fileType: 'pdf' | 'epub'; warning?: string }> {
  if (!auth?.currentUser || auth.currentUser.email !== 'adiemus80@gmail.com') {
    throw new Error('Unauthorized: Replacement workflow requires administrator authentication (adiemus80@gmail.com).');
  }

  const extension = newFile.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'epub') {
    throw new Error('Invalid file type. Replacement file must be a .pdf or .epub file.');
  }
  const fileType: 'pdf' | 'epub' = extension;

  const oldStoragePath = book.storagePath || (book.fileUrl ? deriveStoragePathFromUrl(book.fileUrl) : null);

  // 1. Upload replacement file to safe Storage path books/{bookId}/{sanitizedFilename}
  console.log(`[Safe Log] Uploading replacement file for book ID: ${book.id}`);
  const { storagePath: newStoragePath } = await uploadBookProtectedFile(book.id, newFile, newFile.name, fileType);

  if (!validateStoragePath(newStoragePath) && !newStoragePath.startsWith('idxdb://')) {
    throw new Error(`Generated storage path is invalid: ${newStoragePath}`);
  }

  // 2. Attempt the Firestore storagePath update
  try {
    if (isFirebaseConfigured && db) {
      const bookRef = doc(db, 'books', book.id);
      await updateDoc(bookRef, {
        storagePath: newStoragePath,
        fileType,
        updatedAt: new Date().toISOString()
      });
      console.log(`[Safe Log] Firestore updated with new storagePath for book ID: ${book.id}`);
    } else {
      const stored = localStorage.getItem('datascience_bookshelf');
      if (stored) {
        const books: Book[] = JSON.parse(stored);
        const idx = books.findIndex(b => b.id === book.id);
        if (idx !== -1) {
          books[idx].storagePath = newStoragePath;
          books[idx].fileType = fileType;
          books[idx].updatedAt = new Date().toISOString();
          localStorage.setItem('datascience_bookshelf', JSON.stringify(books));
        }
      }
    }
  } catch (err: any) {
    console.error(`[Safe Log] Failed updating Firestore during replacement for book ID: ${book.id}`, err);
    
    // 3. If Firestore update fails: delete the newly uploaded replacement object, retain old Storage object and old storagePath
    let cleanupReport = '';
    if (isFirebaseConfigured && storage && !newStoragePath.startsWith('idxdb://')) {
      try {
        const newRef = ref(storage, newStoragePath);
        await deleteObject(newRef);
        cleanupReport = ' (Newly uploaded replacement object was successfully cleaned up)';
        console.log(`[Safe Log] Cleaned up newly uploaded object after Firestore failure: ${newStoragePath}`);
      } catch (cleanupErr: any) {
        cleanupReport = ` (Warning: Cleanup of newly uploaded object failed: ${cleanupErr?.message || cleanupErr})`;
        console.error(`[Safe Log] Failed to delete newly uploaded object after Firestore failure:`, cleanupErr);
      }
    }

    throw new Error(`Failed to update book metadata record: ${err?.message || err}. Old file retained.${cleanupReport}`);
  }

  // 4. If Firestore update succeeds: delete the old Storage object
  let warning: string | undefined = undefined;
  if (oldStoragePath && oldStoragePath !== newStoragePath && !oldStoragePath.startsWith('idxdb://') && isFirebaseConfigured && storage) {
    try {
      const oldRef = ref(storage, oldStoragePath);
      await deleteObject(oldRef);
      console.log(`[Safe Log] Deleted obsolete storage object: ${oldStoragePath}`);
    } catch (err: any) {
      // 5. If deletion of old object fails: keep new Firestore storagePath, report old object as orphan-cleanup warning
      warning = `Book storagePath updated successfully, but deleting obsolete Storage object (${oldStoragePath}) failed: ${err?.message || err}`;
      console.warn(`[Safe Log] Orphan-cleanup warning:`, warning);
    }
  }

  return { storagePath: newStoragePath, fileType, warning };
}

/**
 * Handle uploading legacy/generic files (e.g. covers)
 */
export async function uploadBookFile(
  bookId: string, 
  file: File | Blob, 
  fileExtension: string,
  type: 'pdf' | 'epub' | 'cover'
): Promise<string> {
  if (type === 'pdf' || type === 'epub') {
    const res = await uploadBookProtectedFile(bookId, file, (file as File).name || `file.${fileExtension}`, type);
    return res.storagePath;
  }

  if (isFirebaseConfigured && storage) {
    try {
      const cleanBookId = bookId.replace(/[^a-zA-Z0-9_\-]/g, '');
      const path = `books/${cleanBookId}/cover_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, path);
      
      console.log(`[Safe Log] Uploading cover image. book ID: ${cleanBookId}`);
      const snapshot = await uploadBytes(storageRef, file);
      // Public cover image artwork URL resolution only (getDownloadURL is restricted to public assets)
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.error('[Safe Log] Failed cover upload, saving to local offline DB:', err);
    }
  }

  const idValue = `${bookId}_${type}`;
  await storeFileInIndexedDB(idValue, file);
  return `idxdb://${idValue}`;
}

/**
 * Resolve any URL (checking if it starts with idxdb:// and converting it to object URL dynamically)
 */
export async function resolveBookFileUrl(url: string): Promise<{ url: string; cleanup?: () => void }> {
  if (url.startsWith('idxdb://')) {
    const key = url.replace('idxdb://', '');
    try {
      const blob = await getFileFromIndexedDB(key);
      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        return {
          url: objUrl,
          cleanup: () => {
            URL.revokeObjectURL(objUrl);
          }
        };
      }
    } catch (e) {
      console.error('[IndexedDB] Failed resolving file url:', e);
    }
  }
  return { url };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Save book metadata to Firestore
 */
export async function saveBookMetadata(book: Book): Promise<void> {
  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      console.log('[Safe Log] Saving book metadata for title:', book.title);
      // Clean Firestore object from undefined values or functions
      const cleanBook = JSON.parse(JSON.stringify({
        ...book,
        createdAt: book.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      await setDoc(doc(db, 'books', book.id), cleanBook);
      return;
    } catch (err: any) {
      console.error('[Firebase Firestore] Error saving metadata document:', err);
      if (err?.code === 'permission-denied' || String(err).includes('permission') || (err instanceof Error && err.message.includes('permission'))) {
        handleFirestoreError(err, OperationType.WRITE, `books/${book.id}`);
      }
      throw err;
    }
  }

  // Sync back to local storage list
  const stored = localStorage.getItem('datascience_bookshelf');
  let books: Book[] = [];
  if (stored) {
    books = JSON.parse(stored);
  }
  const index = books.findIndex(b => b.id === book.id);
  if (index !== -1) {
    books[index] = book;
  } else {
    books.unshift(book);
  }
  localStorage.setItem('datascience_bookshelf', JSON.stringify(books));
}

/**
 * Delete book metadata and Storage file
 */
export async function deleteBookFromStorage(book: Book): Promise<void> {
  const bookId = book.id;
  console.log(`[Safe Log] Initiating delete for book ID: ${bookId}, storagePath present: ${!!book.storagePath ? 'yes' : 'no'}`);

  // 1. Clean local files from local IndexedDB if present
  await deleteFileFromIndexedDB(`${bookId}_pdf`);
  await deleteFileFromIndexedDB(`${bookId}_epub`);
  await deleteFileFromIndexedDB(`${bookId}_cover`);

  // 2. Delete Storage object first if configured
  if (isFirebaseConfigured && storage) {
    let targetPath = book.storagePath;
    if (!targetPath && book.fileUrl) {
      targetPath = deriveStoragePathFromUrl(book.fileUrl) || undefined;
    }

    if (targetPath && !targetPath.startsWith('idxdb://') && validateStoragePath(targetPath)) {
      try {
        const fileRef = ref(storage, targetPath);
        await deleteObject(fileRef);
        console.log(`[Safe Log] Deleted storage object for book ID: ${bookId}`);
      } catch (err: any) {
        if (err?.code === 'storage/object-not-found' || String(err).includes('object-not-found')) {
          console.warn(`[Safe Log] Storage object already missing for book ID: ${bookId}. Proceeding with document cleanup.`);
        } else {
          console.error(`[Safe Log] Failed deleting Storage object for book ID: ${bookId}:`, err);
          throw new Error(`Failed to delete book file from Firebase Storage: ${err?.message || err}`);
        }
      }
    }

    // Attempt deleting cover image if stored in app-owned Firebase Storage
    const coversToCheck = [book.coverImage, book.coverImageUrl].filter(Boolean);
    for (const coverRefString of coversToCheck) {
      if (coverRefString && isAppOwnedStorageObject(coverRefString)) {
        const coverPath = coverRefString.startsWith('books/') ? coverRefString : deriveStoragePathFromUrl(coverRefString);
        if (coverPath && !coverPath.startsWith('idxdb://')) {
          try {
            await deleteObject(ref(storage, coverPath));
            console.log(`[Safe Log] Deleted cover image object for book ID: ${bookId}`);
          } catch (err) {
            console.warn(`[Safe Log] Non-critical: Could not delete cover object (${coverPath}) for book ID: ${bookId}`);
          }
        }
      }
    }
  }

  // 3. Delete Firestore document AFTER Storage object deletion succeeds (or object confirmed missing)
  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'books', bookId));
      console.log(`[Safe Log] Deleted Firestore book metadata document for book ID: ${bookId}`);
    } catch (err: any) {
      console.error(`[Safe Log] Failed to delete Firestore document for book ID: ${bookId}:`, err);
      handleFirestoreError(err, OperationType.DELETE, `books/${bookId}`);
    }
  } else {
    // Local storage sync fallback
    const stored = localStorage.getItem('datascience_bookshelf');
    if (stored) {
      const books: Book[] = JSON.parse(stored);
      const filtered = books.filter(b => b.id !== bookId);
      localStorage.setItem('datascience_bookshelf', JSON.stringify(filtered));
    }
  }
}

/**
 * Migration Utility Stage 1: Migrate Legacy File References
 */
export interface MigrationItemResult {
  bookId: string;
  title: string;
  status: 'migrated' | 'already_migrated' | 'skipped' | 'failed';
  reason: string;
  storagePath?: string;
}

export interface MigrationSummaryReport {
  scanned: number;
  migrated: number;
  alreadyMigrated: number;
  skipped: number;
  failed: number;
  items: MigrationItemResult[];
}

export async function migrateLegacyFileReferences(): Promise<MigrationSummaryReport> {
  // Enforce explicit admin authentication
  if (!auth?.currentUser || auth.currentUser.email !== 'adiemus80@gmail.com') {
    throw new Error('Unauthorized: Migration operations require administrator authentication (adiemus80@gmail.com).');
  }

  console.log('[Safe Log] Migration started: Stage 1 - Migrate Legacy File References');
  
  const report: MigrationSummaryReport = {
    scanned: 0,
    migrated: 0,
    alreadyMigrated: 0,
    skipped: 0,
    failed: 0,
    items: []
  };

  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured or Firestore database instance is unavailable.');
  }

  try {
    const booksSnapshot = await getDocs(collection(db, 'books'));
    report.scanned = booksSnapshot.size;

    for (const docSnap of booksSnapshot.docs) {
      const data = docSnap.data();
      const bookId = docSnap.id;
      const title = data.title || 'Untitled Book';

      console.log(`[Safe Log] Migration processing book ID: ${bookId}, storagePath present: ${!!data.storagePath ? 'yes' : 'no'}`);

      // 1. Check if valid storagePath already exists
      if (data.storagePath && typeof data.storagePath === 'string' && validateStoragePath(data.storagePath)) {
        report.alreadyMigrated++;
        report.items.push({
          bookId,
          title,
          status: 'already_migrated',
          reason: 'Valid storagePath already exists in document record',
          storagePath: data.storagePath
        });
        continue;
      }

      // 2. Check if fileUrl exists
      const legacyUrl = data.fileUrl;
      if (legacyUrl && typeof legacyUrl === 'string' && legacyUrl.trim().length > 0) {
        const derivedPath = deriveStoragePathFromUrl(legacyUrl);
        console.log(`[Safe Log] Path derived: ${!!derivedPath ? 'yes' : 'no'} for book ID: ${bookId}`);

        if (derivedPath && validateStoragePath(derivedPath)) {
          let objectExists = false;
          if (storage) {
            try {
              const storageRef = ref(storage, derivedPath);
              await getMetadata(storageRef);
              objectExists = true;
              console.log(`[Safe Log] Storage object found: yes for book ID: ${bookId}`);
            } catch (err: any) {
              console.warn(`[Safe Log] Storage object found: no for book ID: ${bookId}. Code:`, err?.code || err?.message);
            }
          } else {
            objectExists = true; // Offline fallback
          }

          if (objectExists) {
            try {
              const bookRef = doc(db, 'books', bookId);
              await updateDoc(bookRef, {
                storagePath: derivedPath,
                updatedAt: new Date().toISOString()
              });

              report.migrated++;
              report.items.push({
                bookId,
                title,
                status: 'migrated',
                reason: 'Successfully derived storagePath and verified Storage object',
                storagePath: derivedPath
              });
              console.log(`[Safe Log] Migration success for book ID: ${bookId}`);
            } catch (err: any) {
              report.failed++;
              report.items.push({
                bookId,
                title,
                status: 'failed',
                reason: `Failed to update Firestore document: ${err?.message || err}`
              });
              console.error(`[Safe Log] Migration update failure for book ID: ${bookId}`);
            }
          } else {
            report.failed++;
            report.items.push({
              bookId,
              title,
              status: 'failed',
              reason: 'Derived storagePath object not found in Firebase Storage bucket'
            });
          }
        } else {
          report.skipped++;
          report.items.push({
            bookId,
            title,
            status: 'skipped',
            reason: 'fileUrl is an external reference or non-Firebase Storage URL'
          });
        }
      } else {
        report.failed++;
        report.items.push({
          bookId,
          title,
          status: 'failed',
          reason: 'No fileUrl or valid storagePath found in document record'
        });
      }
    }

    console.log(`[Safe Log] Stage 1 Migration finished. Scanned: ${report.scanned}, Migrated: ${report.migrated}, Already Migrated: ${report.alreadyMigrated}, Skipped: ${report.skipped}, Failed: ${report.failed}`);
    return report;

  } catch (err: any) {
    console.error('[Safe Log] Stage 1 Migration error:', err);
    throw err;
  }
}

/**
 * Stage 2: Migration Backup & Cleanup Types & Functions
 */
export interface CleanupItemResult {
  bookId: string;
  title: string;
  status: 'cleaned' | 'already_clean' | 'skipped' | 'failed';
  reason: string;
  storagePath?: string;
  legacyFileUrl?: string;
}

export interface CleanupSummaryReport {
  scanned: number;
  cleaned: number;
  alreadyClean: number;
  skipped: number;
  failed: number;
  items: CleanupItemResult[];
}

export interface LegacyBackupRecord {
  bookId: string;
  title: string;
  storagePath: string | null;
  legacyFileUrl: string | null;
  timestamp: string;
}

/**
 * Generate a private backup array of book records prior to Stage 2 cleanup
 */
export async function createLegacyMigrationBackup(): Promise<LegacyBackupRecord[]> {
  if (!auth?.currentUser || auth.currentUser.email !== 'adiemus80@gmail.com') {
    throw new Error('Unauthorized: Backup export requires administrator authentication (adiemus80@gmail.com).');
  }
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase database instance unavailable.');
  }

  const snapshot = await getDocs(collection(db, 'books'));
  const backup: LegacyBackupRecord[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    backup.push({
      bookId: docSnap.id,
      title: data.title || 'Untitled Book',
      storagePath: data.storagePath || null,
      legacyFileUrl: data.fileUrl || null,
      timestamp: new Date().toISOString()
    });
  });

  return backup;
}

/**
 * Stage 2 Cleanup: Remove Migrated Legacy URLs
 */
export async function cleanupLegacyFileUrls(): Promise<CleanupSummaryReport> {
  if (!auth?.currentUser || auth.currentUser.email !== 'adiemus80@gmail.com') {
    throw new Error('Unauthorized: Legacy URL cleanup requires administrator authentication (adiemus80@gmail.com).');
  }

  console.log('[Safe Log] Stage 2 Cleanup started: Remove Migrated Legacy URLs');

  const report: CleanupSummaryReport = {
    scanned: 0,
    cleaned: 0,
    alreadyClean: 0,
    skipped: 0,
    failed: 0,
    items: []
  };

  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured or Firestore database instance is unavailable.');
  }

  try {
    const booksSnapshot = await getDocs(collection(db, 'books'));
    report.scanned = booksSnapshot.size;

    for (const docSnap of booksSnapshot.docs) {
      const data = docSnap.data();
      const bookId = docSnap.id;
      const title = data.title || 'Untitled Book';
      const storagePath = data.storagePath;
      const legacyFileUrl = data.fileUrl;

      // 1. If fileUrl is missing/empty, mark as already clean
      if (!legacyFileUrl || typeof legacyFileUrl !== 'string' || legacyFileUrl.trim().length === 0) {
        report.alreadyClean++;
        report.items.push({
          bookId,
          title,
          status: 'already_clean',
          reason: 'legacy fileUrl is already absent',
          storagePath: storagePath || undefined
        });
        continue;
      }

      // 2. Check if storagePath exists and is valid
      if (!storagePath || typeof storagePath !== 'string' || !validateStoragePath(storagePath)) {
        report.skipped++;
        report.items.push({
          bookId,
          title,
          status: 'skipped',
          reason: 'Skipped: Document lacks a valid storagePath. Run Stage 1 migration first.',
          legacyFileUrl
        });
        continue;
      }

      // 3. Verify corresponding Storage object exists
      let objectVerified = false;
      if (!storagePath.startsWith('idxdb://') && storage) {
        try {
          const storageRef = ref(storage, storagePath);
          await getMetadata(storageRef);
          objectVerified = true;
        } catch (err: any) {
          console.warn(`[Safe Log] Verification failed for storagePath (${storagePath}):`, err?.code || err?.message);
        }
      } else if (storagePath.startsWith('idxdb://')) {
        objectVerified = true;
      }

      if (!objectVerified) {
        report.failed++;
        report.items.push({
          bookId,
          title,
          status: 'failed',
          reason: 'Failed: Storage object for storagePath could not be verified in Firebase Storage bucket.',
          storagePath,
          legacyFileUrl
        });
        continue;
      }

      // 4. Remove fileUrl from Firestore document
      try {
        const bookRef = doc(db, 'books', bookId);
        await updateDoc(bookRef, {
          fileUrl: deleteField(),
          updatedAt: new Date().toISOString()
        });

        report.cleaned++;
        report.items.push({
          bookId,
          title,
          status: 'cleaned',
          reason: 'Successfully removed legacy fileUrl field after verifying storagePath object.',
          storagePath
        });
        console.log(`[Safe Log] Stage 2 cleanup success for book ID: ${bookId}`);
      } catch (err: any) {
        report.failed++;
        report.items.push({
          bookId,
          title,
          status: 'failed',
          reason: `Failed to update Firestore document: ${err?.message || err}`,
          storagePath,
          legacyFileUrl
        });
      }
    }

    console.log(`[Safe Log] Stage 2 Cleanup finished. Scanned: ${report.scanned}, Cleaned: ${report.cleaned}, Already Clean: ${report.alreadyClean}, Skipped: ${report.skipped}, Failed: ${report.failed}`);
    return report;
  } catch (err: any) {
    console.error('[Safe Log] Stage 2 Cleanup error:', err);
    throw err;
  }
}

/**
 * Fetch all custom books from database and return
 */
export async function fetchBooksListFromCloud(): Promise<Book[]> {
  const collectionName = 'books';
  console.log(`[Firebase Firestore] Initializing fetchBooksListFromCloud. Firebase Project ID: "${firebaseConfig.projectId}", Firestore collection: "${collectionName}"`);
  
  if (isFirebaseConfigured && db) {
    try {
      console.log(`[Firebase Firestore] Querying all documents from collection: "${collectionName}"...`);
      const snapshot = await getDocs(collection(db, collectionName));
      const books: Book[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const bookTitle = data.title || 'Untitled Book';
        console.log(`[Firebase Firestore] Book Loaded -> ID: "${doc.id}", Title: "${bookTitle}"`);
        
        // Provide defaults for older or incomplete book records
        const sanitizedBook: Book = {
          title: bookTitle,
          authors: Array.isArray(data.authors) ? data.authors : (data.author ? [data.author] : ['Unknown Author']),
          publisher: data.publisher || 'Unknown Publisher',
          year: typeof data.year === 'number' ? data.year : new Date().getFullYear(),
          category: data.category || 'Data Science Basics',
          coverImage: data.coverImage || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300',
          coverColor: data.coverColor || '#f59e0b',
          fileUrl: data.fileUrl || '',
          fileType: data.fileType || 'pdf',
          description: data.description || 'No description provided.',
          summary: data.summary || {
            overview: data.description || 'No overview provided.',
            targetAudience: 'General audience',
            entryPrerequisites: 'None',
            learningPath: ['Begin reading to build foundational knowledge.']
          },
          keyTopics: Array.isArray(data.keyTopics) ? data.keyTopics : ['General'],
          pageCount: typeof data.pageCount === 'number' ? data.pageCount : 100,
          isFavorite: !!data.isFavorite,
          progress: typeof data.progress === 'number' ? data.progress : 0,
          notes: Array.isArray(data.notes) ? data.notes : [],
          bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
          createdAt: data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy || undefined,
          createdByEmail: data.createdByEmail || undefined,
          userId: data.userId || undefined,
          userProgress: data.userProgress || {},
          userPages: data.userPages || {},
          ...data, // Preserve other custom properties
          id: doc.id // Enforce snapshot document ID
        };
        
        books.push(sanitizedBook);
      });
      
      console.log(`[Firebase Firestore] Query Success! Query fetched ${books.length} documents from "${collectionName}" in project "${firebaseConfig.projectId}".`);
      return books;
    } catch (err) {
      console.error(`[Firebase Firestore] Query Error in collection "${collectionName}" on Firebase Project "${firebaseConfig.projectId}":`, err);
      throw err;
    }
  } else {
    const errorMsg = `Firebase has not been configured or Firestore database is null. Project ID: "${firebaseConfig.projectId}"`;
    console.warn(`[Firebase Firestore] ${errorMsg}`);
    throw new Error(errorMsg);
  }
}
