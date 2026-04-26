import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import { usePdfNotesFacade } from '../facade/pdf-note.facade';
import type { PdfNotesFacade } from '../facade/pdf-note.facade.types';
import type { AutoSavedNoteSeed, NoteDraftSeed } from '../hooks/hooks.types';
import type { PdfNote, PdfNoteMode } from '../schema/pdf-note.schema';

const NOTES_DEFAULT_WIDTH = 320;
const NOTES_MIN_WIDTH = 280;
const NOTES_MAX_WIDTH = 720;
const NOTES_WIDTH_STORAGE_KEY = 'react-mui.pdf-notes.width';
const NOTE_TEXT_MAX_HEIGHT = 180;

const noteTextScrollSx = {
  maxHeight: NOTE_TEXT_MAX_HEIGHT,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
  pr: 0.5,
  overflowWrap: 'anywhere',
} as const;

function clampNotesWidth(width: number) {
  const viewportMaxWidth = typeof window === 'undefined' ? NOTES_MAX_WIDTH : window.innerWidth - 96;

  return Math.min(Math.max(width, NOTES_MIN_WIDTH), Math.max(NOTES_MIN_WIDTH, Math.min(NOTES_MAX_WIDTH, viewportMaxWidth)));
}

function readStoredNotesWidth() {
  if (typeof window === 'undefined') return NOTES_DEFAULT_WIDTH;

  const storedValue = Number(window.localStorage.getItem(NOTES_WIDTH_STORAGE_KEY));

  return Number.isFinite(storedValue) ? clampNotesWidth(storedValue) : NOTES_DEFAULT_WIDTH;
}

interface PdfNotesDrawerProps {
  open: boolean;
  pdfUrl: string | null;
  title?: string;
  currentPage: number;
  draftSeed: NoteDraftSeed | null;
  autoSavedNoteSeed?: AutoSavedNoteSeed | null;
  onSelectPage: (pageNumber: number) => void;
}

function CornellNoteContent({ note, expanded = false }: { note: PdfNote; expanded?: boolean }) {
  const textSx = expanded ? { ...noteTextScrollSx, maxHeight: '60vh' } : noteTextScrollSx;

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {note.cue && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Cue / Question
          </Typography>
          <Typography variant="body2" sx={textSx}>
            {note.cue}
          </Typography>
        </Box>
      )}
      {note.notes && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Notes
          </Typography>
          <Typography variant="body2" sx={textSx}>
            {note.notes}
          </Typography>
        </Box>
      )}
      {note.summary && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Summary
          </Typography>
          <Typography variant="body2" sx={textSx}>
            {note.summary}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function MarkdownNoteContent({ text, expanded = false }: { text: string; expanded?: boolean }) {
  const normalizedText = text.replace(/<br\s*\/?>/gi, ' ');

  return (
    <Box sx={expanded ? { ...noteTextScrollSx, maxHeight: '60vh' } : noteTextScrollSx}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <Typography variant="body2" component="p" sx={{ m: 0, '& + &': { mt: 1 } }}>
              {children}
            </Typography>
          ),
          strong: ({ children }) => (
            <Box component="strong" sx={{ fontWeight: 700 }}>
              {children}
            </Box>
          ),
          table: ({ children }) => (
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                tableLayout: 'fixed',
              }}
            >
              {children}
            </Box>
          ),
          th: ({ children }) => (
            <Box
              component="th"
              sx={{
                bgcolor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider',
                fontSize: '0.75rem',
                fontWeight: 700,
                lineHeight: 1.4,
                px: 1,
                py: 0.75,
                textAlign: 'left',
              }}
            >
              {children}
            </Box>
          ),
          td: ({ children }) => (
            <Box
              component="td"
              sx={{
                borderTop: '1px solid',
                borderLeft: '1px solid',
                borderColor: 'divider',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                overflowWrap: 'anywhere',
                px: 1,
                py: 0.75,
                verticalAlign: 'top',
                '&:first-of-type': { borderLeft: 0 },
              }}
            >
              {children}
            </Box>
          ),
        }}
      >
        {normalizedText}
      </ReactMarkdown>
    </Box>
  );
}

