/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Book, BookCategory } from '../types';
import BookCard from './BookCard';
import { ChevronLeft, ChevronRight, Library } from 'lucide-react';

interface BookShelfRowProps {
  key?: string;
  category: BookCategory;
  books: Book[];
  onBookClick: (book: Book) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteBook: (id: string, e: React.MouseEvent) => void;
}

// CategoryDescriptions to give the left category cards a premium descriptive vibe
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'AI Automation': 'Automated tasks, agentic workflows, LLM integration pipelines, and autonomous execution.',
  'AI Engineering': 'Transformers, LLM design, alignment, fine-tuning, and automated agent structures.',
  'Business Analytics': 'Strategic prescriptive simulation, cashflow forecasts, and causations.',
  'Computer Vision': 'Image classification, object detection, pixel processing, and visual modeling.',
  'Data Engineering': 'Pipelines, warehousing, distributed architectures, and messaging logic.',
  'Data Visualization': 'Aesthetic data graphic mapping, dynamic web canvases, and interactive tooltips.',
  'Machine Learning and Deep Learning': 'Supervised and unsupervised models, backpropagation, and production neural nets.',
  'Math for Data Science': 'Linear algebra, calculus vector matrices, statistics, and system optimization principles.',
  'Programming Languages': 'Idiomatic structures, collections, concurrent programming, and software engineering foundations.',
  'Project Management': 'Agile delivery, resource planning, lifecycle mapping, and agile delivery frameworks.',
  'SQL': 'Window structures, cohorts, analytics aggregation, and query tuning paradigms.',
};

export default function BookShelfRow({ category, books, onBookClick, onToggleFavorite, onDeleteBook }: BookShelfRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll positions to determine arrow visibility
  const checkScrollLimits = () => {
    const el = scrollRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5 && isScrollable);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScrollLimits();
      el.addEventListener('scroll', checkScrollLimits);
      window.addEventListener('resize', checkScrollLimits);
      
      // Secondary check once images/children load or mount
      const timer = setTimeout(checkScrollLimits, 500);

      return () => {
        el.removeEventListener('scroll', checkScrollLimits);
        window.removeEventListener('resize', checkScrollLimits);
        clearTimeout(timer);
      };
    }
  }, [books]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (books.length === 0) return null;

  return (
    <section 
      id={`category-section-${category.replace(/\s+/g, '-').toLowerCase()}`}
      className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 border-b border-slate-100 last:border-none"
    >
      {/* Category Card (Left-side on medium/large screens, top-side on mobile) */}
      <div className="md:col-span-3 lg:col-span-2.5 flex flex-col justify-between pr-4">
        <div className="space-y-2">
          {/* Accent decoration */}
          <div className="w-8 h-1 bg-amber-500 rounded-full" />
          <h3 className="text-base font-bold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <Library className="w-4 h-4 text-slate-500 shrink-0" />
            {category}
          </h3>
          <p className="text-xs text-slate-500 tracking-normal font-sans leading-relaxed">
            {CATEGORY_DESCRIPTIONS[category] || 'Specialized materials and research documentation.'}
          </p>
        </div>

        {/* Small Stats / Navigation tools inside left pane for high density styling */}
        <div className="hidden md:flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium font-mono">
          <span>{books.length} {books.length === 1 ? 'Book' : 'Books'}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              className={`p-1 rounded bg-slate-50 hover:bg-slate-100 transition duration-150 ${
                !canScrollLeft ? 'opacity-40 cursor-not-allowed text-slate-300' : 'text-slate-600'
              }`}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className={`p-1 rounded bg-slate-50 hover:bg-slate-100 transition duration-150 ${
                !canScrollRight ? 'opacity-40 cursor-not-allowed text-slate-300' : 'text-slate-600'
              }`}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Shelves Canvas Scroller */}
      <div className="md:col-span-9 lg:col-span-9.5 relative group/row">
        
        {/* Left absolute paddle scroll guide */}
        {canScrollLeft && (
          <div className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 flex items-center justify-start pointer-events-none">
            <button
              onClick={() => handleScroll('left')}
              className="p-2 rounded-full bg-white shadow-md border border-slate-100 hover:bg-orange-50 active:scale-95 transition-all duration-150 pointer-events-auto ml-1"
              aria-label="Scroll shelf left"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        )}

        {/* Right absolute paddle scroll guide */}
        {canScrollRight && (
          <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 flex items-center justify-end pointer-events-none">
            <button
              onClick={() => handleScroll('right')}
              className="p-2 rounded-full bg-white shadow-md border border-slate-100 hover:bg-orange-50 active:scale-95 transition-all duration-150 pointer-events-auto mr-1"
              aria-label="Scroll shelf right"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        )}

        {/* The horizontal scrolling track wrapper */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {books.map((book) => (
            <div
              key={book.id}
              className="w-[140px] sm:w-[160px] md:w-[170px] shrink-0"
            >
              <BookCard
                book={book}
                onClick={() => onBookClick(book)}
                onToggleFavorite={onToggleFavorite}
                onDeleteBook={onDeleteBook}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
