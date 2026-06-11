/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Book, BookNote, BookBookmark, CATEGORIES } from '../types';
import { ArrowLeft, BookOpen, Clock, FileText, Globe, Star, Plus, Trash2, Calendar, Share2, Layers, Milestone, ExternalLink, AlertTriangle, Play, ChevronLeft, ChevronRight, Edit2, Check, X, Upload, Bookmark, Hourglass, ShieldAlert } from 'lucide-react';
import { resolveBookFileUrl, uploadBookFile } from '../lib/firebase';
import { useAuth } from '../lib/authContext';

interface BookDetailsProps {
  book: Book;
  onBack: () => void;
  onUpdateBook: (updatedBook: Book) => void;
  onDeleteBook?: (id: string) => void;
}

export default function BookDetails({ book, onBack, onUpdateBook, onDeleteBook }: BookDetailsProps) {
  const { user, signInWithGoogle, submitAccessRequest, getMyRequests } = useAuth();
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [submitReason, setSubmitReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestFetchLoading, setRequestFetchLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'summary' | 'read'>('details');
  const [newNote, setNewNote] = useState('');
  const [noteChapter, setNoteChapter] = useState('');

  // Settle request updates state
  useEffect(() => {
    if (user && activeTab === 'read') {
      setRequestFetchLoading(true);
      getMyRequests()
        .then(reqs => setAccessRequests(reqs))
        .catch(err => console.error(err))
        .finally(() => setRequestFetchLoading(false));
    }
  }, [user, activeTab, requestSuccess]);
  
  // Custom eReader state preferences
  const [readerTheme, setReaderTheme] = useState<'day' | 'sepia' | 'cozy' | 'night'>('sepia');
  const [fontSize, setFontSize] = useState<number>(14); // in px
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (user?.uid && book.userPages && typeof book.userPages[user.uid] === 'number') {
      return book.userPages[user.uid];
    }
    return Math.max(1, Math.round(((book.progress || 0) / 100) * book.pageCount));
  });
  const currentChapterIndex = Math.min(2, Math.floor(((currentPage - 1) / book.pageCount) * 3));

  // Asset dynamic resolution states for local offline support
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string>(book.fileUrl);
  const [resolvedCoverImage, setResolvedCoverImage] = useState<string>(book.coverImage || '');
  const [isEpubStarted, setIsEpubStarted] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // EPUB real parse state engine
  const [epubLoading, setEpubLoading] = useState(false);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [epubZip, setEpubZip] = useState<JSZip | null>(null);
  const [epubSpine, setEpubSpine] = useState<{ id: string; href: string; title: string }[]>([]);
  const [currentEpubSpineIndex, setCurrentEpubSpineIndex] = useState(0);
  const [currentEpubHtml, setCurrentEpubHtml] = useState<string>('');

  // Pure Client-Side HTML5 Canvas PDF.js Engine (Bypasses Chrome sandboxed iframe plugin block!)
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [renderingPage, setRenderingPage] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Technical Specs inline edit states
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [editAuthors, setEditAuthors] = useState(book.authors.join(', '));
  const [editCategory, setEditCategory] = useState(book.category);
  const [editPublisher, setEditPublisher] = useState(book.publisher || '');
  const [editYear, setEditYear] = useState<number>(book.year);
  const [editPageCount, setEditPageCount] = useState<number>(book.pageCount);
  const [editFileType, setEditFileType] = useState<'pdf' | 'epub'>(book.fileType);
  const [editFileUrl, setEditFileUrl] = useState(book.fileUrl);

  useEffect(() => {
    setEditTitle(book.title);
    setEditAuthors(book.authors.join(', '));
    setEditCategory(book.category);
    setEditPublisher(book.publisher || '');
    setEditYear(book.year);
    setEditPageCount(book.pageCount);
    setEditFileType(book.fileType);
    setEditFileUrl(book.fileUrl);
  }, [book]);

  const handleSaveSpecs = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: Book = {
      ...book,
      title: editTitle.trim(),
      authors: editAuthors.split(',').map(a => a.trim()).filter(Boolean),
      category: editCategory,
      publisher: editPublisher.trim(),
      year: Number(editYear),
      pageCount: Number(editPageCount),
      fileType: editFileType,
      fileUrl: editFileUrl.trim(),
    };

    onUpdateBook(updated);
    setIsEditingSpecs(false);
    setResolvedFileUrl(updated.fileUrl);
  };

  const [coverUploading, setCoverUploading] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user?.role !== 'admin') {
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const uploadedUrl = await uploadBookFile(book.id, file, extension, 'cover');
      
      const updated: Book = {
        ...book,
        coverImage: uploadedUrl
      };
      
      onUpdateBook(updated);
      setResolvedCoverImage(uploadedUrl);
    } catch (err) {
      console.error('[BookDetails] Failed to upload cover image:', err);
    } finally {
      setCoverUploading(false);
    }
  };

  // Load PDF.js script dynamically when user activates the read tab
  useEffect(() => {
    if (activeTab !== 'read' || book.fileType !== 'pdf') return;

    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      setPdfjsLoaded(true);
    };
    script.onerror = (err) => {
      console.error('Failed to load PDF.js script:', err);
      setPdfError('Failed to load PDF viewer engine. Check your connection.');
    };
    document.body.appendChild(script);
  }, [activeTab, book.fileType]);

  // Load backend file into memory via PDF.js reader
  useEffect(() => {
    if (!pdfjsLoaded || !resolvedFileUrl || book.fileType !== 'pdf' || activeTab !== 'read') return;

    let active = true;
    setPdfLoading(true);
    setPdfError(null);
    setPdfDoc(null);

    const isExternal = resolvedFileUrl.startsWith('http://') || resolvedFileUrl.startsWith('https://');
    const pdfUrl = isExternal 
      ? `/api/proxy-pdf?url=${encodeURIComponent(resolvedFileUrl)}`
      : resolvedFileUrl;

    const loadingTask = (window as any).pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(
      (pdf: any) => {
        if (active) {
          setPdfDoc(pdf);
          setPdfLoading(false);
        }
      },
      (err: any) => {
        console.error('[PDF.js] load document error:', err);
        if (active) {
          setPdfError(err.message || 'Failed to load PDF document.');
          setPdfLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [resolvedFileUrl, pdfjsLoaded, book.fileType, activeTab]);

  // Render current page onto <canvas> at high scale density
  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    setRenderingPage(true);

    const targetPage = Math.max(1, Math.min(currentPage, pdfDoc.numPages));

    pdfDoc.getPage(targetPage).then((page: any) => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        setRenderingPage(false);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        setRenderingPage(false);
        return;
      }

      // Read parent layout density for fluid crisp resize
      const containerWidth = canvas.parentElement?.clientWidth || 700;
      const initialViewport = page.getViewport({ scale: 1.0 });
      const computedScale = (containerWidth / initialViewport.width) * 1.5; // Supersampled 1.5x scale
      const viewport = page.getViewport({ scale: computedScale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Adjust styles for fluid rendering
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.transform = 'translateZ(0) scale(1)';
      canvas.style.backfaceVisibility = 'hidden';
      canvas.style.webkitBackfaceVisibility = 'hidden';

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        if (active) {
          setRenderingPage(false);
        }
      }).catch((renderErr: any) => {
        console.warn('Render task completed or aborted:', renderErr);
        if (active) setRenderingPage(false);
      });
    }).catch((err: any) => {
      console.error('Page render error:', err);
      if (active) setRenderingPage(false);
    });

    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, renderTrigger]);

  // Helper to resolve EPUB relative paths nicely and safely
  const cleanEpubPath = (path: string): string => {
    const parts = path.split('/');
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  };

  // Traverses XHTML DOM to extract inline image blobs and strip outer theme overrides
  const processEpubHtml = async (text: string, filepath: string, zip: JSZip): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    
    // Resolve base directory
    const lastSlash = filepath.lastIndexOf('/');
    const chapterFolder = lastSlash !== -1 ? filepath.substring(0, lastSlash + 1) : '';

    // Solve inner responsive images offline
    const imgElements = doc.querySelectorAll("img, image");
    for (const img of Array.from(imgElements)) {
      const srcAttr = img.getAttribute("src") || img.getAttribute("xlink:href");
      if (srcAttr && !srcAttr.startsWith('data:') && !srcAttr.startsWith('http')) {
        const fullImgPath = cleanEpubPath(chapterFolder + srcAttr);
        const imgFile = zip.file(fullImgPath);
        if (imgFile) {
          try {
            const blob = await imgFile.async("blob");
            const objectUrl = URL.createObjectURL(blob);
            if (img.tagName.toLowerCase() === 'image') {
              img.setAttribute("xlink:href", objectUrl);
            } else {
              img.setAttribute("src", objectUrl);
            }
          } catch (e) {
            console.warn("Failed resolving EPUB image path: " + fullImgPath, e);
          }
        }
      }
    }

    // Strip conflicting styling defaults to match reader colors
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('color');
      el.removeAttribute('bgcolor');
      el.removeAttribute('face');
    });

    return doc.body.innerHTML;
  };

  // Fetch and index the whole EPUB structure
  useEffect(() => {
    if (book.fileType !== 'epub' || !resolvedFileUrl || activeTab !== 'read') return;

    let isMounted = true;
    setEpubLoading(true);
    setEpubError(null);
    setEpubZip(null);
    setEpubSpine([]);
    setCurrentEpubHtml('');

    const loadEpub = async () => {
      try {
        const isExternal = resolvedFileUrl.startsWith('http://') || resolvedFileUrl.startsWith('https://');
        const epubUrl = isExternal 
          ? `/api/proxy-pdf?url=${encodeURIComponent(resolvedFileUrl)}`
          : resolvedFileUrl;
        const res = await fetch(epubUrl);
        if (!res.ok) {
          throw new Error(`Failed to load EPUB file: ${res.status} ${res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        if (!isMounted) return;
        setEpubZip(zip);

        // 1. Parse container.xml to locate rootfile .opf file
        const containerFile = zip.file("META-INF/container.xml");
        if (!containerFile) {
          throw new Error("Invalid structure: META-INF/container.xml not found");
        }
        const containerXmlText = await containerFile.async("string");
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXmlText, "text/xml");
        const rootfileEl = containerDoc.querySelector("rootfile");
        if (!rootfileEl) {
          throw new Error("Invalid container.xml schema mapping");
        }
        const rootfilePath = rootfileEl.getAttribute("full-path");
        if (!rootfilePath) {
          throw new Error("Root OPF file path not specified in container");
        }

        // 2. Fetch base directory for relative URL resolution
        const lastSlash = rootfilePath.lastIndexOf('/');
        const opfBaseDir = lastSlash !== -1 ? rootfilePath.substring(0, lastSlash + 1) : '';

        // 3. Extract and parse OPF manifest catalog
        const opfFile = zip.file(rootfilePath);
        if (!opfFile) {
          throw new Error(`OPF rootfile metadata not found at path: ${rootfilePath}`);
        }
        const opfText = await opfFile.async("string");
        const opfDoc = parser.parseFromString(opfText, "text/xml");

        // 4. Index manifest elements
        const manifestMap: Record<string, string> = {};
        const manifestItems = opfDoc.querySelectorAll("manifest > item");
        manifestItems.forEach(item => {
          const itemId = item.getAttribute("id");
          const itemHref = item.getAttribute("href");
          if (itemId && itemHref) {
            manifestMap[itemId] = itemHref;
          }
        });

        // 5. Index spine in proper visual order
        const spineItems = opfDoc.querySelectorAll("spine > itemref");
        const spineList: { id: string; href: string; title: string }[] = [];
        
        spineItems.forEach((item, index) => {
          const idref = item.getAttribute("idref");
          if (idref && manifestMap[idref]) {
            const h = cleanEpubPath(opfBaseDir + manifestMap[idref]);
            
            // Search for item/toc titles or defaults
            let chapterText = `Section ${index + 1}`;
            spineList.push({
              id: idref,
              href: h,
              title: chapterText
            });
          }
        });

        if (spineList.length === 0) {
          throw new Error("Metadata catalog spine contains no readable content chapters");
        }

        if (isMounted) {
          setEpubSpine(spineList);
          // Map initial index based on page ratio if the book has standard progress percentage
          const targetProgress = (user?.uid && book.userProgress && typeof book.userProgress[user.uid] === 'number')
            ? book.userProgress[user.uid]
            : (book.progress || 0);

          const initialIndex = Math.min(
            spineList.length - 1, 
            Math.max(0, Math.floor((targetProgress / 100) * spineList.length))
          );
          setCurrentEpubSpineIndex(initialIndex);
        }
      } catch (err: any) {
        console.error("[EPUB Engine Error]", err);
        if (isMounted) {
          setEpubError(err.message || 'Malformed structure decoding archive files');
        }
      } finally {
        if (isMounted) {
          setEpubLoading(false);
        }
      }
    };

    loadEpub();

    return () => {
      isMounted = false;
    };
  }, [resolvedFileUrl, book.fileType, activeTab, user?.uid, book.id]);

  // Load and render active chapter body contents
  useEffect(() => {
    if (!epubZip || epubSpine.length === 0) return;
    const activeSpineItem = epubSpine[currentEpubSpineIndex];
    if (!activeSpineItem) return;

    let isMounted = true;
    const loadChapter = async () => {
      try {
        const file = epubZip.file(activeSpineItem.href);
        if (!file) {
          throw new Error(`Chapter asset resource missing inside ZIP: ${activeSpineItem.href}`);
        }
        const text = await file.async("string");
        if (!isMounted) return;

        const processed = await processEpubHtml(text, activeSpineItem.href, epubZip);
        if (isMounted) {
          setCurrentEpubHtml(processed);
          
          // Save reading progress dynamically based on current spine fraction
          const percentProgress = Math.round((currentEpubSpineIndex / epubSpine.length) * 100);
          const currentUserProg = (user?.uid && book.userProgress && typeof book.userProgress[user.uid] === 'number')
            ? book.userProgress[user.uid]
            : (book.progress || 0);

          if (percentProgress !== currentUserProg) {
            const updatedBook: Book = {
              ...book,
              progress: percentProgress
            };
            if (user?.uid) {
              updatedBook.userProgress = {
                ...(book.userProgress || {}),
                [user.uid]: percentProgress
              };
              updatedBook.userPages = {
                ...(book.userPages || {}),
                [user.uid]: Math.max(1, Math.round((percentProgress / 100) * book.pageCount))
              };
            }
            onUpdateBook(updatedBook);
          }
        }
      } catch (err: any) {
        console.error("Failed parsing EPUB chapter:", err);
        if (isMounted) {
          setCurrentEpubHtml(`<div class="p-8 text-rose-500 font-semibold text-center space-y-4">
            <p>Failed to parse EPUB chapter XHTML document.</p>
            <p class="text-xs font-mono text-slate-400 opacity-80">${err.message || err}</p>
          </div>`);
        }
      }
    };

    loadChapter();
    return () => {
      isMounted = false;
    };
  }, [epubZip, epubSpine, currentEpubSpineIndex]);

  // Handle panel scaling and viewport updates
  useEffect(() => {
    if (activeTab === 'read') {
      const timer = setTimeout(() => {
        setRenderTrigger(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    let fileCleanup: (() => void) | undefined;
    let coverCleanup: (() => void) | undefined;

    const resolveAllAssets = async () => {
      try {
        // Resolve dynamic book file pdf/epub path
        const fileRes = await resolveBookFileUrl(book.fileUrl);
        if (isMounted) {
          setResolvedFileUrl(fileRes.url);
          fileCleanup = fileRes.cleanup;
        }

        // Resolve cover if it's stored locally
        if (book.coverImage) {
          const coverRes = await resolveBookFileUrl(book.coverImage);
          if (isMounted) {
            setResolvedCoverImage(coverRes.url);
            coverCleanup = coverRes.cleanup;
          }
        } else {
          if (isMounted) setResolvedCoverImage('');
        }
      } catch (err) {
        console.error('[BookDetails] Asset resolution error:', err);
      }
    };

    resolveAllAssets();

    // Reset view options when book is switched
    setIsEpubStarted(false);
    setIframeError(false);
    if (isMounted) {
      const targetUserPage = (user?.uid && book.userPages && typeof book.userPages[user.uid] === 'number')
        ? book.userPages[user.uid]
        : Math.max(1, Math.round(((book.progress || 0) / 100) * book.pageCount));
      setCurrentPage(targetUserPage);
    }

    return () => {
      isMounted = false;
      if (fileCleanup) fileCleanup();
      if (coverCleanup) coverCleanup();
    };
  }, [book.fileUrl, book.coverImage, user?.uid, book.id]);

  // Dynamic syllabus & textbook chapters generator based on selected book metadata
  const getDynamicChapters = (b: Book) => {
    const topics = b.keyTopics && b.keyTopics.length > 0
      ? b.keyTopics
      : ['Fundamental Principles', 'Advanced Applications', 'Technical Case Studies'];
    
    const chapter1Title = `Chapter 1: Foundations of ${topics[0] || 'Core Methodology'}`;
    const chapter2Title = `Chapter 2: Deep Dive into ${topics[1] || 'Tactical Implementations'}`;
    const chapter3Title = `Chapter 3: Future Frontiers in ${topics[2] || 'System Scaling'}`;

    return [
      {
        title: chapter1Title,
        content: `Welcome to "${b.title}". Under the guidance of ${b.authors.join(' and ')}, this material establishes the foundational bedrock of ${topics[0] || 'its core subject matter'}.\n\nAs we embark on this syllabus, we explore why these scientific frameworks and architectures remain highly critical in contemporary research and modern engineering. ${b.description || ''}\n\nUnderstanding these systems involves looking at how information is structured, routed, and stored. Each architectural design decision—whether optimizing for raw processing speed or high density storage partitions—demands a clear layout study of system trade-offs, a hallmark of professional software craftsmanship.`
      },
      {
        title: chapter2Title,
        content: `Continuing our study of "${b.title}", we transition into ${topics[1] || 'advanced tactical mechanics'}.\n\nHere, our principal focus shifts to practical server and mathematical constraints: computational latency bounds, caching policies, communication overhead, and resource bottlenecks.\n\nBy leveraging the advanced methodologies highlighted in ${topics[1] || 'this chapter'}, practitioners can build resilient, high-integrity workflows. We analyze live performance indicators, optimize execution paths, and implement error-correcting patterns to handle data drift.\n\nKey Concepts Syllabus Reference:\n${b.summary?.learningPath?.map((item, idx) => `• 0${idx + 1}. ${item}`).join('\n') || '• Master foundational constructs\n• Implement sample use-cases'}`
      },
      {
        title: chapter3Title,
        content: `Finally, we conclude by projecting forward into tomorrow's applications of ${topics[2] || 'next-generation techniques'}.\n\nWhat happens as we scale these structures across massive distributed environments? We merge modern paradigms with ${topics[2] || 'emerging protocols'} and autonomous agent workflows to process information streams at scale.\n\nWith the strategic support of ${b.publisher} and academic archives, researchers continue to pioneer robust, enterprise-grade validation loops that set the standard for high-craft digital products.`
      }
    ];
  };

  const currentChapters = getDynamicChapters(book);

  // Dynamics text block generator per page for continuous high visual fidelity reading
  const getPageContent = (p: number) => {
    const topics = book.keyTopics && book.keyTopics.length > 0
      ? book.keyTopics
      : ['Fundamental Principles', 'Advanced Applications', 'Technical Case Studies'];
    
    // Choose active topic based on page progress
    const segmentSize = Math.max(1, Math.ceil(book.pageCount / topics.length));
    const activeTopicIndex = Math.min(topics.length - 1, Math.floor((p - 1) / segmentSize));
    const activeTopic = topics[activeTopicIndex] || topics[0];

    const subtopics = [
      'Core Theoretical Premises and Architecture',
      'Mathematical Verification Frameworks',
      'Structural Performance Bottlenecks',
      'Real-world Case Studies & Trade-offs',
      'Enterprise Scalability Strategies',
      'Modern Protocols & Robust Safety Layers'
    ];
    const subtopic = subtopics[(p + 3) % subtopics.length];

    // Generate beautiful academic text
    const textIntro = `Welcome to page ${p} of "${book.title}". Under the expert scientific guidance of ${book.authors.join(' and ')}, this material provides rich reference standards. Specifically, we explore deep conceptual frameworks surrounding ${activeTopic}.\n\nAt this current segment, we examine "${subtopic}". Understanding these guidelines remains extremely critical for high-craft practitioners to avoid system variance bottlenecks and ensure predictable performance.`;
    
    const textBody = `To design robust structures at scale, we must model resources, buffer sizes, and network packet routes precisely. On page ${p}, the syllabus introduces tactical calculation formulas for: latency bounds, caching policies, memory footprint density, and multi-threaded synchronization bounds.\n\nFurthermore, when implementing pipelines, engineers must continuously monitor metrics without polluting outer layers with redundant telemetry. The performance loop demand continuous status logging against structural consensus drift.`;

    const textOutro = `Essential Practice Standard for Page ${p}:\nAlways verify the trade-offs between storage read/write amplification, transactional checkpoints, and network serializability locks. For self-guided homework assessments, please complete the review checklist on page ${Math.min(book.pageCount, p + 1)}.`;

    return {
      title: `Page ${p}: Study of ${activeTopic}`,
      subtopic: subtopic,
      content: `${textIntro}\n\n${textBody}\n\n${textOutro}`
    };
  };

  const getContainerThemeClasses = () => {
    switch (readerTheme) {
      case 'day': return 'bg-white text-slate-800 border-slate-200 shadow-sm';
      case 'sepia': return 'bg-[#FCF8F0] text-[#433422] border-[#FAF6EE] shadow-sm';
      case 'cozy': return 'bg-[#181d26] text-slate-200 border-[#222e3e] shadow-lg';
      case 'night': return 'bg-[#090d16] text-[#cdd9e5] border-black shadow-lg';
    }
  };

  const handlePageChange = (newPage: number) => {
    const clampedPage = Math.max(1, Math.min(book.pageCount, newPage));
    setCurrentPage(clampedPage);
    // Calculated live progress percentage based on current page
    const newProgress = Math.round((clampedPage / book.pageCount) * 100);
    const updatedBook: Book = {
      ...book,
      progress: newProgress
    };
    if (user?.uid) {
      updatedBook.userProgress = {
        ...(book.userProgress || {}),
        [user.uid]: newProgress
      };
      updatedBook.userPages = {
        ...(book.userPages || {}),
        [user.uid]: clampedPage
      };
    }
    onUpdateBook(updatedBook);
  };

  // Notes management
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const note: BookNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      chapter: noteChapter.trim() || undefined,
      text: newNote.trim(),
      userId: user?.uid
    };

    const updatedBook: Book = {
      ...book,
      notes: [...(book.notes || []), note]
    };

    onUpdateBook(updatedBook);
    setNewNote('');
    setNoteChapter('');
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedBook: Book = {
      ...book,
      notes: (book.notes || []).filter(note => note.id !== noteId)
    };
    onUpdateBook(updatedBook);
  };

  const handleUpdateProgress = (newProg: number) => {
    const clamped = Math.max(0, Math.min(100, newProg));
    const updatedBook: Book = {
      ...book,
      progress: clamped
    };
    if (user?.uid) {
      updatedBook.userProgress = {
        ...(book.userProgress || {}),
        [user.uid]: clamped
      };
      updatedBook.userPages = {
        ...(book.userPages || {}),
        [user.uid]: Math.max(1, Math.round((clamped / 100) * book.pageCount))
      };
    }
    onUpdateBook(updatedBook);
  };

  // Bookmarks management
  const handleAddBookmark = () => {
    const timestamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isPdf = book.fileType === 'pdf';
    const label = isPdf 
      ? `Page ${currentPage}` 
      : (epubSpine[currentEpubSpineIndex]?.title || `Section ${currentEpubSpineIndex + 1}`);

    const newBookmark: BookBookmark = {
      id: `bookmark-${Date.now()}`,
      userId: user?.uid || undefined,
      timestamp,
      label,
      ...(isPdf ? { page: currentPage } : { spineIndex: currentEpubSpineIndex })
    };

    const updatedBook: Book = {
      ...book,
      bookmarks: [...(book.bookmarks || []), newBookmark]
    };

    onUpdateBook(updatedBook);
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    const updatedBook: Book = {
      ...book,
      bookmarks: (book.bookmarks || []).filter(b => b.id !== bookmarkId)
    };
    onUpdateBook(updatedBook);
  };

  const handleJumpToBookmark = (b: BookBookmark) => {
    if (book.fileType === 'pdf' && b.page !== undefined) {
      handlePageChange(b.page);
    } else if (book.fileType === 'epub' && b.spineIndex !== undefined) {
      if (!isEpubStarted) {
        setIsEpubStarted(true);
      }
      setCurrentEpubSpineIndex(b.spineIndex);
    }
  };

  // EPUB Reader themes CSS helper
  const getThemeClasses = () => {
    switch (readerTheme) {
      case 'day': return 'bg-white text-slate-900 border-slate-200';
      case 'sepia': return 'bg-[#FAF6EE] text-[#433422] border-[#E8DFC8]';
      case 'cozy': return 'bg-slate-950 text-slate-200 border-slate-800';
      case 'night': return 'bg-[#0f141c] text-[#cdd9e5] border-[#222e3e]';
    }
  };

  return (
    <article className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Return Navigation Anchor Bar */}
      <div className="flex items-center justify-between">
        <button
          id="back-to-bookshelf"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Back to Bookshelf
        </button>

        {/* Dynamic reading percentage controls */}
        <div className="flex items-center gap-3">
          {onDeleteBook && user?.role === 'admin' && (
            <button
              id="delete-book-detail"
              onClick={() => onDeleteBook(book.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg shadow-2xs transition active:scale-[0.98] mr-2 cursor-pointer"
              title="Delete this book from library"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-550" />
              <span>Delete Book</span>
            </button>
          )}

          <span className="text-xs font-mono font-semibold text-slate-500">Reading Progress:</span>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <input
              type="number"
              min="0"
              max="100"
              value={(user?.uid && book.userProgress && typeof book.userProgress[user.uid] === 'number') ? book.userProgress[user.uid] : (book.progress || 0)}
              onChange={(e) => handleUpdateProgress(Number(e.target.value))}
              className="w-11 text-center py-0.5 text-xs font-bold bg-white rounded border border-slate-200 text-slate-800 focus:outline-none"
            />
            <span className="text-xs font-bold text-slate-500 pr-1">%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Book Billboard Metadata Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-md p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Cover Art Box (3 cols) */}
        <div className="md:col-span-3 flex flex-col items-center">
          <div 
            className={`aspect-[3/4] w-48 rounded-lg shadow-xl relative overflow-hidden select-none flex flex-col justify-between p-4 group ${user?.role === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => {
              if (user?.role === 'admin') {
                document.getElementById('cover-file-input')?.click();
              }
            }}
            style={{ 
               background: book.coverColor || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
               boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
            }}
          >
            {/* Real 3D Book spine shadow crease overlay */}
            <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-3 bottom-0 w-[1px] bg-white/15 pointer-events-none" />
            
            {resolvedCoverImage ? (
              <img
                src={resolvedCoverImage}
                alt={book.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : null}

            {/* If there's an image, overlay dynamic elements to keep the cover art crisp and publisher-grade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10 flex flex-col justify-between p-4 text-white">
              <span className="text-[9px] uppercase tracking-widest text-amber-400 font-mono font-semibold">
                {book.category}
              </span>
              
              {!resolvedCoverImage && (
                <p className="font-sans font-bold text-sm md:text-base leading-tight tracking-tight mt-4 line-clamp-4">
                  {book.title}
                </p>
              )}

              <div className="mt-auto">
                <p className="text-[10px] text-white/90 font-medium truncate">by {book.authors.join(', ')}</p>
                <div className="flex justify-between items-center text-[8px] text-white/50 border-t border-white/10 pt-1 mt-1 font-mono">
                  <span>{book.publisher}</span>
                  <span>{book.year}</span>
                </div>
              </div>
            </div>
            
            {/* Subtle light highlighting page overlays */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 via-white/0 to-transparent z-10 pointer-events-none" />

            {/* Hover visual instructions to change image */}
            {user?.role === 'admin' && (
              <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                <Upload className="w-6 h-6 text-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Cover</span>
              </div>
            )}

            {coverUploading && (
              <div className="absolute inset-0 bg-black/85 z-25 flex flex-col items-center justify-center gap-1.5 font-sans">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Uploading...</span>
              </div>
            )}
          </div>

          <div className="mt-4 text-center space-y-2 flex flex-col items-center w-full max-w-[192px]">
            <div className="space-y-0.5">
              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded tracking-wider text-white inline-flex items-center gap-1 ${
                book.fileType === 'pdf' ? 'bg-red-600' : 'bg-blue-600'
              }`}>
                <FileText className="w-3 h-3" />
                {book.fileType.toUpperCase()} Format
              </span>
              <p className="text-[11px] text-slate-400 font-medium">{book.pageCount} Estimated Pages</p>
            </div>

            {user?.role === 'admin' && (
              <label className="w-full">
                <input
                  id="cover-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                  disabled={coverUploading}
                />
                <span className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Cover Image
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Textual Specs Summary Panel (9 cols) */}
        <div className="md:col-span-9 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200/50 rounded-full font-sans">
                {book.category}
              </span>
              <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded border border-slate-100">
                Published {book.year}
              </span>
            </div>
            
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {book.title}
            </h1>
            
            <p className="text-sm font-medium text-slate-600">
              by <span className="text-slate-800 font-semibold">{book.authors.join(', ')}</span>
            </p>

            <div className="h-[1px] bg-slate-100 w-full my-4" />

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              {book.description || 'No database summary available.'}
            </p>
          </div>

          {/* Icon Attributes shelf at the bottom of metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100/50 text-[11px] text-slate-500 font-sans leading-tight">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">Publisher</p>
                <p className="truncate">{book.publisher}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">Published</p>
                <p>{book.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">File Type</p>
                <p className="uppercase">{book.fileType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 font-sans">Page count</p>
                <p>{book.pageCount}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* THREE INTERACTIVE TABS ANCHORS */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200">
          <button
            id="tab-details"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-6 text-xs font-bold border-b-2 tracking-wide transition ${
              activeTab === 'details'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Details & Metadata
          </button>
          <button
            id="tab-summary"
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-6 text-xs font-bold border-b-2 tracking-wide transition ${
              activeTab === 'summary'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            AI Summary / Study Guide
          </button>
          <button
            id="tab-read"
            onClick={() => setActiveTab('read')}
            className={`py-3 px-6 text-xs font-bold border-b-2 tracking-wide transition flex items-center gap-1.5 ${
              activeTab === 'read'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Read Book
          </button>
        </div>

        {/* TAB CONTENTS PANELS */}
        <div className="min-h-[300px]">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-200">
              {/* Metadata Details specifications */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">Technical Specifications</h3>
                  {!isEditingSpecs && user?.role === 'admin' ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingSpecs(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 transition px-3 py-1.5 rounded-lg border border-amber-200/60 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Specifications
                    </button>
                  ) : !isEditingSpecs ? null : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveSpecs()}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition px-3 py-1.5 rounded-lg cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSpecs(false);
                          // Reset to current book values
                          setEditTitle(book.title);
                          setEditAuthors(book.authors.join(', '));
                          setEditCategory(book.category);
                          setEditPublisher(book.publisher || '');
                          setEditYear(book.year);
                          setEditPageCount(book.pageCount);
                          setEditFileType(book.fileType);
                          setEditFileUrl(book.fileUrl);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {!isEditingSpecs ? (
                  <table className="w-full text-xs font-sans text-slate-600 cell-padding divide-y divide-slate-100">
                    <tbody>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800 w-1/3">Book ID</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500 select-all">{book.id}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Full Title</td>
                        <td className="py-2.5 font-medium text-slate-900">{book.title}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Authors</td>
                        <td className="py-2.5">{book.authors.join(', ')}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Category</td>
                        <td className="py-2.5">{book.category}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Publisher</td>
                        <td className="py-2.5">{book.publisher}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Published Year</td>
                        <td className="py-2.5 font-mono">{book.year}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">Page Count</td>
                        <td className="py-2.5 font-mono">{book.pageCount} estimated pages</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">File Type</td>
                        <td className="py-2.5 font-semibold text-slate-700 uppercase">{book.fileType}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">File Source URL</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500 truncate max-w-[400px]" title={book.fileUrl}>{book.fileUrl}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveSpecs(); }} className="space-y-4 text-xs font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Full Title</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Authors (comma separated)</label>
                        <input
                          type="text"
                          required
                          value={editAuthors}
                          onChange={(e) => setEditAuthors(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Publisher</label>
                        <input
                          type="text"
                          value={editPublisher}
                          onChange={(e) => setEditPublisher(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Published Year</label>
                        <input
                          type="number"
                          value={editYear}
                          onChange={(e) => setEditYear(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">Page Count</label>
                        <input
                          type="number"
                          value={editPageCount}
                          onChange={(e) => setEditPageCount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">File Type</label>
                        <select
                          value={editFileType}
                          onChange={(e) => setEditFileType(e.target.value as 'pdf' | 'epub')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-bold"
                        >
                          <option value="pdf">PDF</option>
                          <option value="epub">EPUB</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700">File Source URL</label>
                        <input
                          type="text"
                          required
                          value={editFileUrl}
                          onChange={(e) => setEditFileUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono text-[11px]"
                        />
                      </div>

                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
              
              {/* Detailed Study Guide Syllabus */}
              <div className="md:col-span-8 bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
                    <Layers className="w-4.5 h-4.5 text-amber-500" />
                    Book Synopsis & Core Concepts
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {book.summary.overview}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Suggested Reading syllabus</h4>
                  <div className="space-y-2">
                    {book.summary.learningPath.map((step, idx) => (
                      <div key={idx} className="flex gap-3 text-xs text-slate-600 leading-relaxed font-sans items-start">
                        <span className="w-5 h-5 bg-amber-50 text-amber-700 font-bold font-mono text-[10px] border border-amber-100 rounded flex items-center justify-center mt-0.5 shrink-0">
                          0{idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Study Panel prerequisites list */}
              <div className="md:col-span-4 space-y-4">
                
                {/* Prerequisites card */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
                    <Milestone className="w-3.5 h-3.5" />
                    Prerequisites
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-normal">
                    {book.summary.entryPrerequisites}
                  </p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block pt-2 border-t border-slate-50">
                    Who is this for?
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {book.summary.targetAudience}
                  </p>
                </div>

                {/* Topics Bag card */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest block font-sans">Main Key Topics</h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {book.keyTopics.map((topic) => (
                      <span 
                        key={topic} 
                        className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-100 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: READ BOOK */}
          {activeTab === 'read' && (
            !user ? (
              // Case 1: Guest (not logged in)
              <div className="w-full max-w-xl mx-auto bg-white rounded-xl border border-slate-200/60 shadow-md p-8 text-center space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-200/50">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-900 font-sans tracking-tight">Access Restricted Content</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Please sign in to request access to the digital library bookshelf and copyrighted textbook files.
                  </p>
                </div>
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-650 hover:bg-amber-750 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition active:scale-[0.98] cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-white" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (!user.libraryAccess && user.role !== 'admin') ? (
              // Case 2: Logged in Viewer without libraryAccess
              <div className="w-full max-w-xl mx-auto bg-white rounded-xl border border-slate-200/60 shadow-md p-8 animate-in fade-in duration-300">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-55 hover:scale-[1.02] transition rounded-full flex items-center justify-center mx-auto text-rose-650 border border-rose-200/50">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-slate-900 font-sans tracking-tight">Copyrighted Materials Protection</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      You do not currently have permission to access copyrighted book content in the reader panel. Submit a library access request below for administrator approval.
                    </p>
                  </div>
                </div>

                {/* Show Request status */}
                {requestFetchLoading ? (
                  <div className="mt-6 flex justify-center items-center py-4">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : accessRequests.some(r => r.status === 'pending') ? (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3">
                    <Hourglass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 font-sans">Request Under Review</h4>
                      <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                        Your library access request is currently pending administrative review from <strong>adiemus80@gmail.com</strong>. We will notify you here once reviewed.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!submitReason.trim()) {
                        setRequestError('Please provide a reason to request library access.');
                        return;
                      }
                      setSubmittingRequest(true);
                      setRequestError(null);
                      try {
                        await submitAccessRequest(submitReason);
                        setRequestSuccess(true);
                        setSubmitReason('');
                      } catch (err: any) {
                        setRequestError(err.message || 'Failed to submit request.');
                      } finally {
                        setSubmittingRequest(false);
                      }
                    }} 
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Reason for requesting access</label>
                      <textarea
                        value={submitReason}
                        onChange={(e) => setSubmitReason(e.target.value)}
                        placeholder="I'm a researcher studying data engineering models / I want to study advanced neural networks for class..."
                        rows={3}
                        maxLength={1000}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 shadow-3xs"
                      />
                      <span className="text-[10px] text-slate-405 font-mono text-right block mt-1">{1000 - submitReason.length} characters left</span>
                    </div>

                    {requestError && (
                      <p className="text-[11px] text-red-500 font-medium">{requestError}</p>
                    )}

                    {requestSuccess && (
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" /> Request submitted successfully!
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submittingRequest}
                      className="w-full px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-lg transition active:scale-[0.98] shadow-xs cursor-pointer text-center"
                    >
                      {submittingRequest ? 'Submitting access request...' : 'Request Library Access'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-300">
              
              {/* THE ACTIVE READER CANVAS (8 or 12 cols depending on notes open state) */}
              <div id="read-book-reader-view" className={`md:col-span-8 rounded-xl border p-4 flex flex-col space-y-4 transition-all duration-350 ${getContainerThemeClasses()}`}>
                
                {/* Dynamic Reader settings bar */}
                <div className={`flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border text-xs transition-colors duration-200 ${
                  readerTheme === 'day' ? 'bg-slate-50 border-slate-150 text-slate-700' :
                  readerTheme === 'sepia' ? 'bg-[#F4EFE6] border-[#EADFC9] text-[#433422]' :
                  readerTheme === 'cozy' ? 'bg-slate-900/60 border-slate-800 text-slate-350' :
                  'bg-black/40 border-slate-800/80 text-slate-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <BookOpen className={`w-4 h-4 ${readerTheme === 'cozy' || readerTheme === 'night' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className="font-bold hidden sm:inline">Reader Panel:</span>
                    <span className="font-mono font-semibold text-[11px] opacity-80">{book.fileType.toUpperCase()} file</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* epub parameters triggers or reader controls */}
                    {((book.fileType === 'epub' && isEpubStarted) || book.fileType === 'pdf') && (
                      <>
                        {/* Theme selectors */}
                        <div className={`flex items-center gap-1 p-1 rounded-lg border transition-colors duration-200 ${
                          readerTheme === 'cozy' || readerTheme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          {(['day', 'sepia', 'cozy', 'night'] as const).map((theme) => (
                            <button
                              key={theme}
                              onClick={() => setReaderTheme(theme)}
                              className={`w-5 h-5 rounded-full border text-[9px] font-bold capitalize flex items-center justify-center cursor-pointer transition ${
                                theme === 'day' ? 'bg-white border-slate-300 text-slate-900' :
                                theme === 'sepia' ? 'bg-[#FAF6EE] border-[#DCD3BE] text-[#433422]' :
                                theme === 'cozy' ? 'bg-slate-900 border-slate-800 text-slate-100' :
                                'bg-slate-950 border-black text-[#cdd9e5]'
                              } ${readerTheme === theme ? 'ring-2 ring-amber-500' : ''}`}
                              title={`${theme} reader theme`}
                            >
                              {theme[0]}
                            </button>
                          ))}
                        </div>

                        {/* Font size controllers only for ePUB reflowable text */}
                        {book.fileType === 'epub' && (
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-colors duration-200 ${
                            readerTheme === 'cozy' || readerTheme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <button 
                              onClick={() => setFontSize(Math.max(10, fontSize - 1))} 
                              className={`font-bold px-1 font-sans text-xs focus:outline-none cursor-pointer ${
                                readerTheme === 'cozy' || readerTheme === 'night' ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              title="Decrease text size"
                            >
                              A-
                            </button>
                            <span className={`font-mono text-[10px] font-bold w-6 text-center ${
                              readerTheme === 'cozy' || readerTheme === 'night' ? 'text-slate-300' : 'text-slate-650'
                            }`}>{fontSize}px</span>
                            <button 
                              onClick={() => setFontSize(Math.min(22, fontSize + 1))} 
                              className={`font-bold px-1 font-sans text-xs focus:outline-none cursor-pointer ${
                                readerTheme === 'cozy' || readerTheme === 'night' ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              title="Increase text size"
                            >
                              A+
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <a
                      href={resolvedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 border border-slate-200 hover:border-slate-300 rounded flex items-center gap-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                      Open Full File in New Tab
                    </a>
                  </div>
                </div>

                {/* Embedded PDF Canvas or EPUB reader fallback */}
                <div className="rounded-lg overflow-hidden border border-slate-200/60 bg-slate-100 min-h-[500px] flex flex-col justify-between" id="reader-frame-parent">
                  {book.fileType === 'pdf' ? (
                    <div className="relative w-full min-h-[650px] flex flex-col rounded-lg overflow-hidden border border-slate-200/50 bg-slate-950" id="reader-canvas-workspace">
                      
                      {/* Active Study Page Progress HUD bar */}
                      <div className={`px-4 py-3 border-b text-xs flex flex-wrap items-center justify-between gap-2 z-20 ${
                        readerTheme === 'day' ? 'bg-slate-50 border-slate-200 text-slate-850' :
                        readerTheme === 'sepia' ? 'bg-[#FAF6EE] border-[#FAF6EE] text-[#433422]' :
                        readerTheme === 'cozy' ? 'bg-slate-900 border-slate-800 text-slate-200' :
                        'bg-slate-950 border-slate-900 text-slate-350'
                      }`}>
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${readerTheme === 'sepia' ? 'text-amber-700' : 'text-amber-500'}`} />
                          <div>
                            Viewing <span className="font-extrabold">{book.title}</span> — Page <span className="font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{currentPage}</span> of <span className="font-mono font-bold">{book.pageCount}</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-medium opacity-80">
                          {Math.round((currentPage / book.pageCount) * 100)}% studied
                        </div>
                      </div>

                      {/* The Scrollable Canvas area with Floating Next/Prev arrows */}
                      <div className={`relative flex-1 flex items-center justify-center p-4 overflow-auto min-h-[500px] z-10 transition-colors duration-250 ${
                        readerTheme === 'day' ? 'bg-slate-100' :
                        readerTheme === 'sepia' ? 'bg-[#FAF6EE]/55' :
                        readerTheme === 'cozy' ? 'bg-slate-950/70' :
                        'bg-black'
                      }`}>
                        
                        {/* 1. Loader screen */}
                        {pdfLoading && (
                          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center text-white space-y-3">
                            <BookOpen className="w-12 h-12 text-amber-500 animate-pulse" />
                            <h4 className="font-semibold text-sm">Loading dynamic PDF document standard...</h4>
                            <p className="text-xs text-slate-400 max-w-sm">Decrypting high-fidelity vectors. Please wait...</p>
                          </div>
                        )}

                        {/* 2. Error screen */}
                        {pdfError && (
                          <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center p-8 text-center text-white space-y-4">
                            <AlertTriangle className="w-12 h-12 text-rose-500" />
                            <h4 className="font-bold text-sm">Failed to render inline PDF</h4>
                            <p className="text-xs text-slate-400 max-w-sm">{pdfError}</p>
                            <a 
                              href={resolvedFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white rounded-lg shadow transition flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open Document in New Tab
                            </a>
                          </div>
                        )}

                        {/* 3. Rendering Spinner */}
                        {renderingPage && !pdfLoading && !pdfError && (
                          <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-[10px] font-mono font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1.5 z-20 animate-pulse">
                            <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            Rendering page {currentPage}...
                          </div>
                        )}

                        {/* LEFT BOUNDARY ARROW */}
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-slate-900/95 hover:bg-amber-600 font-bold border border-slate-800 disabled:opacity-20 text-white transition hover:scale-110 active:scale-95 shadow-xl cursor-pointer flex items-center justify-center"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-5 h-5 text-amber-500 hover:text-white" />
                        </button>

                        {/* THE PDF CANVAS VIEW */}
                        <div className="max-w-xl sm:max-w-2xl w-full border border-slate-200/50 dark:border-slate-800 shadow-2xl rounded bg-white overflow-hidden animate-in fade-in duration-300">
                          <canvas 
                            ref={canvasRef} 
                            className="block mx-auto bg-white" 
                            style={{ transform: 'translateZ(0) scale(1)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                          />
                        </div>

                        {/* RIGHT BOUNDARY ARROW */}
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === book.pageCount}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-slate-900/95 hover:bg-amber-600 font-bold border border-slate-800 disabled:opacity-20 text-white transition hover:scale-110 active:scale-95 shadow-xl cursor-pointer flex items-center justify-center"
                          title="Next Page"
                        >
                          <ChevronRight className="w-5 h-5 text-amber-500 hover:text-white" />
                        </button>

                      </div>

                      {/* Active Navigation HUD Ticker underneath */}
                      <div className="h-14 bg-slate-950 border-t border-slate-905 flex items-center px-4 justify-between gap-4 z-20 rounded-b-lg">
                        
                        {/* Range slider bar wrapper */}
                        <div className="hidden sm:flex items-center gap-2.5 w-full max-w-xs">
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">Pg 1</span>
                          <input
                            type="range"
                            min={1}
                            max={book.pageCount}
                            value={currentPage}
                            onChange={(e) => handlePageChange(Number(e.target.value))}
                            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600 focus:outline-none"
                            title="Slide navigation"
                          />
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">Pg {book.pageCount}</span>
                        </div>

                        {/* Direct input and percentage studied HUD ticker */}
                        <div className="flex items-center gap-2 text-slate-300 text-xs w-full sm:w-auto justify-end">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Jump To Page:</span>
                          <input
                            type="number"
                            min={1}
                            max={book.pageCount}
                            value={currentPage}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v)) handlePageChange(v);
                            }}
                            className="w-14 py-0.5 text-center font-bold font-mono rounded bg-slate-900 border border-slate-800 text-xs text-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                          <span className="text-slate-400 font-medium text-[11px] shrink-0">({currentPage} / {book.pageCount})</span>
                        </div>

                      </div>

                    </div>
                  ) : (
                    /* Actual EPUB Reader layout with fallbacks */
                    epubLoading ? (
                      <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-3 min-h-[500px]">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <h4 className="font-bold text-slate-800 text-sm">Decoding and Indexing EPUB...</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Decompressing XHTML assets and mapping manifest spine catalog.
                        </p>
                      </div>
                    ) : epubError ? (
                      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-4 bg-rose-50 border border-rose-100 rounded-lg min-h-[500px]">
                        <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
                        <h4 className="font-bold text-rose-900 text-sm">EPUB Reader Decoding Error</h4>
                        <p className="text-xs text-rose-700 max-w-md leading-relaxed">
                          Your EPUB could not be parsed dynamically. (CORS constraints or archive corruption). Error: {epubError}
                        </p>
                        <div className="flex gap-3">
                          <a
                            href={resolvedFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white rounded-lg shadow transition flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Direct File
                          </a>
                        </div>
                      </div>
                    ) : !isEpubStarted ? (
                      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50 border border-slate-100 rounded-lg min-h-[500px]">
                        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shadow-inner">
                          <BookOpen className="w-8 h-8 text-amber-600 animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h4 className="font-bold text-slate-800 text-sm">Launch High-Fidelity EPUB Reader</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            EPUB structure dynamically resolved with <strong>{epubSpine.length}</strong> readable chapters. Ready for offline rendering.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <button
                            onClick={() => setIsEpubStarted(true)}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white rounded-lg shadow hover:shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 duration-150"
                          >
                            <Play className="w-4 h-4 fill-white text-white" />
                            Open EPUB Reader
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-6 flex-1 flex flex-col justify-between ${getThemeClasses()} transition-colors duration-200 min-h-[500px]`}>
                        <style>{`
                          .epub-chapter-content p {
                            margin-bottom: 1.25rem;
                            line-height: 1.75;
                            text-indent: 1em;
                          }
                          .epub-chapter-content h1, 
                          .epub-chapter-content h2, 
                          .epub-chapter-content h3, 
                          .epub-chapter-content h4 {
                            font-weight: 700;
                            margin-top: 1.75rem;
                            margin-bottom: 0.75rem;
                            letter-spacing: -0.025em;
                            line-height: 1.25;
                          }
                          .epub-chapter-content h1 { font-size: 1.5rem; }
                          .epub-chapter-content h2 { font-size: 1.25rem; }
                          .epub-chapter-content h3 { font-size: 1.125rem; }
                          .epub-chapter-content img {
                            max-width: 100%;
                            height: auto;
                            margin: 1.5rem auto;
                            border-radius: 0.5rem;
                            display: block;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                          }
                          .epub-chapter-content ul, .epub-chapter-content ol {
                            margin-left: 1.5rem;
                            margin-bottom: 1rem;
                            list-style-type: disc;
                          }
                          .epub-chapter-content li {
                            margin-bottom: 0.25rem;
                          }
                        `}</style>
                        <div className="space-y-4 max-w-2xl mx-auto w-full">
                          <div className="border-b border-current/10 pb-2 flex justify-between items-center text-[10px] sm:text-xs opacity-75 font-mono">
                            <span>{book.title}</span>
                            <span className="font-bold text-amber-500 uppercase tracking-wider">
                              Section {currentEpubSpineIndex + 1} / {epubSpine.length}
                            </span>
                          </div>

                          {/* Render HTML Content */}
                          <div 
                            style={{ fontSize: `${fontSize}px` }}
                            dangerouslySetInnerHTML={{ __html: currentEpubHtml || '<p class="text-center opacity-60">Reading content...</p>' }}
                            className="epub-chapter-content select-text leading-relaxed text-justify max-h-[500px] overflow-y-auto px-1 scrollbar-thin"
                          />
                        </div>

                        {/* Interactive Chapter Navigation UI */}
                        <div className="space-y-4 mt-6 border-t border-current/10 pt-4 w-full">
                          {/* Live page slider progress bar */}
                          <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
                            <span className="text-[10px] font-mono opacity-65 shrink-0">Start</span>
                            <input
                              type="range"
                              min={0}
                              max={epubSpine.length - 1}
                              value={currentEpubSpineIndex}
                              onChange={(e) => setCurrentEpubSpineIndex(Number(e.target.value))}
                              className="flex-1 h-1.5 bg-current/10 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
                              title="Slide to turn chapters"
                            />
                            <span className="text-[10px] font-mono opacity-65 shrink-0">End</span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center max-w-2xl mx-auto w-full text-xs font-bold font-sans">
                            <button
                              onClick={() => setCurrentEpubSpineIndex(prev => Math.max(0, prev - 1))}
                              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-current hover:bg-black/5 disabled:opacity-35 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
                              disabled={currentEpubSpineIndex === 0}
                            >
                              <span>← Previous Section</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] opacity-75 shrink-0">GO TO SECTION</span>
                              <input
                                type="number"
                                min={1}
                                max={epubSpine.length}
                                value={currentEpubSpineIndex + 1}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) - 1;
                                  if (!isNaN(v) && v >= 0 && v < epubSpine.length) {
                                    setCurrentEpubSpineIndex(v);
                                  }
                                }}
                                className="w-14 px-1.5 py-1 text-center font-bold font-mono rounded bg-black/5 border border-current/20 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                              <span className="font-mono text-[10px] opacity-75 shrink-0">OF {epubSpine.length} ({Math.round(((currentEpubSpineIndex + 1) / epubSpine.length) * 100)}%)</span>
                            </div>

                            <button
                              onClick={() => setCurrentEpubSpineIndex(prev => Math.min(epubSpine.length - 1, prev + 1))}
                              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-current hover:bg-black/5 disabled:opacity-35 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
                              disabled={currentEpubSpineIndex === epubSpine.length - 1}
                            >
                              <span>Next Section →</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ACTION: STUDY NOTES CONTAINER (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col max-h-[670px]">
                  {(() => {
                    const visibleNotes = (book.notes || []).filter(note => {
                      if (user?.uid) {
                        return note.userId === user.uid;
                      }
                      return !note.userId;
                    });

                    return (
                      <>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span>Study Notes & Annotations</span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px]">
                            {visibleNotes.length}
                          </span>
                        </h3>

                        {/* Add Notebook Form */}
                        <form onSubmit={handleAddNote} className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-150">
                          <input
                            type="text"
                            value={noteChapter}
                            onChange={(e) => setNoteChapter(e.target.value)}
                            placeholder="e.g. Chapter 1, Sec 3.2"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                          />
                          <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Write your research notes, formulas, or key observations here..."
                            rows={3}
                            required
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:outline-none resize-none"
                          />
                          <button
                            type="submit"
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded shadow transition flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                            Save Study Note
                          </button>
                        </form>

                        {/* Scientific annotations history log timeline */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                          {visibleNotes.length > 0 ? (
                            visibleNotes.map((note) => (
                              <div 
                                key={note.id} 
                                className="p-3 bg-amber-50/20 border border-amber-200/30 rounded-lg relative group/note text-xs space-y-1"
                              >
                                <div className="flex gap-2 items-center justify-between text-[9px] text-slate-400 font-mono">
                                  <span className="font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded">
                                    {note.chapter || 'Syllabus Note'}
                                  </span>
                                  <span>{note.timestamp}</span>
                                </div>
                                
                                <p className="text-slate-700 font-sans leading-relaxed select-text">
                                  {note.text}
                                </p>

                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover/note:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition duration-150"
                                  title="Delete this study note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
                              <FileText className="w-8 h-8 text-slate-300 stroke-1" />
                              <p className="font-medium">No notebook annotations saved</p>
                              <p className="text-[10px] text-slate-300 max-w-xs">Write observations as you study equations and code structures.</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Dynamically tracking Reading Bookmarks widget */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
                  {(() => {
                    const visibleBookmarks = (book.bookmarks || []).filter((b) => {
                      if (user) {
                        return b.userId === user.uid;
                      }
                      return !b.userId;
                    });
                    
                    return (
                      <>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 dark:text-amber-400">
                            <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                            Saved Bookmarks
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-1.5 py-0.5 rounded font-mono text-[9px]">
                            {visibleBookmarks.length}
                          </span>
                        </h3>

                        {/* Bookmark current position action */}
                        <button
                          type="button"
                          onClick={handleAddBookmark}
                          className="w-full mb-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-white fill-white/20" />
                          <span>Bookmark Spot: {book.fileType === 'pdf' ? `Page ${currentPage}` : `Section ${currentEpubSpineIndex + 1}`}</span>
                        </button>

                        {/* Bookmarks list render */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[180px]">
                          {visibleBookmarks.length > 0 ? (
                            [...visibleBookmarks].reverse().map((b) => (
                              <div 
                                key={b.id} 
                                className="p-2.5 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-lg relative group/bookmark text-xs cursor-pointer transition flex flex-col justify-between"
                                onClick={() => handleJumpToBookmark(b)}
                              >
                                <div className="flex gap-2 items-center justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 font-sans group-hover/bookmark:text-amber-500 transition flex items-center gap-1">
                                    <Bookmark className="w-3 h-3 text-amber-500" />
                                    {b.label}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono text-right shrink-0">{b.timestamp}</span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid jumping when deleting
                                    handleDeleteBookmark(b.id);
                                  }}
                                  className="absolute top-2 right-2 opacity-0 group-hover/bookmark:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition duration-150 cursor-pointer"
                                  title="Remove bookmark"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
                              <Bookmark className="w-6 h-6 text-slate-300 stroke-1" />
                              <p className="font-semibold dark:text-slate-350">No bookmarks saved yet</p>
                              <p className="text-[9px] text-slate-400 max-w-xs">Save specific sections to resume reading instantly later.</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

              </div>

            </div>
            )
          )}

        </div>
      </div>

    </article>
  );
}
