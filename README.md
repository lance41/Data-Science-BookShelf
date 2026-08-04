# Data Science BookShelf - Secure `storagePath` Architecture & Migration Guide

## Overview

Data Science BookShelf is a digital library application for cataloging, studying, and reading technical books in PDF and EPUB formats. The application uses Firebase Google Authentication, Cloud Firestore, and Firebase Storage with a strict, role-based access control model.

---

## 🔒 Secure `storagePath` Architecture

To prevent public exposure or token leakages of protected PDF and EPUB files, the system enforces a zero-trust `storagePath` architecture:

1. **Canonical Storage Path Model**:
   - Protected book files are stored in Firebase Storage strictly under:
     ```
     books/{bookId}/{sanitizedFilename}
     ```
   - Firestore documents store the relative `storagePath` string instead of persistent download URLs or public URLs.

2. **Authenticated Blob Loading (No Tokenized Download URLs)**:
   - When an authorized user (Admin `adiemus80@gmail.com` or approved viewers with `libraryAccess == true`) opens a book in the reader, the application calls `getProtectedFileObjectUrl(storagePath)`.
   - The application fetches binary data directly into memory using the authenticated Firebase Storage SDK (`getBlob`) and creates a local browser `blob:` object URL.
   - On component unmount, book switch, reader close, or user sign-out, the object URL is explicitly revoked (`URL.revokeObjectURL`) to eliminate memory leaks and unauthorized reuse.
   - Non-authorized guests and viewers can browse metadata, summaries, key topics, and cover artwork, but cannot access protected PDF/EPUB binary blobs.

3. **Storage Path Validation**:
   - All storage operations enforce strict relative path validation (`validateStoragePath`).
   - Rejects empty paths, absolute paths, parent directory traversal (`..`), path injection, and non-canonical locations outside `books/{bookId}/{fileName}`.

4. **File Replacement & Deletion Workflows**:
   - **Admin File Replacement**: Admins can upload a new PDF or EPUB file directly from the Technical Specifications panel via `replaceBookFile`. The system uploads the new object to `books/{bookId}/{filename}`, updates Firestore `storagePath`, and securely deletes the old Storage object.
   - **Book Deletion**: When an admin deletes a book record, `deleteBookFromStorage` removes the object from Firebase Storage using `storagePath`, leaving no orphaned assets.

---

## 🔄 2-Stage Migration & Cleanup Strategy

The application includes a comprehensive, safe, 2-stage admin migration workflow accessible from the **Admin Dashboard → Storage Migration** tab.

### Stage 1: Populate `storagePath` References
1. `migrateLegacyFileReferences()` scans all catalog book documents in Firestore.
2. For documents lacking a `storagePath`, it parses legacy persistent Firebase URLs (`deriveStoragePathFromUrl`) and verifies object existence using `getMetadata`.
3. Validated paths are written to Firestore as `storagePath`.
4. Idempotent and non-destructive: existing working `storagePath` references are preserved.

### Stage 2: Cleanup Legacy `fileUrl` Properties
1. `cleanupLegacyFileUrls()` scans Firestore for documents containing legacy `fileUrl` fields.
2. Verifies that the document has a valid `storagePath` pointing to an existing object in Firebase Storage.
3. Deletes the legacy `fileUrl` property from the Firestore document using `deleteField()`.
4. Admins can export a complete JSON backup of all book records (`createLegacyMigrationBackup`) prior to executing Stage 2 cleanup. Requires explicit confirmation via an admin modal dialog.

---

## 🛡️ Security Rules Reference

### Firestore Rules (`firestore.rules`)
- **Collection `books`**:
  - `read`: Public (allows browsing catalog metadata).
  - `write`: Restricted to Admin (`adiemus80@gmail.com`).

- **Collection `users` & `accessRequests`**:
  - Users can read/write their own records; Admins have full review/approval privileges.

### Firebase Storage Rules (`storage.rules`)
- **Path `/books/{bookId}/{fileName}`**:
  - `read`: Allowed if `request.auth != null` and user email is `adiemus80@gmail.com` or `get(/databases/(default)/documents/users/$(request.auth.uid)).data.libraryAccess == true`.
  - `write`/`delete`: Restricted to Admin (`adiemus80@gmail.com`).
