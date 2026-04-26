import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

import App from './application';
import { BookList } from './features/books/components/BookList';
import { useBooksQuery } from './features/books/hooks/useBooksQuery';
import type { Book } from './features/books/schema/book.schema';
import { createBookSlug } from './features/books/utils/book-slug';

const BOOK_PATH_PREFIX = '/books/';

function getLibraryUrl() {
  return `/${window.location.search}`;
}

function getBookUrl(book: Book) {
  return `${BOOK_PATH_PREFIX}${createBookSlug(book.title)}${window.location.search}`;
}

function isBookUrl() {
  return window.location.pathname.startsWith(BOOK_PATH_PREFIX);
}

function getBookSlugFromPath() {
  if (!isBookUrl()) return null;

  const slug = window.location.pathname.slice(BOOK_PATH_PREFIX.length).split('/')[0];

  return slug ? decodeURIComponent(slug) : null;
}

function findBookByPathSlug(books: Book[]) {
  const slug = getBookSlugFromPath();
  if (!slug) return null;

  return books.find((book) => createBookSlug(book.title) === slug) ?? null;
}

export function AppShell() {
  const { data: books = [], isLoading } = useBooksQuery();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isBookUrl() && event.state?.selectedBook) {
        setSelectedBook(event.state.selectedBook as Book);
        return;
      }

      setSelectedBook(findBookByPathSlug(books));
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [books]);

  useEffect(() => {
    if (selectedBook || !isBookUrl()) return;

    setSelectedBook(findBookByPathSlug(books));
  }, [books, selectedBook]);

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
    window.history.pushState({ selectedBook: book }, '', getBookUrl(book));
  }, []);

  const handleBack = useCallback(() => {
    setSelectedBook(null);
    window.history.replaceState(null, '', getLibraryUrl());
  }, []);

  if (selectedBook) {
    return (
      <Box sx={{ height: '100vh' }}>
        <App
          pdfUrl={selectedBook.pdfUrl}
          title={selectedBook.title}
          onBack={handleBack}
        />
      </Box>
    );
  }

  if (isLoading && isBookUrl()) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh' }}>
      <BookList onSelectBook={handleSelectBook} />
    </Box>
  );
}
