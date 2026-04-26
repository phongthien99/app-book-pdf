import { useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import { usePdfNotesFacade } from '../facade/pdf-note.facade';
import type { NoteDraftSeed } from '../hooks/hooks.types';
import type { PdfNote, PdfNoteMode } from '../schema/pdf-note.schema';

const NOTES_WIDTH = 320;
const NOTE_TEXT_MAX_HEIGHT = 180;

const noteTextScrollSx = {
  maxHeight: NOTE_TEXT_MAX_HEIGHT,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
  pr: 0.5,
  overflowWrap: 'anywhere',
} as const;

interface PdfNotesDrawerProps {
  open: boolean;
  pdfUrl: string | null;
  title?: string;
  currentPage: number;
  draftSeed: NoteDraftSeed | null;
  onSelectPage: (pageNumber: number) => void;
}

function CornellNoteContent({ note }: { note: PdfNote }) {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {note.cue && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Cue / Question
          </Typography>
          <Typography variant="body2" sx={noteTextScrollSx}>
            {note.cue}
          </Typography>
        </Box>
      )}
      {note.notes && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Notes
          </Typography>
          <Typography variant="body2" sx={noteTextScrollSx}>
            {note.notes}
          </Typography>
        </Box>
      )}
      {note.summary && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Summary
          </Typography>
          <Typography variant="body2" sx={noteTextScrollSx}>
            {note.summary}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function PdfNotesDrawer({
  open,
  pdfUrl,
  title,
  currentPage,
  draftSeed,
  onSelectPage,
}: PdfNotesDrawerProps) {
  const facade = usePdfNotesFacade({
    pdfUrl,
    title,
    currentPage,
    draftSeed,
    onSelectPage,
  });
  const notesImportInputRef = useRef<HTMLInputElement>(null);

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      sx={{
        width: open ? NOTES_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.2s',
        '& .MuiDrawer-paper': {
          width: NOTES_WIDTH,
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
                        onClick={() => facade.copyNoteMarkdown(note)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Xoá ghi chú" onClick={() => facade.deleteNote(note.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {mode === 'cornell' ? (
                      <CornellNoteContent note={note} />
                    ) : (
                      <Typography variant="body2" sx={noteTextScrollSx}>
                        {note.text ?? note.notes}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
