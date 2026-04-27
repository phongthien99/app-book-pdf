import type { Book, CreateBookConfigInput } from '../schema/book.schema';

export type OpenPdfTab = 'url' | 'file' | 'config' | 'json';

export interface BooksFacade {
  books: Book[];
  loading: boolean;
  error: string | null;
  isMobile: boolean;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  dialogTab: OpenPdfTab;
  setDialogTab: (tab: OpenPdfTab) => void;
  url: string;
  setUrl: (url: string) => void;
  clearUrl: () => void;
  file: File | null;
  setFile: (file: File | null) => void;
  jsonFile: File | null;
  setJsonFile: (file: File | null) => void;
  jsonText: string;
  setJsonText: (jsonText: string) => void;
  config: CreateBookConfigInput;
  setConfigField: (field: keyof CreateBookConfigInput, value: string) => void;
  submitUrl: () => void;
  submitFile: () => void;
  submitConfig: () => void;
  submitJson: () => void;
  deleteBook: (bookId: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  deleting: boolean;
  dialogError: string | null;
}
