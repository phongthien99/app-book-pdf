import type { AutoSavedNoteSeed, NoteDraftSeed } from '../hooks/hooks.types';
import type { PdfNote, PdfNoteMode } from '../schema/pdf-note.schema';

export type FacadeStatus = 'idle' | 'success' | 'error';

export interface PdfNotesFacade {
  notes: PdfNote[];
  loading: boolean;
  error: string | null;
  noteMode: PdfNoteMode;
  noteDraft: string;
  cueDraft: string;
  cornellNotesDraft: string;
  summaryDraft: string;
  activeNotePage: number;
  hasActiveDraft: boolean;
  editingNoteId: string | null;
  editNoteMode: PdfNoteMode;
  editNoteDraft: string;
  editCueDraft: string;
  editCornellNotesDraft: string;
  editSummaryDraft: string;
  hasEditDraft: boolean;
  copyStatus: FacadeStatus;
  copyMessage: string;
  importExportStatus: FacadeStatus;
  importExportMessage: string;
  setNoteMode: (mode: PdfNoteMode) => void;
  setNoteDraft: (value: string) => void;
  setCueDraft: (value: string) => void;
  setCornellNotesDraft: (value: string) => void;
  setSummaryDraft: (value: string) => void;
  setEditNoteDraft: (value: string) => void;
  setEditCueDraft: (value: string) => void;
  setEditCornellNotesDraft: (value: string) => void;
  setEditSummaryDraft: (value: string) => void;
  seedDraft: (seed: NoteDraftSeed) => void;
  addNote: () => void;
  startEditingNote: (note: PdfNote) => void;
  cancelEditingNote: () => void;
  saveEditingNote: () => void;
  deleteNote: (noteId: string) => void;
  copyNoteMarkdown: (note: PdfNote) => void;
  copyAllNotesMarkdown: () => void;
  copyDraftMarkdown: () => void;
  exportNotesJson: () => void;
  importNotesJson: (file: File) => void;
  getNoteMode: (note: PdfNote) => PdfNoteMode;
  selectNotePage: (pageNumber: number) => void;
}

export interface UsePdfNotesFacadeParams {
  pdfUrl: string | null;
  title?: string;
  currentPage: number;
  draftSeed: NoteDraftSeed | null;
  autoSavedNoteSeed?: AutoSavedNoteSeed | null;
  onSelectPage: (pageNumber: number) => void;
}