function NoteEditForm({ facade, mode }: { facade: PdfNotesFacade; mode: PdfNoteMode }) {
  return mode === 'cornell' ? (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <TextField
        multiline
        minRows={2}
        size="small"
        label="Cue / Câu hỏi"
        value={facade.editCueDraft}
        onChange={(event) => facade.setEditCueDraft(event.target.value)}
      />
      <TextField
        multiline
        minRows={3}
        size="small"
        label="Notes"
        value={facade.editCornellNotesDraft}
        onChange={(event) => facade.setEditCornellNotesDraft(event.target.value)}
      />
      <TextField
        multiline
        minRows={2}
        size="small"
        label="Summary"
        value={facade.editSummaryDraft}
        onChange={(event) => facade.setEditSummaryDraft(event.target.value)}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Button size="small" variant="contained" disabled={!facade.hasEditDraft} onClick={facade.saveEditingNote}>
          Lưu sửa
        </Button>
        <Button size="small" variant="outlined" onClick={facade.cancelEditingNote}>
          Huỷ
        </Button>
      </Box>
    </Box>
  ) : (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <TextField
        multiline
        minRows={4}
        size="small"
        hiddenLabel
        value={facade.editNoteDraft}
        onChange={(event) => facade.setEditNoteDraft(event.target.value)}
        sx={{
          '& .MuiInputBase-root': {
            alignItems: 'flex-start',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            p: 1,
          },
          '& textarea': {
            overflowWrap: 'anywhere',
          },
        }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Button size="small" variant="contained" disabled={!facade.hasEditDraft} onClick={facade.saveEditingNote}>
          Lưu sửa
        </Button>
        <Button size="small" variant="outlined" onClick={facade.cancelEditingNote}>
          Huỷ
        </Button>
      </Box>
    </Box>
  );
}

export function PdfNotesDrawer({
  open,
  pdfUrl,
  title,
  currentPage,
  draftSeed,
  autoSavedNoteSeed,
  onSelectPage,
}: PdfNotesDrawerProps) {
  const facade = usePdfNotesFacade({
    pdfUrl,
    title,
    currentPage,
    draftSeed,
    autoSavedNoteSeed,
    onSelectPage,
  });
  const notesImportInputRef = useRef<HTMLInputElement>(null);
  const [drawerWidth, setDrawerWidth] = useState(readStoredNotesWidth);
  const [resizing, setResizing] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const expandedNote = facade.notes.find((note) => note.id === expandedNoteId) ?? null;

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      setDrawerWidth(clampNotesWidth(window.innerWidth - event.clientX));
    };

    const finishResize = () => {
      setResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
    };
  }, [resizing]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_WIDTH_STORAGE_KEY, String(drawerWidth));
    } catch {
      // Ignore storage failures; resizing should still work for the active session.
    }
  }, [drawerWidth]);

  useEffect(() => {
    if (expandedNoteId && !expandedNote) {
      setExpandedNoteId(null);
    }
  }, [expandedNote, expandedNoteId]);

  const closeExpandedNote = useCallback(() => {
    setExpandedNoteId(null);
  }, []);

  const startEditingExpandedNote = useCallback(() => {
    if (!expandedNote) return;

    facade.startEditingNote(expandedNote);
    closeExpandedNote();
  }, [closeExpandedNote, expandedNote, facade]);

  const deleteExpandedNote = useCallback(() => {
    if (!expandedNote) return;

    facade.deleteNote(expandedNote.id);
    closeExpandedNote();
  }, [closeExpandedNote, expandedNote, facade]);

  return (
    <>
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        transition: resizing ? 'none' : 'width 0.2s',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          position: 'relative',
          height: '100%',
          overflow: 'hidden',
          borderLeft: '1px solid',
          borderColor: 'divider',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để đổi độ rộng ghi chú"
          onPointerDown={startResize}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: -4,
            width: 8,
            zIndex: 2,
            cursor: 'col-resize',
            touchAction: 'none',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: 2,
              transform: 'translateX(-50%)',
              bgcolor: resizing ? 'primary.main' : 'transparent',
            },
            '&:hover::after': {
              bgcolor: 'primary.main',
            },
          }}
        />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Ghi chú PDF
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Trang ghi chú: {facade.activeNotePage}
          </Typography>
        </Box>
        <Divider />

        <Box sx={{ p: 2, display: 'grid', gap: 1.25 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={facade.noteMode}
            onChange={(_, value: PdfNoteMode | null) => value && facade.setNoteMode(value)}
            aria-label="Kiểu ghi chú"
          >
            <ToggleButton value="plain">Thường</ToggleButton>
            <ToggleButton value="cornell">Cornell</ToggleButton>
          </ToggleButtonGroup>

          {facade.noteMode === 'cornell' ? (
            <>
              <TextField
                multiline
                minRows={2}
                size="small"
                label="Cue / Câu hỏi"
                placeholder="Từ khoá, câu hỏi, ý chính..."
                value={facade.cueDraft}
                onChange={(event) => facade.setCueDraft(event.target.value)}
              />
              <TextField
                multiline
                minRows={3}
                size="small"
                label="Notes"
                placeholder="Ghi chú chi tiết..."
                value={facade.cornellNotesDraft}
                onChange={(event) => facade.setCornellNotesDraft(event.target.value)}
              />
              <TextField
                multiline
                minRows={2}
                size="small"
                label="Summary"
                placeholder="Tóm tắt ngắn sau khi đọc..."
                value={facade.summaryDraft}
                onChange={(event) => facade.setSummaryDraft(event.target.value)}
              />
            </>
          ) : (
            <TextField
              multiline
              minRows={3}
              size="small"
              label="Thêm ghi chú"
              placeholder="Nhập suy nghĩ, ý chính, việc cần nhớ..."
              value={facade.noteDraft}
              onChange={(event) => facade.setNoteDraft(event.target.value)}
            />
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Button variant="contained" size="small" disabled={!facade.hasActiveDraft} onClick={facade.addNote}>
              Lưu trang {facade.activeNotePage}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              disabled={!facade.hasActiveDraft}
              onClick={facade.copyDraftMarkdown}
            >
              Copy MD
            </Button>
          </Box>
        </Box>

        <Divider />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1.5 }}>
          <Box sx={{ display: 'grid', gap: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ flexGrow: 1 }}>
                Highlights & Notes
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                disabled={facade.notes.length === 0}
                onClick={facade.copyAllNotesMarkdown}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Copy MD
              </Button>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon fontSize="small" />}
                disabled={facade.notes.length === 0}
                onClick={facade.exportNotesJson}
              >
                Export
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileUploadIcon fontSize="small" />}
                onClick={() => notesImportInputRef.current?.click()}
              >
                Import
              </Button>
            </Box>
            <Box
              component="input"
              type="file"
              accept="application/json,.json"
              ref={notesImportInputRef}
              sx={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  facade.importNotesJson(file);
                }

                event.target.value = '';
              }}
            />
          </Box>

          {facade.importExportStatus !== 'idle' && (
            <Alert severity={facade.importExportStatus} sx={{ mb: 1 }}>
              {facade.importExportMessage}
            </Alert>
          )}

          {facade.copyStatus !== 'idle' && (
            <Alert severity={facade.copyStatus} sx={{ mb: 1 }}>
              {facade.copyMessage}
            </Alert>
          )}

          {facade.error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {facade.error}
            </Alert>
          )}

          {facade.notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
              {facade.loading ? 'Đang tải ghi chú...' : 'Chưa có ghi chú cho PDF này.'}
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {facade.notes.map((note) => {
                const mode = facade.getNoteMode(note);
                const noteText = note.text ?? note.notes ?? '';

                return (
                  <Box
                    key={note.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: mode === 'cornell' ? 'info.main' : 'warning.main',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      p: 1.25,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <ButtonBase
                        onClick={() => facade.selectNotePage(note.pageNumber)}
                        sx={{
                          borderRadius: '4px',
                          color: 'primary.main',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          lineHeight: 1.4,
                          px: 0.25,
                        }}
                      >
                        Trang {note.pageNumber}
                      </ButtonBase>
                      <Chip
                        label={mode === 'cornell' ? 'Cornell' : 'Note'}
                        size="small"
                        sx={{ height: 20, fontSize: '0.6875rem' }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                        {new Date(note.createdAt).toLocaleString()}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="Copy ghi chú dạng Markdown"
                        disabled={facade.editingNoteId === note.id}
                        onClick={() => facade.copyNoteMarkdown(note)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Sửa ghi chú"
                        disabled={facade.editingNoteId === note.id}
                        onClick={() => facade.startEditingNote(note)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Xoá ghi chú"
                        disabled={facade.editingNoteId === note.id}
                        onClick={() => facade.deleteNote(note.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {facade.editingNoteId === note.id ? (
                      <NoteEditForm facade={facade} mode={mode} />
                    ) : (
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedNoteId(note.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setExpandedNoteId(note.id);
                          }
                        }}
                        sx={{
                          borderRadius: 1,
                          cursor: 'zoom-in',
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                          },
                        }}
                      >
                        {mode === 'cornell' ? (
                          <CornellNoteContent note={note} />
                        ) : (
                          <MarkdownNoteContent text={noteText} />
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
    <Dialog
      open={Boolean(expandedNote)}
      onClose={closeExpandedNote}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          maxHeight: '86vh',
        },
      }}
    >
      {expandedNote && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonBase
                onClick={() => facade.selectNotePage(expandedNote.pageNumber)}
                sx={{
                  borderRadius: '4px',
                  color: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  px: 0.25,
                }}
              >
                Trang {expandedNote.pageNumber}
              </ButtonBase>
              <Chip
                label={facade.getNoteMode(expandedNote) === 'cornell' ? 'Cornell' : 'Note'}
                size="small"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                {new Date(expandedNote.createdAt).toLocaleString()}
              </Typography>
              <IconButton
                size="small"
                aria-label="Copy ghi chú dạng Markdown"
                onClick={() => facade.copyNoteMarkdown(expandedNote)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Sửa ghi chú" onClick={startEditingExpandedNote}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Xoá ghi chú" onClick={deleteExpandedNote}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
            {facade.getNoteMode(expandedNote) === 'cornell' ? (
              <CornellNoteContent note={expandedNote} expanded />
            ) : (
              <MarkdownNoteContent text={expandedNote.text ?? expandedNote.notes ?? ''} expanded />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeExpandedNote}>Đóng</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
    </>
  );
}
