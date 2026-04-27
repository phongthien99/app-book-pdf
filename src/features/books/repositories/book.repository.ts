import {
  BooksSchema,
  type Book,
  type CreateBookConfigInput,
  type CreateBookFromFileInput,
  type CreateBookFromUrlInput,
} from '../schema/book.schema';

const LOCAL_STORAGE_KEY = 'react-mui.books';

function titleFromPdfUrl(pdfUrl: string) {
  const fallbackTitle = 'PDF';
  const lastSegment = pdfUrl.split('/').pop() ?? fallbackTitle;

  return decodeURIComponent(lastSegment).replace(/\.pdf$/i, '') || fallbackTitle;
}

function readStoredBooks(): Book[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = BooksSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeStoredBooks(books: Book[]) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(books));
}

export const bookRepository = {
  async getAll(): Promise<Book[]> {
    return Promise.resolve(readStoredBooks());
  },

  async createFromUrl({ pdfUrl }: CreateBookFromUrlInput): Promise<Book> {
    return Promise.resolve({
      id: `url-${Date.now()}`,
      title: titleFromPdfUrl(pdfUrl),
      author: '',
      description: '',
      coverUrl: '',
      pdfUrl,
    });
  },

  async createFromFile({ file }: CreateBookFromFileInput): Promise<Book> {
    return Promise.resolve({
      id: `file-${Date.now()}`,
      title: file.name.replace(/\.pdf$/i, ''),
      author: '',
      description: '',
      coverUrl: '',
      pdfUrl: URL.createObjectURL(file),
    });
  },

  async createConfig(input: CreateBookConfigInput): Promise<Book> {
    const book: Book = {
      id: `local-${Date.now()}`,
      ...input,
    };
    const storedBooks = readStoredBooks();

    writeStoredBooks([...storedBooks, book]);

    return Promise.resolve(book);
  },

  async createConfigs(inputs: CreateBookConfigInput[]): Promise<Book[]> {
    const createdAt = Date.now();
    const books = inputs.map((input, index) => ({
      id: `local-${createdAt}-${index}`,
      ...input,
    }));
    const storedBooks = readStoredBooks();

    writeStoredBooks([...storedBooks, ...books]);

    return Promise.resolve(books);
  },

  async delete(bookId: string): Promise<void> {
    writeStoredBooks(readStoredBooks().filter((book) => book.id !== bookId));

    return Promise.resolve();
  },
};
