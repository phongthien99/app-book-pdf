import type { Book } from '../schema/book.schema';

export type SelectBookHandler = (book: Book) => void;
