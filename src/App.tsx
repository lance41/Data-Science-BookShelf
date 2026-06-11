/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Book, BookCategory, CATEGORIES } from './types';
import { SAMPLE_BOOKS } from './data';
import BookShelfRow from './components/BookShelfRow';
import BookCard from './components/BookCard';
import BookDetails from './components/BookDetails';
import BookUpload from './components/BookUpload';
import AdminDashboard from './components/AdminDashboard';
import EditProfileModal from './components/EditProfileModal';
import { useAuth } from './lib/authContext';
import { 
  Search, 
  Plus, 
  Library, 
  Bookmark, 
  BookOpen, 
  CheckCircle, 
  ChevronRight, 
  SlidersHorizontal, 
  BarChart3, 
  BookmarkCheck, 
  Sparkles,
  Info,
  X,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Key,
  ShieldAlert,
  Loader2,
  Users,
  User,
  Globe
} from 'lucide-react';

export default function App() {
  const { user, loading: authLoading, signInWithGoogle, logout, updateProfile } = useAuth();
  const [adminViewActive, setAdminViewActive] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google account picker step states
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [enteredEmail, setEnteredEmail] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const openLoginModal = () => {
    setLoginError(null);
    setLoginStep(1);
    setEnteredEmail('');
    setEnteredPassword('');
    setShowPasswordText(false);
    setShowLoginModal(true);
  };

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // App Global Theme Configuration
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('datascience_nightmode');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('datascience_nightmode', String(isNightMode));
      if (isNightMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  }, [isNightMode]);

  // Filtering & Query States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<BookCategory | 'All'>('All');
  const [activeFormatFilter, setActiveFormatFilter] = useState<'All' | 'pdf' | 'epub'>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // UI Panels Modals toggles
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStatsWidget, setShowStatsWidget] = useState(true);

  // Dynamic ribbon custom categories
  const [showRibbonAddCat, setShowRibbonAddCat] = useState(false);
  const [ribbonNewCatName, setRibbonNewCatName] = useState('');

  // Custom dialog confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    isDestructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Initialize books catalog and categories list from LocalStorage, falling back to defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem('datascience_bookshelf');
      let initialBooks = SAMPLE_BOOKS;
      if (stored) {
        initialBooks = JSON.parse(stored);
      } else {
        localStorage.setItem('datascience_bookshelf', JSON.stringify(SAMPLE_BOOKS));
      }
      setBooks(initialBooks);

      const storedCats = localStorage.getItem('datascience_categories2');
      if (storedCats) {
        const parsed = JSON.parse(storedCats) as string[];
        setCategories([...parsed].sort((a, b) => a.localeCompare(b)));
      } else {
        const sorted = [...CATEGORIES].sort((a, b) => a.localeCompare(b));
        setCategories(sorted);
        localStorage.setItem('datascience_categories2', JSON.stringify(sorted));
      }

      // Live Cloud Firestore catalog synchronization
      const syncCloudCatalog = async () => {
        try {
          const { fetchBooksListFromCloud, isFirebaseConfigured } = await import('./lib/firebase');
          if (isFirebaseConfigured) {
            const cloudBooks = await fetchBooksListFromCloud();
            if (cloudBooks.length > 0) {
              setBooks(prev => {
                const combined = [...prev];
                cloudBooks.forEach(cb => {
                  const idx = combined.findIndex(b => b.id === cb.id);
                  if (idx !== -1) {
                    combined[idx] = cb;
                  } else {
                    combined.unshift(cb);
                  }
                });
                try {
                  localStorage.setItem('datascience_bookshelf', JSON.stringify(combined));
                } catch (_) {}
                return combined;
              });
            }
          }
        } catch (err) {
          console.error('[Library Sync] Cloud matching error:', err);
        }
      };

      syncCloudCatalog();
    } catch (e) {
      console.warn('LocalStorage not available, falling back to memory states.', e);
      setBooks(SAMPLE_BOOKS);
      setCategories([...CATEGORIES].sort((a, b) => a.localeCompare(b)));
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-550 dark:text-slate-400 font-mono tracking-tight animate-pulse">Initializing Bookshelf Catalog Security Gate...</p>
      </div>
    );
  }

  // Persist catalogue state updates
  const saveBooksCatalog = (updatedList: Book[]) => {
    setBooks(updatedList);
    try {
      localStorage.setItem('datascience_bookshelf', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to preserve book updates to local storage', e);
    }
  };

  const saveCategories = (updatedCategories: string[]) => {
    const sorted = [...updatedCategories].sort((a, b) => a.localeCompare(b));
    setCategories(sorted);
    try {
      localStorage.setItem('datascience_categories2', JSON.stringify(sorted));
    } catch (e) {
      console.error('Failed to preserve categories updates to local storage', e);
    }
  };

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...categories, trimmed];
    saveCategories(updated);
  };

  const handleRemoveCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const affectedBooks = books.filter(b => b.category === catName);
    const hasBooks = affectedBooks.length > 0;
    
    let message = `Are you sure you want to remove the "${catName}" category?`;
    if (hasBooks) {
      message = `There are ${affectedBooks.length} book(s) under "${catName}". Removing this category will automatically move those books to "Math for Data Science".`;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Category',
      message: message,
      confirmLabel: 'Remove & Reassign',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        const remainingCats = categories.filter(c => c !== catName);
        saveCategories(remainingCats);
        
        if (hasBooks) {
          const fallbackCategory = remainingCats.find(c => c === 'Math for Data Science') || remainingCats[0] || 'Uncategorized';
          const updatedBooks = books.map(b => b.category === catName ? { ...b, category: fallbackCategory } : b);
          saveBooksCatalog(updatedBooks);
        }
        setConfirmDialog(null);
      }
    });
  };

  // Add new uploaded book metadata and Object URL
  const handleAddBook = (newBook: Book) => {
    const updatedList = [newBook, ...books];
    saveBooksCatalog(updatedList);
    setShowUploadModal(false);
  };

  // Toggle bookmarked favorites status
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering route details modal
    let toggledBook: Book | null = null;
    const updatedList = books.map(book => {
      if (book.id === id) {
        toggledBook = { ...book, isFavorite: !book.isFavorite };
        return toggledBook;
      }
      return book;
    });
    saveBooksCatalog(updatedList);

    // If currently viewing details for this book, sync state choice
    if (selectedBook && selectedBook.id === id && toggledBook) {
      setSelectedBook(toggledBook);
    }

    if (toggledBook) {
      const finalBook = toggledBook;
      import('./lib/firebase').then(({ saveBookMetadata }) => {
        saveBookMetadata(finalBook);
      }).catch(err => {
        console.error('[Favorites Sync] Failed persisting database choice:', err);
      });
    }
  };

  // Update book object state (for notes or progress adjustments)
  const handleUpdateBook = (updatedBook: Book) => {
    const updatedList = books.map(b => b.id === updatedBook.id ? updatedBook : b);
    saveBooksCatalog(updatedList);
    setSelectedBook(updatedBook);

    // Sync state modification to Cloud/Local databases asynchronously
    import('./lib/firebase').then(({ saveBookMetadata }) => {
      saveBookMetadata(updatedBook);
    }).catch(err => {
      console.error('[Update Sync] Failed synchronizing data alterations:', err);
    });
  };

  // Delete a book from local catalog with explicit confirm dialog
  const handleDeleteBook = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const bookToDelete = books.find(b => b.id === id);
    if (!bookToDelete) return;

    // Check administrative permissions strictly before continuing
    if (!user || user.role !== 'admin') {
      setConfirmDialog({
        isOpen: true,
        title: 'Permission Denied',
        message: `Deletion of "${bookToDelete.title}" was rejected. Deleting catalog textbooks is an administrative action. Only approved catalog administrators can perform this.`,
        confirmLabel: 'Dismiss',
        cancelLabel: '',
        isDestructive: false,
        onConfirm: () => {
          setConfirmDialog(null);
        }
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Book',
      message: `Are you sure you want to delete the book "${bookToDelete.title}" from your library? This action is permanent.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep Book',
      isDestructive: true,
      onConfirm: () => {
        const updatedList = books.filter(b => b.id !== id);
        saveBooksCatalog(updatedList);
        
        if (selectedBook && selectedBook.id === id) {
          setSelectedBook(null);
        }

        // Trigger deep filesystem storage/firestore deletions
        import('./lib/firebase').then(({ deleteBookFromStorage }) => {
          deleteBookFromStorage(bookToDelete);
        }).catch(err => {
          console.error('[Delete Cleanup] Error executing backend removals:', err);
        });

        setConfirmDialog(null);
      }
    });
  };

  // Safe catalog resetting to restore default sample set
  const handleResetCatalog = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Default Library',
      message: 'Are you sure you want to restore the default data science textbooks? This will remove custom uploads and reset your custom categories.',
      confirmLabel: 'Restore Defaults',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        saveBooksCatalog(SAMPLE_BOOKS);
        const sortedDefaults = [...CATEGORIES].sort((a, b) => a.localeCompare(b));
        saveCategories(sortedDefaults);
        setSelectedBook(null);
        setConfirmDialog(null);
      }
    });
  };

  // Search indexing match
  const filteredBooks = books.filter(book => {
    // Only include books whose category is currently available
    if (!categories.includes(book.category)) return false;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === '' || 
      book.title.toLowerCase().includes(query) ||
      book.authors.some(auth => auth.toLowerCase().includes(query)) ||
      book.publisher.toLowerCase().includes(query) ||
      book.description.toLowerCase().includes(query) ||
      book.keyTopics.some(topic => topic.toLowerCase().includes(query));

    const matchesCategory = activeCategoryFilter === 'All' || book.category === activeCategoryFilter;
    const matchesFormat = activeFormatFilter === 'All' || book.fileType === activeFormatFilter;
    const matchesFavorite = !showFavoritesOnly || book.isFavorite;

    return matchesSearch && matchesCategory && matchesFormat && matchesFavorite;
  });

  // Calculate live statistics for dashboard chips based ONLY on books in currently active categories
  const booksInCurrentCategories = books.filter(b => categories.includes(b.category));
  const totalBooksCount = booksInCurrentCategories.length;
  const completedCount = booksInCurrentCategories.filter(b => {
    const userProgressVal = (user?.uid && b.userProgress && typeof b.userProgress[user.uid] === 'number')
      ? b.userProgress[user.uid]
      : (b.progress || 0);
    return userProgressVal >= 95;
  }).length;
  const inProgressCount = booksInCurrentCategories.filter(b => {
    const userProgressVal = (user?.uid && b.userProgress && typeof b.userProgress[user.uid] === 'number')
      ? b.userProgress[user.uid]
      : (b.progress || 0);
    return userProgressVal > 0 && userProgressVal < 95;
  }).length;
  const favoritesCount = booksInCurrentCategories.filter(b => b.isFavorite).length;
  const totalPagesSum = booksInCurrentCategories.reduce((sum, b) => sum + (b.pageCount || 0), 0);
  const totalNotesCount = booksInCurrentCategories.reduce((sum, b) => {
    const visibleNotes = (b.notes || []).filter(note => {
      if (user?.uid) {
        return note.userId === user.uid;
      }
      return !note.userId;
    });
    return sum + visibleNotes.length;
  }, 0);

  // Quick categories jumping using smooth scroll
  const handleScrollToSegment = (cat: BookCategory) => {
    setActiveCategoryFilter('All'); // Clear local category constraint to display all shelves
    setTimeout(() => {
      const element = document.getElementById(`category-section-${cat.replace(/\s+/g, '-').toLowerCase()}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-800 flex flex-col font-sans selection:bg-amber-100 antialiased">
      
      {/* Top Main Navigation Header Bar */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-40 navbar shadow-xs px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Brand Layout */}
          <div 
            onClick={() => { setSelectedBook(null); setAdminViewActive(false); }}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold font-sans text-slate-950 tracking-tight leading-none flex items-center gap-1">
                Data Science BookShelf
              </h1>
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">Personal Digital Library</span>
            </div>
          </div>

          {/* Action Tools Shelf */}
          <div className="flex items-center gap-3">
            
            {/* stats trigger button */}
            <button
              onClick={() => setShowStatsWidget(!showStatsWidget)}
              className={`p-2 rounded-lg border transition ${
                showStatsWidget 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle statistics dashboard"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Night mode theme switcher */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className="p-2 rounded-lg border transition bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shrink-0 cursor-pointer shadow-2xs"
              title={isNightMode ? "Switch to light theme" : "Switch to night theme"}
            >
              {isNightMode ? (
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/10 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/10" />
              )}
            </button>

            {/* User Profile / Auth Actions */}
            {!user ? (
              <button
                onClick={openLoginModal}
                className="px-3.5 py-1.8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-amber-500/50 text-xs font-bold rounded-lg transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Admin dashboard toggle */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      setAdminViewActive(!adminViewActive);
                      setSelectedBook(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      adminViewActive
                        ? 'bg-amber-600 hover:bg-amber-705 border-amber-600 text-white shadow-s'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </button>
                )}

                {/* User avatar dropdown/logout */}
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 p-1 rounded-full border border-slate-200 hover:border-amber-550 transition bg-slate-50 cursor-pointer"
                  >
                    <img 
                      src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                      alt={user.displayName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-[10px] font-bold text-slate-700 pr-1 select-none max-w-[80px] truncate hidden md:inline-block">
                      {user.displayName.split(' ')[0]}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <>
                      {/* Click-away backdrop overlay */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setShowUserMenu(false)}
                      />
                      {/* Dropdown element */}
                      <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg border border-slate-200/80 shadow-md py-1 z-50 animate-in fade-in-95 slide-in-from-top-1 duration-100">
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-[11px] font-bold text-slate-905 leading-tight truncate">{user.displayName}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5 leading-none truncate">{user.email}</p>
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-650'
                            }`}>
                              {user.role}
                            </span>
                            {user.libraryAccess && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 font-sans">
                                Access True
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowEditProfileModal(true);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.8 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer border-b border-slate-100/50"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setAdminViewActive(false);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.8 text-xs text-red-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Add Custom Book Button - Admin Only */}
            {user?.role === 'admin' && (
              <button
                id="add-book-trigger"
                onClick={() => setShowUploadModal(true)}
                className="px-3.5 py-1.8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Add Book</span>
              </button>
            )}

            {/* Reset to defaults collection link - Admin Only */}
            {user?.role === 'admin' && (
              <button
                onClick={handleResetCatalog}
                className="text-[10px] underline font-medium font-mono text-slate-400 hover:text-amber-600 transition cursor-pointer"
                title="Reset collection default sample data"
              >
                Reset
              </button>
            )}

          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        
        {adminViewActive && user?.role === 'admin' ? (
          <AdminDashboard 
            booksCount={books.length}
            categoriesCount={categories?.length || 0}
          />
        ) : selectedBook ? (
          <BookDetails 
            book={selectedBook}
            onBack={() => setSelectedBook(null)}
            onUpdateBook={handleUpdateBook}
            onDeleteBook={handleDeleteBook}
          />
        ) : (
          
          /* VIEW 2: PRIMARY BOOKSHELF CATALOG HOME LANDING SCREEN */
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* 1. STATS METRICS SUMMARY COLLAPSIBLE DASHBOARD */}
            {showStatsWidget && (
              <section className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-xs animate-in slide-in-from-top-3 duration-200">
                <div className="p-3 bg-gradient-to-br from-amber-500/5 to-amber-600/5 rounded-lg border border-amber-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider block">Total Catalog Size</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-amber-950">{totalBooksCount}</span>
                    <span className="text-xs text-amber-600/70 font-semibold">Books</span>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-rose-500/5 to-rose-600/5 rounded-lg border border-rose-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-rose-700/80 uppercase tracking-wider block">Favorites Collections</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-rose-950">{favoritesCount}</span>
                    <span className="text-xs text-rose-600/70 font-semibold">Saved</span>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 rounded-lg border border-emerald-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider block">Completed (95%+)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-emerald-950">{completedCount}</span>
                    <span className="text-xs text-emerald-600/70 font-semibold">Read</span>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-lg border border-blue-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block">Active Studying</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-blue-950">{inProgressCount}</span>
                    <span className="text-xs text-blue-600/70 font-semibold">In Progress</span>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-sky-500/5 to-sky-600/5 rounded-lg border border-sky-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-sky-700/80 uppercase tracking-wider block">Total Catalog Pages</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-sky-950">{(totalPagesSum / 1000).toFixed(1)}k</span>
                    <span className="text-xs text-sky-600/70 font-semibold">Pages</span>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-lg border border-purple-100/50 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-purple-700/80 uppercase tracking-wider block">Saved Annotations</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-black text-purple-950">{totalNotesCount}</span>
                    <span className="text-xs text-purple-600/70 font-semibold">Notes</span>
                  </div>
                </div>
              </section>
            )}

            {/* 2. ADVANCED INTERACTIVE SEARCH & CATEGORIES PANEL */}
            <section className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
              
              {/* Query & basic selections */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Text index input */}
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books by title, authors, description keywords, key topics..."
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/75 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg focus:outline-none transition-all duration-150"
                  />
                  {searchQuery && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold select-none cursor-pointer" onClick={() => setSearchQuery('')}>
                      CLEAR
                    </span>
                  )}
                </div>

                {/* File format selector dropdown */}
                <div className="md:col-span-4 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium font-sans shrink-0">Format:</span>
                  <select
                    value={activeFormatFilter}
                    onChange={(e) => setActiveFormatFilter(e.target.value as any)}
                    className="flex-1 text-xs pl-2.5 pr-8 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Formats (PDF/EPUB)</option>
                    <option value="pdf">PDF only</option>
                    <option value="epub">EPUB only</option>
                  </select>
                </div>

                {/* bookmark toggle flag */}
                <div className="md:col-span-3 flex items-center justify-end md:pl-4">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`w-auto px-4 py-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ml-auto ${
                      showFavoritesOnly 
                        ? 'bg-amber-50 text-amber-700 border-amber-300' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current text-current" />
                    <span>My Favorites Only ({favoritesCount})</span>
                  </button>
                </div>

              </div>

              {/* Category Anchor Jumper Buttons (horizontal ribbon) */}
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 animate-pulse">Shelf category anchor jump</span>
                <div className="flex gap-1.5 items-center overflow-x-auto pb-1.5 snap-x classy-scrollbar">
                  <button
                    onClick={() => setActiveCategoryFilter('All')}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition shrink-0 ${
                      activeCategoryFilter === 'All'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="group relative flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 hover:shadow-2xs transition shrink-0"
                    >
                      <button
                        onClick={() => handleScrollToSegment(cat)}
                        className="focus:outline-none cursor-pointer"
                      >
                        {cat}
                      </button>
                      <button
                        onClick={(e) => handleRemoveCategory(cat, e)}
                        title={`Remove "${cat}" category`}
                        className="opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full p-0.5 transition-all ml-1 -mr-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Dynamic in-line ribbon category builder */}
                  {showRibbonAddCat ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = ribbonNewCatName.trim();
                        if (trimmed) {
                          handleAddCategory(trimmed);
                          setRibbonNewCatName('');
                        }
                        setShowRibbonAddCat(false);
                      }}
                      className="flex items-center gap-1 shrink-0 bg-amber-50/50 p-1 rounded-full border border-amber-250 animate-in zoom-in-95"
                    >
                      <input
                        type="text"
                        required
                        autoFocus
                        value={ribbonNewCatName}
                        onChange={(e) => setRibbonNewCatName(e.target.value)}
                        placeholder="New category..."
                        className="px-3 py-0.5 border border-amber-300 focus:outline-none focus:border-amber-500 rounded-full text-xs bg-white text-slate-700 w-28 md:w-32"
                      />
                      <button type="submit" className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-750 text-white rounded-full text-[10px] font-bold transition">
                        Add
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowRibbonAddCat(false);
                          setRibbonNewCatName('');
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-[10px] transition"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowRibbonAddCat(true)}
                      className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full border border-dashed border-amber-300 transition shrink-0"
                    >
                      + Create Category
                    </button>
                  )}
                </div>
              </div>

            </section>

            {/* 3. SHELF CAROUSELS GRID CANVAS */}
            {filteredBooks.length > 0 ? (
              <div className="space-y-2 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                
                {/* If searching or filtering specifically, display on a beautiful dynamic grid instead of rows */}
                {(searchQuery.trim() !== '' || activeFormatFilter !== 'All' || showFavoritesOnly) ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-4.5 h-4.5 text-amber-500" />
                          Filtered Shelf Results
                        </h2>
                        <p className="text-xs text-slate-400">Displaying matching catalogs on a dynamic overview grid.</p>
                      </div>
                      <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded font-mono">
                        {filteredBooks.length} Books Found
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {filteredBooks.map((book) => (
                        <div key={book.id} className="w-full">
                          <BookCard
                            book={book}
                            onClick={() => setSelectedBook(book)}
                            onToggleFavorite={handleToggleFavorite}
                            onDeleteBook={handleDeleteBook}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Bookshop Shelves View, categorized in individual rows */
                  <div className="space-y-2">
                    {categories.map((cat) => {
                      const categoryBooks = books.filter(b => b.category === cat);
                      return (
                        <BookShelfRow
                          key={cat}
                          category={cat}
                          books={categoryBooks}
                          onBookClick={(book) => setSelectedBook(book)}
                          onToggleFavorite={handleToggleFavorite}
                          onDeleteBook={handleDeleteBook}
                        />
                      );
                    })}
                  </div>
                )}

              </div>
            ) : (
              /* EMPTY SEARCH/FILTER FALLBACK BOARD */
              <div className="bg-white py-16 px-6 text-center rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-3">
                <Search className="w-12 h-12 text-slate-300 stroke-1" />
                <h3 className="font-extrabold font-sans text-slate-800 text-sm">No textbooks found matching criteria</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-normal">
                  Try adjusting your keywords, toggling favorites state off, or resetting constraints back to display the full library index.
                </p>
                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategoryFilter('All');
                      setActiveFormatFilter('All');
                      setShowFavoritesOnly(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-150 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Clear Filter Constraints
                  </button>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow"
                  >
                    Upload Custom Book File
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER BAR BRAND */}
      <footer className="border-t border-slate-100 py-6 px-4 bg-white text-xs select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 font-sans">
            <span className="font-extrabold text-slate-700">Data Science BookShelf</span>
            <span>&copy; 2026. All rights preserved.</span>
          </div>

        </div>
      </footer>

      {/* MODAL: ADD CUSTOM BOOK METADATA FORM OVERLAY */}
      {showUploadModal && (
        <BookUpload 
          onAddBook={handleAddBook}
          onClose={() => setShowUploadModal(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
        />
      )}

      {/* MODAL: EDIT USER PROFILE POPUP OVERLAY */}
      {showEditProfileModal && user && (
        <EditProfileModal 
          user={user}
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onUpdateProfile={updateProfile}
        />
      )}

      {/* CUSTOM DIALOG CONFIRMATION OVERLAY */}
      {confirmDialog && confirmDialog.isOpen && (
        <div 
          id="confirm-dialog-overlay"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setConfirmDialog(null)}
        >
          <div 
            id="confirm-dialog-content"
            className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-100 p-6 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-full shrink-0 ${confirmDialog.isDestructive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-650'}`}>
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="confirm-dialog-title" className="text-sm font-extrabold text-slate-950 font-sans">
                  {confirmDialog.title}
                </h3>
                <p id="confirm-dialog-message" className="text-xs text-slate-500 font-sans leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {confirmDialog.cancelLabel && (
                <button
                  id="confirm-dialog-cancel"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-850 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg transition duration-150 cursor-pointer"
                >
                  {confirmDialog.cancelLabel}
                </button>
              )}
              <button
                id="confirm-dialog-confirm"
                onClick={confirmDialog.onConfirm}
                className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition duration-150 cursor-pointer ${
                  confirmDialog.isDestructive 
                    ? 'bg-red-650 hover:bg-red-700' 
                    : 'bg-amber-650 hover:bg-amber-700'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIGN IN OPTIONS DIALOG OVERLAY */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-xl p-6 md:p-8 max-w-[380px] w-full relative animate-in zoom-in-95 duration-200 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* Close button */}
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer text-xs"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Stylized Text Branding Logo */}
            <div className="flex justify-center select-none mt-2 mb-4 text-[22px] font-semibold tracking-[-0.03em]">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </div>

            {loginStep === 1 ? (
              /* ================== STEP 1: EMAIL ENTRY ================== */
              <div className="w-full flex flex-col items-center">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-[20px] font-normal text-[#202124] leading-tight">Sign in</h2>
                  <p className="text-sm text-[#5f6368]">
                    to continue to <span className="font-medium text-[#1a73e8]">Bookshelf Catalog</span>
                  </p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!enteredEmail.trim()) {
                      setLoginError('Enter an email or phone number');
                      return;
                    }
                    if (!enteredEmail.includes('@')) {
                      setLoginError('Enter a valid email address');
                      return;
                    }
                    setLoginError(null);
                    setLoginStep(2);
                  }}
                  className="w-full space-y-4"
                >
                  <div className="relative w-full">
                    <input 
                      type="text"
                      id="identifierId"
                      value={enteredEmail}
                      onChange={(e) => {
                        setEnteredEmail(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      placeholder="Email or phone"
                      className="w-full px-3.5 py-3 border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] placeholder-slate-400 transition"
                      autoFocus
                    />
                  </div>

                  {loginError && (
                    <div className="text-xs text-[#d93025] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* Footers */}
                  <div className="flex justify-end pt-6">
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg transition shadow-2xs hover:shadow-xs cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================== STEP 2: PASSWORD ENTRY ================== */
              <div className="w-full flex flex-col items-center">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-[20px] font-normal text-[#202124] leading-tight">Welcome</h2>
                  {/* Account pill */}
                  <button 
                    onClick={() => {
                      setLoginStep(1);
                      setLoginError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200.5 rounded-full text-xs font-medium text-[#3c4043] hover:bg-slate-50 transition mt-2 cursor-pointer shadow-3xs"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                      {enteredEmail.charAt(0).toUpperCase()}
                    </div>
                    <span>{enteredEmail}</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!enteredPassword) {
                      setLoginError('Enter a password');
                      return;
                    }
                    if (enteredPassword.length < 4) {
                      setLoginError('Password must be at least 4 characters');
                      return;
                    }

                    // Authenticate role based on email input entered:
                    setLoginError(null);
                    const emailNormalized = enteredEmail.trim().toLowerCase();
                    let name = 'Google User';
                    if (emailNormalized === 'adiemus80@gmail.com') {
                      name = 'Owner Administrator';
                    } else if (emailNormalized === 'alice@example.com') {
                      name = 'Alice Scholar';
                    } else {
                      // Derive name from first part of email
                      const part = emailNormalized.split('@')[0];
                      name = part.charAt(0).toUpperCase() + part.slice(1);
                    }

                    try {
                      await signInWithGoogle(emailNormalized, name);
                      setShowLoginModal(false);
                    } catch (err: any) {
                      setLoginError(err?.message || String(err));
                    }
                  }}
                  className="w-full space-y-4"
                >
                  <div className="relative w-full">
                    <input 
                      type={showPasswordText ? "text" : "password"}
                      placeholder="Enter your password"
                      value={enteredPassword}
                      onChange={(e) => {
                        setEnteredPassword(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className="w-full px-3.5 py-3 border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] placeholder-slate-400 transition"
                      autoFocus
                    />
                  </div>

                  {loginError && (
                    <div className="text-xs text-[#d93025] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* Show password checkbox */}
                  <div className="flex items-center gap-2 select-none">
                    <input 
                      type="checkbox"
                      id="showPasswordCheck"
                      checked={showPasswordText}
                      onChange={(e) => setShowPasswordText(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1a73e8] accent-[#1a73e8] cursor-pointer"
                    />
                    <label htmlFor="showPasswordCheck" className="text-xs text-[#3c4043] cursor-pointer font-medium">
                      Show password
                    </label>
                  </div>

                  {/* Footers */}
                  <div className="flex items-center justify-between pt-8">
                    <button 
                      type="button"
                      onClick={() => {
                        setLoginStep(1);
                        setLoginError(null);
                      }}
                      className="text-xs font-semibold text-[#1a73e8] hover:bg-[#1a73e8]/5 px-2 py-1.5 rounded transition"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg transition shadow-2xs hover:shadow-xs cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            <p className="text-[10px] text-[#5f6368] leading-normal text-center mt-6 px-1">
              To keep your secure records structured on Google servers, sign in. Simulated sandbox profiles match target levels.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
