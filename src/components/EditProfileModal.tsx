import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Camera, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { AppUser } from '../lib/authContext';
import { storage, isFirebaseConfigured, storeFileInIndexedDB } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface EditProfileModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (name: string, photoURL: string) => Promise<void>;
}

const PRESET_AVATARS = [
  { id: 'av1', label: 'Tech Expert', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Researcher', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Analytics Nerd', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Data Innovator', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Scholar Developer', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Tech Lead', url: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80' },
];

export default function EditProfileModal({ user, isOpen, onClose, onUpdateProfile }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [selectedPhoto, setSelectedPhoto] = useState(user.photoURL);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize to 512 × 512 px after upload and compress to WebP (runs locally)
  const processLocalFile = async (file: File): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not initialize image processing canvas context.'));
              return;
            }

            // High-quality center-cropping to square
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 512, 512);

            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to compress parsed image layout.'));
                return;
              }

              const blobReader = new FileReader();
              blobReader.onloadend = () => {
                resolve({
                  blob,
                  dataUrl: blobReader.result as string
                });
              };
              blobReader.onerror = () => reject(new Error('Failed to read compressed WebP blob.'));
              blobReader.readAsDataURL(blob);
            }, 'image/webp', 0.85); // WebP formatting with 85% visual preservation ratio
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image element.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read binary stream.'));
      reader.readAsDataURL(file);
    });
  };

  const uploadToStorageWithTimeout = async (blob: Blob, timeoutMs = 4500): Promise<string> => {
    if (!isFirebaseConfigured || !storage) {
      throw new Error('Storage is not configured or disabled');
    }

    const storagePath = `avatars/${user.uid}_avatar_${Date.now()}.webp`;
    const storageRef = ref(storage, storagePath);

    const uploadPromise = (async () => {
      const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/webp' });
      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Storage upload request timed out')), timeoutMs);
    });

    return Promise.race([uploadPromise, timeoutPromise]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    // 1. Validate File Size: Maximum 2 MB
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setValidationError('Maximum upload size: 2 MB. Please select a smaller file.');
      return;
    }

    // 2. Validate File Format: JPG, JPEG, PNG, WebP
    const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedExtensions.includes(file.type.toLowerCase())) {
      setValidationError('Accepted formats: JPG, JPEG, PNG, WebP.');
      return;
    }

    setUploading(true);
    try {
      const result = await processLocalFile(file);
      // Immediately display local preview so it feels incredibly responsive
      setSelectedPhoto(result.dataUrl);

      // Trigger hot background upload to Cloud Storage with a short timeout
      try {
        if (isFirebaseConfigured && storage) {
          const cloudUrl = await uploadToStorageWithTimeout(result.blob, 4500);
          setSelectedPhoto(cloudUrl);
        }
      } catch (storageError) {
        console.warn('[Firebase Storage] Avatar background upload timed out or failed, utilizing highly optimized local WebP Data URL:', storageError);
        // Do nothing, we already set selectedPhoto to result.dataUrl base64 which is perfectly functional and compact (approx 15KB)
      }
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'An error occurred during file compression.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setValidationError('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    setValidationError(null);
    try {
      // The profile update is now nearly instantaneous as the selectedPhoto URL is already fully generated/compiled
      await onUpdateProfile(displayName.trim(), selectedPhoto);
      onClose();
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Failed to update user profile information.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop background overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs cursor-default"
        />

        {/* Modal core block */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-500" />
              Edit Account Profile
            </h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[85vh]">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600">
                {validationError}
              </div>
            )}

            {/* Current Avatar and Upload Block */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group/avatar">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-100 shadow-sm relative bg-slate-50">
                  <img 
                    src={selectedPhoto} 
                    alt="Active Avatar" 
                    className="w-full h-full object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center border border-white disabled:opacity-50"
                  title="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                JPG, JPEG, PNG, WebP up to 2MB. Stored as compressed WebP.
              </p>
            </div>

            {/* Form Inputs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Display Name
              </label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                required
                className="w-full px-3 py-2 border border-slate-200 focus:border-amber-500 rounded-lg text-xs font-medium text-slate-800 bg-slate-50/30 focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none transition"
                placeholder="Enter your name"
              />
            </div>

            {/* Presets Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                Or Select a Preset Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedPhoto === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setValidationError(null);
                        setSelectedPhoto(av.url);
                      }}
                      className="relative rounded-full aspect-square overflow-hidden cursor-pointer border-2 transition hover:scale-105 outline-none hover:border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      style={{ borderColor: isSelected ? '#f59e0b' : '#e2e8f0' }}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="p-0.5 bg-amber-500 rounded-full">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg hover:shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
