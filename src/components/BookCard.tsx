/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Book } from '../types';
import { Bookmark, FileText, CheckCircle2, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteBook?: (id: string, e: React.MouseEvent) => void;
}

export default function BookCard({ book, onClick, onToggleFavorite, onDeleteBook }: BookCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [imageError, setImageError] = useState(false);
  const [resolvedCover, setResolvedCover] = useState<string>(book.coverImage || '');

  React.useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const resolveCover = async () => {
      if (book.coverImage && book.coverImage.startsWith('idxdb://')) {
        try {
          const { resolveBookFileUrl } = await import('../lib/firebase');
          const res = await resolveBookFileUrl(book.coverImage);
          if (isMounted) {
            setResolvedCover(res.url);
            cleanup = res.cleanup;
          }
        } catch (err) {
          console.error('[BookCard] Cover resolution error:', err);
        }
      } else {
        if (isMounted) {
          setResolvedCover(book.coverImage || '');
        }
      }
    };

    resolveCover();

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [book.coverImage]);

  // Extract primary colour from linear-gradient or fallback to hex
  const getGradientStyles = () => {
    return book.coverColor ? { background: book.coverColor } : { backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' };
  };

  return (
    <div
      id={`book-card-${book.id}`}
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out focus-within:outline-2 focus-within:outline-amber-500 rounded-xl"
      style={{ contentVisibility: 'auto' }}
    >
      {/* 3D Physical Book Asset Wrapper */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] bg-slate-900 border border-white/5 flex flex-col select-none">
        
        {/* Book Spine Shadow Accent - Simulates a premium physical binding crease */}
        <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent z-20 pointer-events-none rounded-l-lg" />
        <div className="absolute top-0 left-3 bottom-0 w-[1px] bg-white/10 z-20 pointer-events-none" />
        
        {/* Top visual glare for premium finish */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 via-white/0 to-transparent z-10 pointer-events-none" />

        {/* Realistic Interactive Spine / Dynamic Color Cover Pattern */}
        {(!resolvedCover || imageError) ? (
          <div
            className="w-full h-full flex flex-col justify-between p-4 pt-6 text-white relative"
            style={getGradientStyles()}
          >
            {/* Visual background page pattern */}
            <div className="absolute inset-x-4 top-24 bottom-12 border border-white/5 rounded pointer-events-none flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center opacity-30">
                <Star className="w-6 h-6 stroke-1 text-white" />
              </div>
            </div>
            
            <div className="pl-2 space-y-1 z-10 leading-snug">
              <span className="text-[9px] uppercase tracking-widest text-amber-400 font-mono font-semibold block">{book.category}</span>
              <h3 className="font-sans font-bold text-sm md:text-base leading-tight tracking-tight text-white line-clamp-3">{book.title}</h3>
            </div>

            <div className="pl-2 z-10">
              <p className="text-[10px] text-white/80 font-medium line-clamp-1">by {book.authors.join(', ')}</p>
              <div className="flex justify-between items-center mt-1 border-t border-white/10 pt-1.5">
                <span className="text-[8px] uppercase tracking-wider text-white/50">{book.publisher}</span>
                <span className="text-[9px] font-mono text-white/60">{book.year}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative group">
            {/* Background image loaded safely with referrerPolicy */}
            <img
              src={resolvedCover}
              alt={`Cover of ${book.title}`}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay Gradient that blends the bottom text and reveals details only on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10 p-3 pt-6 flex flex-col justify-between text-white">
              <span className="text-[8px] uppercase tracking-widest text-amber-400 font-mono font-semibold pl-2">{book.category}</span>
              <div className="space-y-1 pl-2">
                <p className="text-[10px] text-white/60 line-clamp-2 italic">"{book.description}"</p>
                <div className="flex justify-between items-center border-t border-white/10 pt-1 text-[8px] text-white/50">
                  <span>{book.publisher}</span>
                  <span>{book.pageCount} pages</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar overlays on bottom of book cover */}
        {(() => {
          const userProgressVal = (user?.uid && book.userProgress && typeof book.userProgress[user.uid] === 'number')
            ? book.userProgress[user.uid]
            : (book.progress || 0);
          return userProgressVal > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
              <div
                className={`h-full ${userProgressVal >= 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${userProgressVal}%` }}
              />
            </div>
          ) : null;
        })()}

        {/* Favorite/Bookmark Button */}
        <button
          id={`bookmark-${book.id}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleFavorite(book.id, e);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md z-40 transition-all duration-200 cursor-pointer ${
            book.isFavorite
              ? 'bg-amber-500/95 text-white shadow-lg scale-110 md:opacity-100'
              : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/85 md:opacity-0 md:group-hover:opacity-100'
          }`}
          aria-label={book.isFavorite ? 'Remove from bookshelf collections' : 'Add to bookshelf collections'}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Delete Book Button */}
        {onDeleteBook && (
          <button
            id={`delete-book-${book.id}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteBook(book.id, e);
            }}
            className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md z-40 transition-all duration-200 shadow-md md:opacity-0 md:group-hover:opacity-100 ${
              isAdmin 
                ? 'bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/85 cursor-pointer' 
                : 'bg-black/45 text-white/40 hover:bg-black/60 cursor-not-allowed'
            }`}
            title={isAdmin ? `Delete "${book.title}"` : `Delete restricted (requires administrator rights)`}
            aria-label={isAdmin ? `Delete "${book.title}"` : `Delete restricted (requires administrator rights)`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* File Format Label Badge */}
        <div className="absolute bottom-2 left-4 z-40 flex items-center gap-1">
          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded uppercase text-white shadow-sm flex items-center gap-0.5 backdrop-blur-md ${
            book.fileType === 'pdf' ? 'bg-red-600/90' : 'bg-blue-600/95'
          }`}>
            <FileText className="w-2.5 h-2.5" />
            {book.fileType}
          </span>
          {(() => {
            const userProgressVal = (user?.uid && book.userProgress && typeof book.userProgress[user.uid] === 'number')
              ? book.userProgress[user.uid]
              : (book.progress || 0);
            return userProgressVal >= 95 ? (
              <span className="bg-emerald-600/90 text-white p-0.5 rounded shadow-sm">
                <CheckCircle2 className="w-2.5 h-2.5 fill-current" />
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Subtitles beneath the physical card bookshop style */}
      <div className="mt-2 px-1 text-left">
        <h4 className="font-sans font-medium text-xs text-slate-800 line-clamp-1 group-hover:text-amber-600 transition-colors duration-150">
          {book.title}
        </h4>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-normal mt-0.5">
          <span className="truncate max-w-[70%]">{book.authors[0]}</span>
          <span className="font-mono text-[9px] text-slate-400 font-medium">{book.year}</span>
        </div>
      </div>
    </div>
  );
}
