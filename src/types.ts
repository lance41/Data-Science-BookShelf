/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Book {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  year: number;
  category: BookCategory;
  coverImage: string; // fallback Unsplash photo or custom gradient info
  coverColor?: string; // Hex or CSS gradient for the custom bookshelf generator
  fileUrl: string;
  fileType: 'pdf' | 'epub';
  description: string;
  summary: {
    overview: string;
    targetAudience: string;
    entryPrerequisites: string;
    learningPath: string[];
  };
  keyTopics: string[];
  pageCount: number;
  isFavorite?: boolean;
  progress?: number; // Reading progress 0 to 100
  notes?: BookNote[];
  bookmarks?: BookBookmark[];
  coverImageUrl?: string;
  createdAt?: string;
  userProgress?: { [userId: string]: number };
  userPages?: { [userId: string]: number };
}

export interface BookBookmark {
  id: string;
  userId?: string;     // User who created the bookmark
  page?: number;        // For PDF
  spineIndex?: number;  // For EPUB
  spineTitle?: string;  // Section/chapter title
  timestamp: string;
  label: string;       // "Page 5" or "Section 3"
}

export interface BookNote {
  id: string;
  timestamp: string;
  chapter?: string;
  text: string;
  userId?: string;
}

export type BookCategory = string;

export const CATEGORIES: BookCategory[] = [
  'AI Automation',
  'AI Engineering',
  'Business Analytics',
  'Computer Vision',
  'Data Engineering',
  'Data Visualization',
  'Machine Learning and Deep Learning',
  'Math for Data Science',
  'Programming Languages',
  'Project Management',
  'SQL',
];
