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
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import {
  getAuth
} from 'firebase/auth';
import { Book } from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

// Check if any config parameter is present
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket
);

let app: any = null;
export let db: any = null;
export let storage: any = null;
export let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log('[Firebase] Successfully initialized custom project cloud database, auth, and storage services.');
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
 * Handle uploading files (PDF/EPUB or custom covers)
 */
export async function uploadBookFile(
  bookId: string, 
  file: File | Blob, 
  fileExtension: string,
  type: 'pdf' | 'epub' | 'cover'
): Promise<string> {
  if (isFirebaseConfigured && storage) {
    try {
      const cleanBookId = bookId.replace(/[^a-zA-Z0-9_\-]/g, '');
      const path = `books/${cleanBookId}/${type}_file.${fileExtension}`;
      const storageRef = ref(storage, path);
      
      console.log(`[Firebase Storage] Uploading ${type} to: ${path}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.error('[Firebase Storage] Failed upload, saving to local offline DB:', err);
      // Fallback
    }
  }

  // Fallback to IndexedDB
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
      console.error('[IndexedDB] Failed resolving file url: ' + url, e);
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
      console.log('[Firebase Firestore] Saving booklet metadata:', book.title);
      // Clean Firestore object from undefined values or functions
      const cleanBook = JSON.parse(JSON.stringify({
        ...book,
        createdAt: book.createdAt || new Date().toISOString()
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
 * Delete book metadata (and dynamic files if present)
 */
export async function deleteBookFromStorage(book: Book): Promise<void> {
  const bookId = book.id;
  
  // Clean local files from local IndexedDB if they exist 
  await deleteFileFromIndexedDB(`${bookId}_pdf`);
  await deleteFileFromIndexedDB(`${bookId}_epub`);
  await deleteFileFromIndexedDB(`${bookId}_cover`);

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'books', bookId));
      console.log('[Firebase Firestore] Removed metadata document for id:', bookId);
    } catch (err) {
      console.error('[Firebase Firestore] Error deleting document:', err);
    }

    if (storage) {
      // Safely attempt to delete from storage if we had uploaded them there
      try {
        if (book.fileUrl && book.fileUrl.includes('firebasestorage.googleapis.com')) {
          const type = book.fileType;
          const cleanBookId = bookId.replace(/[^a-zA-Z0-9_\-]/g, '');
          const fileRef = ref(storage, `books/${cleanBookId}/${type}_file.${type}`);
          await deleteObject(fileRef);
          console.log('[Firebase Storage] Deleted storage file:', `books/${cleanBookId}/${type}_file.${type}`);
        }
      } catch (err) {
        console.warn('[Firebase Storage] Could not delete file (or it didn\'t exist):', err);
      }

      try {
        if (book.coverImage && book.coverImage.includes('firebasestorage.googleapis.com')) {
          const cleanBookId = bookId.replace(/[^a-zA-Z0-9_\-]/g, '');
          const coverRef = ref(storage, `books/${cleanBookId}/cover_file.jpg`);
          await deleteObject(coverRef);
          console.log('[Firebase Storage] Deleted cover file.');
        }
      } catch (err) {
        console.warn('[Firebase Storage] Could not delete cover:', err);
      }
    }
  }
}

/**
 * Fetch all custom books from database and return
 */
export async function fetchBooksListFromCloud(): Promise<Book[]> {
  if (isFirebaseConfigured && db) {
    try {
      console.log('[Firebase Firestore] Loading custom uploads from cloud db...');
      const snapshot = await getDocs(collection(db, 'books'));
      const books: Book[] = [];
      snapshot.forEach(doc => {
        books.push(doc.data() as Book);
      });
      return books;
    } catch (err) {
      console.error('[Firebase] Failed to fetch documents:', err);
    }
  }
  return [];
}
