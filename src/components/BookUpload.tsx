/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Book, BookCategory } from '../types';
import { Upload, X, FileText, Check, AlertCircle, Sparkles, FolderPlus } from 'lucide-react';
import { uploadBookFile, saveBookMetadata } from '../lib/firebase';

interface BookUploadProps {
  onAddBook: (newBook: Book) => void;
  onClose: () => void;
  categories: string[];
  onAddCategory: (catName: string) => void;
}

// Preset visual color gradients for covers to make user custom books look instantly amazing!
const PRESET_GRADIENTS = [
  { name: 'Classic Navy', value: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' },
  { name: 'Royal Amethyst', value: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)' },
  { name: 'Emerald Spruce', value: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
  { name: 'Rustic Terracotta', value: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)' },
  { name: 'Teal Forest', value: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' },
  { name: 'Midnight Charcoal', value: 'linear-gradient(135deg, #111827 0%, #374151 100%)' },
  { name: 'Sunset Amber', value: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' },
  { name: 'Crimson Rosewood', value: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)' },
];

export default function BookUpload({ onAddBook, onClose, categories, onAddCategory }: BookUploadProps) {
  const [title, setTitle] = useState('');
  const [authorsString, setAuthorsString] = useState('');
  const [publisher, setPublisher] = useState('');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [category, setCategory] = useState<BookCategory>(categories[0] || 'AI Engineering');
  const [pageCount, setPageCount] = useState<number>(350);
  const [fileType, setFileType] = useState<'pdf' | 'epub'>('pdf');
  const [coverImage, setCoverImage] = useState('');
  const [coverColor, setCoverColor] = useState(PRESET_GRADIENTS[0].value);
  const [description, setDescription] = useState('');
  const [overview, setOverview] = useState('');
  const [keyTopicsString, setKeyTopicsString] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [prerequisites, setPrerequisites] = useState('');

  // Cover image search states
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [foundCovers, setFoundCovers] = useState<string[]>([]);
  const [coverSearchError, setCoverSearchError] = useState('');

  const searchCoverByTitle = async (searchTitle: string) => {
    if (!searchTitle.trim()) return;
    setIsSearchingCover(true);
    setFoundCovers([]);
    setCoverSearchError('');
    
    try {
      const urls: string[] = [];
      const query = encodeURIComponent(searchTitle.trim());
      
      // 1. Google Books API
      const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=8`);
      if (googleRes.ok) {
        const data = await googleRes.json();
        if (data.items) {
          for (const item of data.items) {
            const imageLinks = item.volumeInfo?.imageLinks;
            if (imageLinks) {
              const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
              if (url) {
                const secureUrl = url.replace('http://', 'https://');
                if (!urls.includes(secureUrl)) {
                  urls.push(secureUrl);
                }
              }
            }
          }
        }
      }
      
      // 2. Open Library API
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=6`);
      if (olRes.ok) {
        const data = await olRes.json();
        if (data.docs) {
          for (const doc of data.docs) {
            if (doc.cover_i) {
              const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              if (!urls.includes(url)) {
                urls.push(url);
              }
            }
          }
        }
      }

      // 3. Fallback to Unsplash thematic placeholders if no covers are found
      if (urls.length === 0) {
        urls.push(`https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400`);
        urls.push(`https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=400`);
        urls.push(`https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400`);
      }
      
      const finalCovers = urls.slice(0, 12);
      setFoundCovers(finalCovers);
      
      if (finalCovers.length > 0) {
        setCoverImage(finalCovers[0]);
        setSelectedCoverFile(null);
      } else {
        setCoverSearchError('No matching covers found. Try typing a keyword instead.');
      }
    } catch (err) {
      console.error('[CoverSearch] Error searching covers:', err);
      const fallbacks = [
        `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400`,
        `https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=400`
      ];
      setFoundCovers(fallbacks);
      setCoverImage(fallbacks[0]);
    } finally {
      setIsSearchingCover(false);
    }
  };

  const handleAutoSearchCover = () => {
    searchCoverByTitle(title);
  };

  // Dynamic custom categories integration states
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [catError, setCatError] = useState('');

  const handleAddNewCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) {
      setCatError('Category name cannot be empty');
      return;
    }
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      const existing = categories.find(c => c.toLowerCase() === trimmed.toLowerCase()) || trimmed;
      setCategory(existing);
      setIsAddingNewCat(false);
      setCustomCategoryInput('');
      setCatError('');
      return;
    }
    onAddCategory(trimmed);
    setCategory(trimmed);
    setIsAddingNewCat(false);
    setCustomCategoryInput('');
    setCatError('');
  };

  // File Upload and AI extraction states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Asynchronous Gemini auto-extraction handler
  const startMetadataExtraction = async (file: File, type: 'pdf' | 'epub') => {
    setIsExtracting(true);
    setExtractionStatus('Preparing document byte stream...');
    
    try {
      let fileHeaderContent = '';
      
      // We slice the first 350KB of the PDF/EPUB to capture headers, metadata blocks and preface text
      if (type === 'pdf') {
        setExtractionStatus('Extracting document metadata & imprint headers...');
        const slice = file.slice(0, 1024 * 350);
        
        fileHeaderContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const buffer = reader.result as ArrayBuffer;
            const arr = new Uint8Array(buffer);
            let result = '';
            // Filter and extract only printable ASCII or common white space characters
            for (let i = 0; i < arr.length; i++) {
              const code = arr[i];
              if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
                result += String.fromCharCode(code);
              }
            }
            // Retain up to 15,000 characters to keep it compact and highly targeted
            resolve(result.substring(0, 15000));
          };
          reader.onerror = () => resolve('');
          reader.readAsArrayBuffer(slice);
        });
      } else {
        setExtractionStatus('Reading EPUB textbook filename markers...');
      }
      
      setExtractionStatus('Evaluating author colophons & subjects with Gemini AI...');
      
      const response = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: type,
          fileHeaderContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Non-200 metadata response received');
      }

      const meta = await response.json();
      setExtractionStatus('Assembling text outline...');

      // Dynamic form prefill injection
      if (meta.title) setTitle(meta.title);
      if (meta.authors) {
        setAuthorsString(Array.isArray(meta.authors) ? meta.authors.join(', ') : meta.authors);
      }
      if (meta.publisher) setPublisher(meta.publisher);
      if (meta.year) setYear(meta.year);
      if (meta.pageCount) setPageCount(meta.pageCount);
      if (meta.description) setDescription(meta.description);
      if (meta.overview) setOverview(meta.overview);
      if (meta.keyTopics) {
        setKeyTopicsString(Array.isArray(meta.keyTopics) ? meta.keyTopics.join(', ') : meta.keyTopics);
      }
      if (meta.targetAudience) setTargetAudience(meta.targetAudience);
      if (meta.entryPrerequisites) setPrerequisites(meta.entryPrerequisites);
      if (meta.coverColor) setCoverColor(meta.coverColor);
      if (meta.coverImage) setCoverImage(meta.coverImage);

      // Trigger automatic high-relevance cover search matching the extracted title!
      if (meta.title) {
        searchCoverByTitle(meta.title);
      }

      // Category reconciliation inside available list options
      if (meta.category) {
        const matchingCategory = categories.find(
          c => c.toLowerCase() === meta.category.toLowerCase()
        );
        if (matchingCategory) {
          setCategory(matchingCategory);
        } else {
          onAddCategory(meta.category);
          setCategory(meta.category);
        }
      }

    } catch (err) {
      console.error('Intelligent data extraction fallback:', err);
      // Clean fallback from fileName
      const fallbackTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(fallbackTitle);
      setAuthorsString('Local Contributor');
    } finally {
      setIsExtracting(false);
      setExtractionStatus('');
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      setFileType('pdf');
      setSelectedFile(file);
      setFileError('');
      startMetadataExtraction(file, 'pdf');
    } else if (ext === 'epub') {
      setFileType('epub');
      setSelectedFile(file);
      setFileError('');
      startMetadataExtraction(file, 'epub');
    } else {
      setFileError('Invalid file type. Please upload a PDF or EPUB file.');
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    setSubmitStatus('Preparing file ingestion...');

    try {
      const bookId = `custom-${Date.now()}`;

      // 1. Upload Book File
      let finalFileUrl = 'https://arxiv.org/pdf/2203.01044.pdf';
      if (selectedFile) {
        setSubmitStatus(`Storing library file (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)...`);
        const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
        
        // Save the file (to Storage if configured, else IndexedDB)
        finalFileUrl = await uploadBookFile(bookId, selectedFile, ext, fileType);
      }

      // 2. Upload Cover Artwork
      let finalCoverImage = coverImage;
      if (selectedCoverFile) {
        setSubmitStatus('Storing personalized cover art file...');
        const ext = selectedCoverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        finalCoverImage = await uploadBookFile(bookId, selectedCoverFile, ext, 'cover');
      }

      // 3. Assemble book catalog record
      const newBook: Book = {
        id: bookId,
        title,
        authors: authorsString ? authorsString.split(',').map(a => a.trim()) : ['Anonymous Author'],
        publisher: publisher || 'Self-Published / Unknown',
        year: Number(year) || new Date().getFullYear(),
        category,
        coverImage: finalCoverImage || '',
        fileUrl: finalFileUrl,
        fileType,
        description: description || `Personal upload of ${title} in standard ${fileType.toUpperCase()} format.`,
        summary: {
          overview: overview || `A comprehensive guide covering advanced parameters and methodologies inside the domain of ${category}. This edition includes practical case notes and blueprints.`,
          targetAudience: targetAudience || 'Systems practitioners, data science model developers, and analytics leaders.',
          entryPrerequisites: prerequisites || 'Standard introductory computing, algebra mathematics, and database principles.',
          learningPath: [
            `Familiarize with the core structural architecture of ${category}`,
            'Deep dive into theoretical mechanisms and algorithms',
            'Optimize model hyperparameters and data processing frameworks',
            'Deploy secure systems in production workspaces.'
          ]
        },
        keyTopics: keyTopicsString 
          ? keyTopicsString.split(',').map(t => t.trim()) 
          : ['Core fundamentals', 'Advanced systems integrations', 'Deployment methodologies', 'Optimizations'],
        pageCount: Number(pageCount) || 250,
        isFavorite: false,
        progress: 0,
        notes: []
      };

      // Set explicit Firestore and coverImageUrl mapping
      (newBook as any).coverImageUrl = finalCoverImage || '';
      (newBook as any).createdAt = new Date().toISOString();

      setSubmitStatus('Writing book metadata record to cloud database...');
      await saveBookMetadata(newBook);

      onAddBook(newBook);
    } catch (err) {
      console.error('[Upload] Error cataloging new book:', err);
      alert('An error occurred during metadata compilation. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="book-upload-modal"
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 rounded-lg text-white">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">Add New Data Book</h2>
              <p className="text-[11px] text-slate-500">Expand your personal bookshelves with local PDF or EPUB files.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
        >
          
          {/* LEFT COLUMN: File Drag & Drop + Cover Generator */}
          <div className="md:col-span-4 space-y-5">
            {/* 1. File Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Book File (PDF or EPUB)</label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive 
                    ? 'border-amber-500 bg-amber-50/50' 
                    : selectedFile 
                      ? 'border-emerald-500 bg-emerald-50/10' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.epub"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {isExtracting ? (
                  <div className="space-y-2.5 flex flex-col items-center py-4 animate-pulse">
                    <div className="relative">
                      <div className="p-2.5 bg-amber-500 text-white rounded-lg relative z-10 animate-bounce">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-amber-500/30 rounded-lg blur-xs animate-ping" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-700 font-sans">Analyzing with Gemini AI...</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-[200px] mx-auto text-center font-semibold font-sans">
                        {extractionStatus}
                      </p>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-1 flex flex-col items-center">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-800 truncate max-w-full">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-1">
                      <Check className="w-3 h-3" /> Ready to Load
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 flex flex-col items-center">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-700">Drag & drop files here</p>
                    <p className="text-[10px] text-slate-400">or click to choose files from disk</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono uppercase mt-2">
                      PDF, EPUB
                    </span>
                  </div>
                )}
              </div>
              {fileError && (
                <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium select-none">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fileError}
                </p>
              )}
            </div>

            {/* 2. Cover Gradient and Design Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Book Spine & cover gradient
              </span>
              <p className="text-[10px] text-slate-400 leading-normal">
                If no picture URL is provided below, we will auto-generate an aesthetic digital hardback spine design!
              </p>
              
              <div className="grid grid-cols-4 gap-2">
                {PRESET_GRADIENTS.map((gradient) => (
                  <button
                    key={gradient.name}
                    type="button"
                    onClick={() => setCoverColor(gradient.value)}
                    className={`aspect-square rounded-lg border-2 transition-all relative ${
                      coverColor === gradient.value 
                        ? 'border-slate-800 scale-105 shadow-md ring-2 ring-amber-500/30' 
                        : 'border-slate-200 hover:scale-102 hover:border-slate-300'
                    }`}
                    style={{ background: gradient.value }}
                    title={gradient.name}
                  >
                    {coverColor === gradient.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-white bg-black/20 rounded-md">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Generated Book Spine inside left panel */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Generated Cover preview</label>
              <div 
                className="aspect-[3/4] w-2/3 mx-auto rounded-lg shadow-lg relative overflow-hidden text-white flex flex-col justify-between p-3"
                style={{ background: coverColor }}
              >
                {/* Book spine simulation */}
                <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-to-r from-black/45 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-2.5 bottom-0 w-[1px] bg-white/10 pointer-events-none" />
                
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase tracking-wider text-amber-400 font-mono font-semibold">
                    {category}
                  </span>
                  <p className="font-sans font-bold text-xs line-clamp-3 leading-snug">
                    {title || 'Untouched Book Title'}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-white/80 font-medium truncate">
                    {authorsString || 'Author name'}
                  </p>
                  <div className="flex justify-between items-center text-[7px] text-white/50 border-t border-white/10 pt-1 mt-1">
                    <span>{publisher || 'Publisher'}</span>
                    <span>{year || '2026'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Book Metadata Details */}
          <div className="md:col-span-8 space-y-4">
            
            {/* Row 1: Title & Authors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Book Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Statistical Foundations for AI Systems"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Author(s) <span className="text-slate-400 font-normal">(separate with commas)</span>
                </label>
                <input
                  type="text"
                  value={authorsString}
                  onChange={(e) => setAuthorsString(e.target.value)}
                  placeholder="e.g. Arthur Samuel, Ada Lovelace"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Row 2: Category, Publisher, Year, PageCount */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block flex items-baseline justify-between">
                  <span>Category</span>
                  {!isAddingNewCat && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCat(true)}
                      className="text-[10px] text-amber-600 hover:underline font-bold font-sans"
                    >
                      + Custom
                    </button>
                  )}
                </label>

                {isAddingNewCat ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => {
                          setCustomCategoryInput(e.target.value);
                          setCatError('');
                        }}
                        placeholder="e.g. LLMops"
                        className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCat(false);
                          setCustomCategoryInput('');
                          setCatError('');
                        }}
                        className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                    {catError && (
                      <p className="text-[9px] text-red-500 leading-none">{catError}</p>
                    )}
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BookCategory)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Publisher</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. O'Reilly, MIT Press"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Published Year</label>
                <input
                  type="number"
                  min="1900"
                  max="2035"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Page Count</label>
                <input
                  type="number"
                  min="1"
                  max="3000"
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Row 3: Optional Cover Image Selector with Auto-Search */}
            <div className="space-y-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800 block">Cover Image Configuration</label>
                <span className="text-[10px] text-slate-400 font-mono">Dynamic Artwork</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* local and url config */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Option A: Upload local image file</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedCoverFile(e.target.files[0]);
                          setCoverImage(''); // clear URL so file has priority
                          setFoundCovers([]);
                        }
                      }}
                      className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer border border-slate-200 rounded p-1"
                    />
                    {selectedCoverFile && (
                      <p className="text-[9px] text-emerald-600 font-semibold truncate mt-0.5">✔ Chosen: {selectedCoverFile.name}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Option B: Cover Image URL</span>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => {
                        setCoverImage(e.target.value);
                        if (e.target.value) {
                          setSelectedCoverFile(null); // clear file so URL has priority
                        }
                      }}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Intelligent Auto-search */}
                <div className="space-y-2 border-l border-slate-200/80 pl-0 sm:pl-4 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block flex items-center gap-1 leading-none">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      Option C: Intelligent Auto-Search
                    </span>
                    <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                      Search Google Books metadata and Open Library catalogs instantly using your book title.
                    </p>
                    
                    <button
                      type="button"
                      onClick={handleAutoSearchCover}
                      disabled={isSearchingCover || !title.trim()}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                    >
                      {isSearchingCover ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                          Indexing covers...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                          Auto-Search Cover Image
                        </>
                      )}
                    </button>
                    {!title.trim() && (
                      <p className="text-[9px] text-slate-400 italic mt-1 font-medium leading-none">Please enter a book title first to enable search.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover options selection grid */}
              {foundCovers.length > 0 && (
                <div className="pt-2.5 border-t border-slate-200/60 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Select a matching cover:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {foundCovers.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCoverImage(url);
                          setSelectedCoverFile(null);
                        }}
                        className={`aspect-[3/4] rounded-md border-2 overflow-hidden transition relative hover:scale-105 bg-slate-100 ${
                          coverImage === url
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-slate-200/80 hover:border-slate-400'
                        }`}
                      >
                        <img 
                          src={url} 
                          alt={`Cover Option ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        {coverImage === url && (
                          <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                            <span className="bg-amber-500 text-white p-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {coverSearchError && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{coverSearchError}</p>
              )}
            </div>

            {/* Row 4: Description (Overview Tab 1) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Brief Book Description (Metadata)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Provide a quick 2-3 sentence overview of this research paper or textbook."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            {/* AI Generated / Detailed Summary (Tab 2 contents) */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Expanded Summary Information (For tabs)</span>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 block">Extended Overview Summary</label>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  rows={2}
                  placeholder="More detail: what is the core thesis of this work?"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">Key Topics (comma separated)</label>
                  <input
                    type="text"
                    value={keyTopicsString}
                    onChange={(e) => setKeyTopicsString(e.target.value)}
                    placeholder="e.g. Partition protocols, vector clustering"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 block">Who is this useful for?</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. MLOps technicians, Big Data Engineers"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 block">Prerequisites</label>
                <input
                  type="text"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder="e.g. Solid Linear Algebra foundation and intermediate Python scripting."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>
            
          </div>

          {/* Submit Actions */}
          <div className="col-span-1 md:col-span-12 pt-4 border-t border-slate-100 flex flex-row items-center justify-between gap-3">
            <div className="flex-1 text-left">
              {isSubmitting && (
                <p className="text-xs text-amber-700 font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping shrink-0" />
                  {submitStatus}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    Storing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    Add to Bookshelf
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
