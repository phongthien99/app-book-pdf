import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCopyPdfNoteMarkdownMutation } from '../hooks/useCopyPdfNoteMarkdownMutation';
import { useCopyPdfNotesMarkdownMutation } from '../hooks/useCopyPdfNotesMarkdownMutation';
import { useCreatePdfNoteMutation } from '../hooks/useCreatePdfNoteMutation';
import { useDeletePdfNoteMutation } from '../hooks/useDeletePdfNoteMutation';
import { useExportPdfNotesJsonMutation } from '../hooks/useExportPdfNotesJsonMutation';
import { useImportPdfNotesMutation } from '../hooks/useImportPdfNotesMutation';
import { usePdfNotesQuery } from '../hooks/usePdfNotesQuery';
import { useUpdatePdfNoteMutation } from '../hooks/useUpdatePdfNoteMutation';
import type { CreatePdfNoteInput, PdfNote, PdfNoteMode } from '../schema/pdf-note.schema';
import type { PdfNotesFacade, UsePdfNotesFacadeParams } from './pdf-note.facade.types';

function getNoteMode(note: PdfNote): PdfNoteMode {
  return note.mode === 'cornell' ? 'cornell' : 'plain';
}

export function usePdfNotesFacade({
  pdfUrl,
  title,
  currentPage,
  draftSeed,
  autoSavedNoteSeed,
  onSelectPage,
}: UsePdfNotesFacadeParams): PdfNotesFacade {
  const { data: notes = [], isLoading: loading, error } = usePdfNotesQuery(pdfUrl);
  const createNote = useCreatePdfNoteMutation(pdfUrl);
  const updateNote = useUpdatePdfNoteMutation(pdfUrl);
  const deleteNoteMutation = useDeletePdfNoteMutation(pdfUrl);
  const importNotes = useImportPdfNotesMutation(pdfUrl);
  const copyNote = useCopyPdfNoteMarkdownMutation();
  const copyNotes = useCopyPdfNotesMarkdownMutation();
  const exportNotes = useExportPdfNotesJsonMutation();
  const [noteMode, setNoteMode] = useState<PdfNoteMode>('plain');
  const [noteDraft, setNoteDraft] = useState('');
  const [cueDraft, setCueDraft] = useState('');
  const [cornellNotesDraft, setCornellNotesDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [notePageNumber, setNotePageNumber] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteMode, setEditNoteMode] = useState<PdfNoteMode>('plain');
  const [editNoteDraft, setEditNoteDraft] = useState('');
  const [editCueDraft, setEditCueDraft] = useState('');
  const [editCornellNotesDraft, setEditCornellNotesDraft] = useState('');
  const [editSummaryDraft, setEditSummaryDraft] = useState('');
  const [editPageNumber, setEditPageNumber] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState('');
  const [importExportStatus, setImportExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importExportMessage, setImportExportMessage] = useState('');
  const handledSeedIdRef = useRef<number | null>(null);
  const handledAutoSaveSeedIdRef = useRef<number | null>(null);

  const pdfTitle = title ?? 'PDF';
  const activeNotePage = notePageNumber ?? currentPage;
  const hasPlainDraft = noteDraft.trim().length > 0;
  const hasCornellDraft =
    cueDraft.trim().length > 0 || cornellNotesDraft.trim().length > 0 || summaryDraft.trim().length > 0;
  const hasActiveDraft = noteMode === 'cornell' ? hasCornellDraft : hasPlainDraft;
  const hasPlainEditDraft = editNoteDraft.trim().length > 0;
  const hasCornellEditDraft =
    editCueDraft.trim().length > 0 ||
    editCornellNotesDraft.trim().length > 0 ||
    editSummaryDraft.trim().length > 0;
  const hasEditDraft = editNoteMode === 'cornell' ? hasCornellEditDraft : hasPlainEditDraft;

  const resetDraft = useCallback(() => {
    setNoteDraft('');
    setCueDraft('');
    setCornellNotesDraft('');
    setSummaryDraft('');
    setNotePageNumber(null);
  }, []);

  const resetEditDraft = useCallback(() => {
    setEditingNoteId(null);
    setEditNoteMode('plain');
    setEditNoteDraft('');
    setEditCueDraft('');
    setEditCornellNotesDraft('');
    setEditSummaryDraft('');
    setEditPageNumber(null);
  }, []);

  const createDraftInput = useCallback((): CreatePdfNoteInput | null => {
    if (!hasActiveDraft) return null;

    return noteMode === 'cornell'
      ? {
          pageNumber: activeNotePage,
          mode: noteMode,
          cue: cueDraft,
          notes: cornellNotesDraft,
          summary: summaryDraft,
        }
      : {
          pageNumber: activeNotePage,
          mode: noteMode,
          text: noteDraft,
        };
  }, [activeNotePage, cornellNotesDraft, cueDraft, hasActiveDraft, noteDraft, noteMode, summaryDraft]);

  const createDraftNote = useCallback((): PdfNote | null => {
    const input = createDraftInput();
    if (!input) return null;

    return input.mode === 'cornell'
      ? {
          id: 'draft',
          pageNumber: input.pageNumber,
          mode: input.mode,
          cue: input.cue?.trim() ?? '',
          notes: input.notes?.trim() ?? '',
          summary: input.summary?.trim() ?? '',
          createdAt: new Date().toISOString(),
        }
      : {
          id: 'draft',
          pageNumber: input.pageNumber,
          mode: input.mode,
          text: input.text?.trim() ?? '',
          createdAt: new Date().toISOString(),
        };
  }, [createDraftInput]);

  const seedDraft = useCallback(
    (seed: { pageNumber: number; selectedText: string }) => {
      setNotePageNumber(seed.pageNumber);
      if (noteMode === 'cornell') {
        setCornellNotesDraft(seed.selectedText);
      } else {
        setNoteDraft(seed.selectedText);
      }
    },
    [noteMode],
  );

  useEffect(() => {
    if (!draftSeed || handledSeedIdRef.current === draftSeed.requestId) return;

    handledSeedIdRef.current = draftSeed.requestId;
    seedDraft(draftSeed);
  }, [draftSeed, seedDraft]);

  useEffect(() => {
    if (!autoSavedNoteSeed || handledAutoSaveSeedIdRef.current === autoSavedNoteSeed.requestId) return;

    handledAutoSaveSeedIdRef.current = autoSavedNoteSeed.requestId;
    createNote.mutate(
      {
        pageNumber: autoSavedNoteSeed.pageNumber,
        mode: 'plain',
        text: autoSavedNoteSeed.text,
      },
      {
        onSuccess: () => {
          setImportExportStatus('success');
          setImportExportMessage(autoSavedNoteSeed.successMessage ?? 'Đã lưu ghi chú.');
        },
        onError: () => {
          setImportExportStatus('error');
          setImportExportMessage('Không thể lưu ghi chú.');
        },
      },
    );
  }, [autoSavedNoteSeed, createNote]);

  const addNote = useCallback(() => {
    const input = createDraftInput();
    if (!input) return;

    createNote.mutate(input, {
      onSuccess: resetDraft,
    });
  }, [createDraftInput, createNote, resetDraft]);

  const startEditingNote = useCallback((note: PdfNote) => {
    const mode = getNoteMode(note);

    setEditingNoteId(note.id);
    setEditNoteMode(mode);
    setEditPageNumber(note.pageNumber);
    setEditNoteDraft(mode === 'plain' ? note.text ?? note.notes ?? '' : '');
    setEditCueDraft(mode === 'cornell' ? note.cue ?? '' : '');
    setEditCornellNotesDraft(mode === 'cornell' ? note.notes ?? note.text ?? '' : '');
    setEditSummaryDraft(mode === 'cornell' ? note.summary ?? '' : '');
  }, []);

  const saveEditingNote = useCallback(() => {
    if (!editingNoteId || !hasEditDraft || !editPageNumber) return;

    updateNote.mutate(
      {
        noteId: editingNoteId,
        input:
          editNoteMode === 'cornell'
            ? {
                pageNumber: editPageNumber,
                mode: editNoteMode,
                cue: editCueDraft,
                notes: editCornellNotesDraft,
                summary: editSummaryDraft,
              }
            : {
                pageNumber: editPageNumber,
                mode: editNoteMode,
                text: editNoteDraft,
              },
      },
      {
        onSuccess: resetEditDraft,
      },
    );
  }, [
    editCornellNotesDraft,
    editCueDraft,
    editNoteDraft,
    editNoteMode,
    editPageNumber,
    editSummaryDraft,
    editingNoteId,
    hasEditDraft,
    resetEditDraft,
    updateNote,
  ]);

  const deleteNote = useCallback(
    (noteId: string) => {
      deleteNoteMutation.mutate(noteId);
    },
    [deleteNoteMutation],
  );

  const copyNoteMarkdown = useCallback(
    (note: PdfNote) => {
      copyNote.mutate(
        { note, pdfTitle, pdfUrl },
        {
          onSuccess: () => {
          setCopyStatus('success');
          setCopyMessage(`Đã copy ghi chú trang ${note.pageNumber} dạng Markdown.`);
          },
          onError: () => {
            setCopyStatus('error');
            setCopyMessage('Không thể copy ghi chú. Hãy kiểm tra quyền clipboard của trình duyệt.');
          },
        },
      );
    },
    [copyNote, pdfTitle, pdfUrl],
  );

  const copyAllNotesMarkdown = useCallback(() => {
    copyNotes.mutate(
      { notes, pdfTitle, pdfUrl },
      {
        onSuccess: () => {
        setCopyStatus('success');
        setCopyMessage('Đã copy tất cả ghi chú dạng Markdown.');
        },
        onError: () => {
          setCopyStatus('error');
          setCopyMessage('Không thể copy ghi chú. Hãy kiểm tra quyền clipboard của trình duyệt.');
        },
      },
    );
  }, [copyNotes, notes, pdfTitle, pdfUrl]);

  const copyDraftMarkdown = useCallback(() => {
    const note = createDraftNote();
    if (!note) return;

    copyNoteMarkdown(note);
  }, [copyNoteMarkdown, createDraftNote]);

  const exportNotesJson = useCallback(() => {
    if (!notes.length) return;

    exportNotes.mutate(
      { notes, pdfTitle, pdfUrl },
      {
        onSuccess: () => {
          setImportExportStatus('success');
          setImportExportMessage('Đã export ghi chú dạng JSON.');
        },
        onError: () => {
          setImportExportStatus('error');
          setImportExportMessage('Không thể export ghi chú.');
        },
      },
    );
  }, [exportNotes, notes, pdfTitle, pdfUrl]);

  const importNotesJson = useCallback(
    (file: File) => {
      importNotes.mutate(file, {
        onSuccess: (importedNotes) => {
          setImportExportStatus('success');
          setImportExportMessage(`Đã import ${importedNotes.length} ghi chú.`);
        },
        onError: (importError) => {
          setImportExportStatus('error');
          setImportExportMessage(importError.message || 'Không thể import ghi chú.');
        },
      });
    },
    [importNotes],
  );

  const selectNotePage = useCallback(
    (pageNumber: number) => {
      onSelectPage(pageNumber);
    },
    [onSelectPage],
  );

  return useMemo(
    () => ({
      notes,
      loading,
      error: error?.message ?? null,
      noteMode,
      noteDraft,
      cueDraft,
      cornellNotesDraft,
      summaryDraft,
      activeNotePage,
      hasActiveDraft,
      editingNoteId,
      editNoteMode,
      editNoteDraft,
      editCueDraft,
      editCornellNotesDraft,
      editSummaryDraft,
      hasEditDraft,
      copyStatus,
      copyMessage,
      importExportStatus,
      importExportMessage,
      setNoteMode,
      setNoteDraft,
      setCueDraft,
      setCornellNotesDraft,
      setSummaryDraft,
      setEditNoteDraft,
      setEditCueDraft,
      setEditCornellNotesDraft,
      setEditSummaryDraft,
      seedDraft,
      addNote,
      startEditingNote,
      cancelEditingNote: resetEditDraft,
      saveEditingNote,
      deleteNote,
      copyNoteMarkdown,
      copyAllNotesMarkdown,
      copyDraftMarkdown,
      exportNotesJson,
      importNotesJson,
      getNoteMode,
      selectNotePage,
    }),
    [
      activeNotePage,
      addNote,
      copyAllNotesMarkdown,
      copyDraftMarkdown,
      copyMessage,
      copyNoteMarkdown,
      copyStatus,
      cornellNotesDraft,
      cueDraft,
      deleteNote,
      editCornellNotesDraft,
      editCueDraft,
      editingNoteId,
      editNoteDraft,
      editNoteMode,
      editSummaryDraft,
      error?.message,
      exportNotesJson,
      hasActiveDraft,
      hasEditDraft,
      importExportMessage,
      importExportStatus,
      importNotesJson,
      loading,
      noteDraft,
      noteMode,
      notes,
      seedDraft,
      selectNotePage,
      saveEditingNote,
      resetEditDraft,
      startEditingNote,
      summaryDraft,
    ],
  );
}
