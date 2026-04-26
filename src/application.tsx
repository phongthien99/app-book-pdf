import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { DocumentProps } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Derive PdfDocument from react-pdf without depending on pdfjs-dist directly
type PdfDocument = NonNullable<Parameters<NonNullable<DocumentProps['onLoadSuccess']>>[0]>;
type PdfOutline = Awaited<ReturnType<PdfDocument['getOutline']>>;
type PdfOutlineItem = NonNullable<PdfOutline>[number];
type OutlineEntry = {
  id: string;
  title: string;
  pageNumber: number | null;
  items: OutlineEntry[];
};
import {
  AppBar,
  Box,
  Chip,
  CircularProgress,
  Button,
  Divider,
  Drawer,
  Fade,
  IconButton,
  ButtonBase,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar as MuiToolbar,
  Typography,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotesIcon from '@mui/icons-material/Notes';

// Worker must be configured in the same module as Document/Page components
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const MIN_ZOOM = ZOOM_STEPS[0]!;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]!;
const OUTLINE_WIDTH = 260;
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

type PdfNoteMode = 'plain' | 'cornell';

type PdfNote = {
  id: string;
  pageNumber: number;
  mode?: PdfNoteMode;
  text?: string;
  cue?: string;
  notes?: string;
  summary?: string;
  createdAt: string;
};

type PdfContextMenu = {
  mouseX: number;
  mouseY: number;
  pageNumber: number;
  selectedText: string;
};

const PdfNotesSchemaVersion = 1;

function getPdfNotesStorageKey(pdfUrl: string | null) {
  return pdfUrl ? `react-mui.pdf-notes.${encodeURIComponent(pdfUrl)}` : null;
}

function readPdfNotes(pdfUrl: string | null): PdfNote[] {
  const key = getPdfNotesStorageKey(pdfUrl);
  if (!key) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { version?: number; notes?: PdfNote[] };

    return parsed.version === PdfNotesSchemaVersion && Array.isArray(parsed.notes) ? parsed.notes : [];
  } catch {
    return [];
  }
}

function writePdfNotes(pdfUrl: string | null, notes: PdfNote[]) {
  const key = getPdfNotesStorageKey(pdfUrl);
  if (!key) return;

  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: PdfNotesSchemaVersion,
      notes,
    }),
  );
}

function getPdfNoteMode(note: PdfNote): PdfNoteMode {
  return note.mode === 'cornell' ? 'cornell' : 'plain';
}

function escapeMarkdownTableCell(value: string) {
  return value.replaceAll('|', '\\|').replace(/\r?\n/g, '<br />');
}

function formatPdfNoteMarkdown(note: PdfNote, pdfTitle: string, pdfUrl: string | null) {
  const mode = getPdfNoteMode(note);
  const noteText = note.text ?? note.notes ?? '';
  const metadata = [
    `- Trang: ${note.pageNumber}`,
    `- Tạo lúc: ${new Date(note.createdAt).toLocaleString()}`,
    pdfUrl ? `- PDF: ${pdfUrl}` : null,
  ].filter((line): line is string => line !== null);

  if (mode === 'cornell') {
    const cue = note.cue?.trim() || ' ';
    const notes = note.notes?.trim() || noteText || ' ';
    const summary = note.summary?.trim();

    return [
      `### ${pdfTitle} - Trang ${note.pageNumber}`,
      '',
      ...metadata,
      '',
      '| Cue / Question | Notes |',
      '|---|---|',
      `| ${escapeMarkdownTableCell(cue)} | ${escapeMarkdownTableCell(notes)} |`,
      summary ? '' : null,
      summary ? '**Summary**' : null,
      summary ? '' : null,
      summary ?? null,
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
  }

  return [
    `### ${pdfTitle} - Trang ${note.pageNumber}`,
    '',
    ...metadata,
    '',
    noteText,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function formatPdfNotesMarkdown(notes: PdfNote[], pdfTitle: string, pdfUrl: string | null) {
  return [
    `# ${pdfTitle}`,
    '',
    pdfUrl ? `PDF: ${pdfUrl}` : null,
    '',
    ...notes.map((note) => formatPdfNoteMarkdown(note, pdfTitle, pdfUrl)),
  ]
    .filter((line): line is string => line !== null)
    .join('\n\n');
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the textarea path below for browsers with stricter clipboard permissions.
    }
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function createPdfRef(rawRef: unknown) {
  if (!rawRef || typeof rawRef !== 'object' || !('num' in rawRef) || !('gen' in rawRef)) {
    return null;
  }

  const ref = rawRef as { num: number; gen: number };

  return {
    num: ref.num,
    gen: ref.gen,
    toString() {
      return `${this.num}R${this.gen === 0 ? '' : this.gen}`;
    },
  };
}

async function getOutlinePageNumber(pdf: PdfDocument, item: PdfOutlineItem) {
  try {
    const destination = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
    if (!Array.isArray(destination) || destination.length === 0) return null;

    const pageRef = destination[0];
    if (typeof pageRef === 'number') return pageRef + 1;

    const normalizedRef = createPdfRef(pageRef);
    if (!normalizedRef) return null;

    const pageIndex = await pdf.getPageIndex(normalizedRef);

    return pageIndex + 1;
  } catch {
    return null;
  }
}

async function buildOutlineEntries(
  pdf: PdfDocument,
  items: PdfOutlineItem[],
  parentId = 'outline',
): Promise<OutlineEntry[]> {
  return Promise.all(
    items.map(async (item, index) => {
      const id = `${parentId}-${index}`;
      const childItems = Array.isArray(item.items) ? (item.items as PdfOutlineItem[]) : [];

      return {
        id,
        title: item.title,
        pageNumber: await getOutlinePageNumber(pdf, item),
        items: await buildOutlineEntries(pdf, childItems, id),
      };
    }),
  );
}

interface OutlineListProps {
  items: OutlineEntry[];
  onSelectPage: (pageNumber: number) => void;
  level?: number;
}

function OutlineList({ items, onSelectPage, level = 0 }: OutlineListProps) {
  if (!items.length) return null;

  return (
    <Box component="ul" sx={{ listStyle: 'none', pl: level === 0 ? 0 : 1.5, m: 0 }}>
      {items.map((item) => (
        <Box component="li" key={item.id} sx={{ my: 0.25 }}>
          <ButtonBase
            disabled={item.pageNumber === null}
            onClick={() => item.pageNumber !== null && onSelectPage(item.pageNumber)}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: '4px',
              color: 'text.primary',
              textAlign: 'left',
              '&:hover': { bgcolor: 'action.hover' },
              '&.Mui-disabled': { color: 'text.secondary', opacity: 1 },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
              {item.title}
            </Typography>
            {item.pageNumber !== null && (
              <Typography
                component="span"
                variant="caption"
                sx={{ minWidth: 24, color: 'text.secondary', textAlign: 'right', lineHeight: 1.5 }}
              >
                {item.pageNumber}
              </Typography>
            )}
          </ButtonBase>

          <OutlineList items={item.items} onSelectPage={onSelectPage} level={level + 1} />
        </Box>
      ))}
    </Box>
  );
}

interface AppProps {
  pdfUrl: string | null;
  title?: string;
  onBack: () => void;
}

function App({ pdfUrl, title, onBack }: AppProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [showOutline, setShowOutline] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPageChip, setShowPageChip] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<PdfDocument | null>(null);
  const [outlineItems, setOutlineItems] = useState<OutlineEntry[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [notes, setNotes] = useState<PdfNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [noteMode, setNoteMode] = useState<PdfNoteMode>('plain');
  const [noteDraft, setNoteDraft] = useState('');
  const [cueDraft, setCueDraft] = useState('');
  const [cornellNotesDraft, setCornellNotesDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [notePageNumber, setNotePageNumber] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<PdfContextMenu | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState('');
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const renderedPagesRef = useRef<Set<number>>(new Set());

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const noteInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const cornellNotesInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lazyObserverRef = useRef<IntersectionObserver | null>(null);

  const onLoadSuccess = useCallback((pdf: PdfDocument) => {
    setNumPages(pdf.numPages);
    setPdfDoc(pdf);
    setCurrentPage(1);
    setShowOutline(false);
    setShowNotes(false);
    setOutlineItems([]);
    setNoteDraft('');
    setCueDraft('');
    setCornellNotesDraft('');
    setSummaryDraft('');
    setNotePageNumber(null);
    setContextMenu(null);
    pageRefs.current.clear();
    renderedPagesRef.current = new Set();
    setRenderedPages(new Set());
  }, []);

  useEffect(() => {
    setNotesLoaded(false);
    setNotes(readPdfNotes(pdfUrl));
    setNotesLoaded(true);
  }, [pdfUrl]);

  useEffect(() => {
    if (!notesLoaded) return;

    writePdfNotes(pdfUrl, notes);
  }, [notes, notesLoaded, pdfUrl]);

  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    setOutlineLoading(true);

    pdfDoc
      .getOutline()
      .then((outline) => buildOutlineEntries(pdfDoc, outline ?? []))
      .then((entries) => {
        if (!active) return;
        setOutlineItems(entries);
        setShowOutline(entries.length > 0);
      })
      .catch(() => {
        if (active) setOutlineItems([]);
      })
      .finally(() => {
        if (active) setOutlineLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pdfDoc]);

  // IntersectionObserver to track which page is visible
  useEffect(() => {
    if (!numPages || !containerRef.current) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const p = Number(best.target.getAttribute('data-page'));
          if (p) setCurrentPage(p);
        }
      },
      { root: containerRef.current, threshold: 0.4 },
    );

    pageRefs.current.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [numPages]);

  // Lazy-load observer: pre-render pages 600px before they enter the viewport
  useEffect(() => {
    if (!numPages) return;

    lazyObserverRef.current?.disconnect();
    lazyObserverRef.current = new IntersectionObserver(
      (entries) => {
        const toLoad: number[] = [];
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const p = Number(e.target.getAttribute('data-lazy'));
            if (p && !renderedPagesRef.current.has(p)) toLoad.push(p);
          }
        });
        if (toLoad.length) {
          toLoad.forEach((p) => renderedPagesRef.current.add(p));
          setRenderedPages((prev) => new Set([...prev, ...toLoad]));
        }
      },
      { rootMargin: '600px 0px' },
    );

    return () => lazyObserverRef.current?.disconnect();
  }, [numPages]);

  const setPageRef = useCallback((pageNumber: number, el: HTMLDivElement | null) => {
    if (el) {
      el.setAttribute('data-page', String(pageNumber));
      el.setAttribute('data-lazy', String(pageNumber));
      pageRefs.current.set(pageNumber, el);
      observerRef.current?.observe(el);
      lazyObserverRef.current?.observe(el);
    } else {
      pageRefs.current.delete(pageNumber);
    }
  }, []);

  const zoomIn = () => setScale((s) => ZOOM_STEPS.find((z) => z > s) ?? s);
  const zoomOut = () => setScale((s) => [...ZOOM_STEPS].reverse().find((z) => z < s) ?? s);

  const handleScroll = useCallback(() => {
    setShowPageChip(true);
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setShowPageChip(false), 1500);
  }, []);

  const handleOutlinePageSelect = useCallback((pageNumber: number) => {
    const el = pageRefs.current.get(pageNumber);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const activeNotePage = notePageNumber ?? currentPage;
  const hasPlainDraft = noteDraft.trim().length > 0;
  const hasCornellDraft =
    cueDraft.trim().length > 0 || cornellNotesDraft.trim().length > 0 || summaryDraft.trim().length > 0;
  const hasActiveDraft = noteMode === 'cornell' ? hasCornellDraft : hasPlainDraft;

  const handleAddNote = useCallback(() => {
    if (!hasActiveDraft) return;

    const createdAt = new Date().toISOString();
    const note =
      noteMode === 'cornell'
        ? {
            id: `${Date.now()}`,
            pageNumber: activeNotePage,
            mode: 'cornell' as const,
            cue: cueDraft.trim(),
            notes: cornellNotesDraft.trim(),
            summary: summaryDraft.trim(),
            createdAt,
          }
        : {
            id: `${Date.now()}`,
            pageNumber: activeNotePage,
            mode: 'plain' as const,
            text: noteDraft.trim(),
            createdAt,
          };

    setNotes((currentNotes) => [note, ...currentNotes]);
    setNoteDraft('');
    setCueDraft('');
    setCornellNotesDraft('');
    setSummaryDraft('');
    setNotePageNumber(null);
  }, [activeNotePage, cornellNotesDraft, cueDraft, hasActiveDraft, noteDraft, noteMode, summaryDraft]);

  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
  }, []);

  const handleCopyNoteMarkdown = useCallback(
    async (note: PdfNote) => {
      try {
        await copyTextToClipboard(formatPdfNoteMarkdown(note, title ?? 'PDF', pdfUrl));
        setCopyStatus('success');
        setCopyMessage(`Đã copy ghi chú trang ${note.pageNumber} dạng Markdown.`);
      } catch {
        setCopyStatus('error');
        setCopyMessage('Không thể copy ghi chú. Hãy kiểm tra quyền clipboard của trình duyệt.');
      }
    },
    [pdfUrl, title],
  );

  const handleCopyAllNotesMarkdown = useCallback(async () => {
    try {
      await copyTextToClipboard(formatPdfNotesMarkdown(notes, title ?? 'PDF', pdfUrl));
      setCopyStatus('success');
      setCopyMessage('Đã copy tất cả ghi chú dạng Markdown.');
    } catch {
      setCopyStatus('error');
      setCopyMessage('Không thể copy ghi chú. Hãy kiểm tra quyền clipboard của trình duyệt.');
    }
  }, [notes, pdfUrl, title]);

  const handleCopyDraftMarkdown = useCallback(async () => {
    if (!hasActiveDraft) return;

    const note =
      noteMode === 'cornell'
        ? {
            id: 'draft',
            pageNumber: activeNotePage,
            mode: 'cornell' as const,
            cue: cueDraft.trim(),
            notes: cornellNotesDraft.trim(),
            summary: summaryDraft.trim(),
            createdAt: new Date().toISOString(),
          }
        : {
            id: 'draft',
            pageNumber: activeNotePage,
            mode: 'plain' as const,
            text: noteDraft.trim(),
            createdAt: new Date().toISOString(),
          };

    try {
      await copyTextToClipboard(formatPdfNoteMarkdown(note, title ?? 'PDF', pdfUrl));
      setCopyStatus('success');
      setCopyMessage(`Đã copy ghi chú trang ${activeNotePage} dạng Markdown.`);
    } catch {
      setCopyStatus('error');
      setCopyMessage('Không thể copy ghi chú. Hãy kiểm tra quyền clipboard của trình duyệt.');
    }
  }, [
    activeNotePage,
    cornellNotesDraft,
    cueDraft,
    hasActiveDraft,
    noteDraft,
    noteMode,
    pdfUrl,
    summaryDraft,
    title,
  ]);

  const handleNotePageSelect = useCallback((pageNumber: number) => {
    setShowNotes(true);
    handleOutlinePageSelect(pageNumber);
  }, [handleOutlinePageSelect]);

  const handlePdfContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfDoc) return;

    const target = event.target instanceof Element ? event.target : null;
    const pageElement = target?.closest('[data-page]');
    const pageNumber = pageElement ? Number(pageElement.getAttribute('data-page')) : currentPage;

    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : currentPage,
      selectedText: window.getSelection()?.toString().trim() ?? '',
    });
  }, [currentPage, pdfDoc]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAddNote = useCallback(() => {
    if (!contextMenu) return;

    setShowNotes(true);
    setNotePageNumber(contextMenu.pageNumber);
    if (noteMode === 'cornell') {
      setCornellNotesDraft(contextMenu.selectedText);
    } else {
      setNoteDraft(contextMenu.selectedText);
    }
    setContextMenu(null);
    window.setTimeout(() => {
      if (noteMode === 'cornell') {
        cornellNotesInputRef.current?.focus();
      } else {
        noteInputRef.current?.focus();
      }
    }, 0);
  }, [contextMenu, noteMode]);

  // Bake zoom into width — do NOT pass both `width` and `scale` to <Page>
  // because react-pdf multiplies them, causing text layer to misalign with canvas.
  const baseWidth = containerRef.current
    ? Math.min(containerRef.current.clientWidth - 32, 860)
    : undefined;
  const pageWidth = baseWidth !== undefined ? Math.round(baseWidth * scale) : undefined;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Toolbar ── */}
      <AppBar position="static">
        <MuiToolbar variant="dense" disableGutters sx={{ gap: 1, px: 1.5 }}>
          <IconButton size="small" onClick={onBack} aria-label="Quay lại" sx={{ color: 'white' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'white', my: 1.2, opacity: 0.5 }} />

          {pdfDoc && (
            <>
              <IconButton
                size="small"
                onClick={() => setShowOutline((v) => !v)}
                aria-label="Mục lục"
                sx={{ color: showOutline ? 'rgba(255,255,255,0.45)' : 'white' }}
              >
                <MenuBookIcon fontSize="small" />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'white', my: 1.2, opacity: 0.5 }} />
            </>
          )}

          {pdfDoc && (
            <>
              <IconButton
                size="small"
                onClick={() => {
                  setShowNotes((value) => !value);
                }}
                aria-label="Ghi chú"
                sx={{ color: showNotes ? 'rgba(255,255,255,0.45)' : 'white' }}
              >
                <NotesIcon fontSize="small" />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'white', my: 1.2, opacity: 0.5 }} />
            </>
          )}

          <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }} noWrap>
            {title ?? 'PDF Viewer'}
          </Typography>

          {numPages > 0 && (
            <Typography variant="body2" sx={{ opacity: 0.85, whiteSpace: 'nowrap' }}>
              {currentPage} / {numPages}
            </Typography>
          )}
          <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'white', my: 1.2, opacity: 0.5 }} />

          <IconButton size="small" onClick={zoomOut} disabled={scale <= MIN_ZOOM} sx={{ color: 'white' }}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 38, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton
            size="small"
            onClick={zoomIn}
            disabled={scale >= MAX_ZOOM}
            sx={{ color: 'white' }}
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </MuiToolbar>
      </AppBar>

      {/* ── Body: outline sidebar + pdf scroll area ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Mục lục sidebar (persistent drawer) */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={showOutline}
          sx={{
            width: showOutline ? OUTLINE_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 0.2s',
            '& .MuiDrawer-paper': {
              width: OUTLINE_WIDTH,
              position: 'relative',
              height: '100%',
              overflow: 'auto',
              borderRight: '1px solid',
              borderColor: 'divider',
              boxSizing: 'border-box',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Mục lục
            </Typography>
          </Box>
          <Divider />
          <Box
            sx={{
              p: 1,
            }}
          >
            {outlineLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <OutlineList items={outlineItems} onSelectPage={handleOutlinePageSelect} />
            )}
          </Box>
        </Drawer>

        {/* PDF scroll area */}
        <Box
          ref={containerRef}
          onScroll={handleScroll}
          onContextMenu={handlePdfContextMenu}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            bgcolor: '#f1f3f5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            position: 'relative',
          }}
        >
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onLoadSuccess}
              loading={<Box sx={{ mt: 6 }}><CircularProgress size={48} /></Box>}
              error={
                <Alert severity="error" sx={{ mt: 4, mx: 2 }}>
                  Không thể tải file PDF.
                </Alert>
              }
            >
              {Array.from({ length: numPages }, (_, i) => {
                const pageNumber = i + 1;
                const isReady = renderedPages.has(pageNumber);
                // Placeholder height: A4 ratio approximation
                const placeholderH = pageWidth ? Math.round(pageWidth * 1.414) : 1000;

                return (
                  <Box
                    key={pageNumber}
                    ref={(el) => setPageRef(pageNumber, el as HTMLDivElement | null)}
                    sx={{ mb: 2 }}
                  >
                    {isReady ? (
                      <>
                        <Page
                          pageNumber={pageNumber}
                          width={pageWidth}
                          loading={null}
                          renderTextLayer
                          renderAnnotationLayer
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: 'center',
                            color: 'text.secondary',
                            mt: 0.5,
                            userSelect: 'none',
                          }}
                        >
                          {pageNumber} / {numPages}
                        </Typography>
                      </>
                    ) : (
                      <Box
                        sx={{
                          width: pageWidth ?? '100%',
                          height: placeholderH,
                          bgcolor: 'white',
                          borderRadius: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CircularProgress size={24} thickness={2} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Document>
          ) : (
            <Box sx={{ mt: 6 }}><CircularProgress size={48} /></Box>
          )}

          {/* Floating page indicator */}
          {numPages > 0 && (
            <Fade in={showPageChip}>
              <Chip
                label={`${currentPage} / ${numPages}`}
                size="small"
                sx={{
                  position: 'sticky',
                  bottom: 16,
                  alignSelf: 'flex-end',
                  mr: 2,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  pointerEvents: 'none',
                  backdropFilter: 'blur(4px)',
                }}
              />
            </Fade>
          )}
        </Box>

        <Menu
          open={contextMenu !== null}
          onClose={closeContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={handleContextAddNote}>
            <NoteAddIcon fontSize="small" sx={{ mr: 1 }} />
            Thêm ghi chú vào bên phải
          </MenuItem>
        </Menu>

        <Drawer
          variant="persistent"
          anchor="right"
          open={showNotes}
          sx={{
            width: showNotes ? NOTES_WIDTH : 0,
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
                Trang ghi chú: {activeNotePage}
              </Typography>
            </Box>
            <Divider />

            <Box sx={{ p: 2, display: 'grid', gap: 1.25 }}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={noteMode}
                onChange={(_, value: PdfNoteMode | null) => value && setNoteMode(value)}
                aria-label="Kiểu ghi chú"
              >
                <ToggleButton value="plain">Thường</ToggleButton>
                <ToggleButton value="cornell">Cornell</ToggleButton>
              </ToggleButtonGroup>

              {noteMode === 'cornell' ? (
                <>
                  <TextField
                    multiline
                    minRows={2}
                    size="small"
                    label="Cue / Câu hỏi"
                    placeholder="Từ khoá, câu hỏi, ý chính..."
                    value={cueDraft}
                    inputRef={noteInputRef}
                    onChange={(event) => setCueDraft(event.target.value)}
                  />
                  <TextField
                    multiline
                    minRows={3}
                    size="small"
                    label="Notes"
                    placeholder="Ghi chú chi tiết..."
                    value={cornellNotesDraft}
                    inputRef={cornellNotesInputRef}
                    onChange={(event) => setCornellNotesDraft(event.target.value)}
                  />
                  <TextField
                    multiline
                    minRows={2}
                    size="small"
                    label="Summary"
                    placeholder="Tóm tắt ngắn sau khi đọc..."
                    value={summaryDraft}
                    onChange={(event) => setSummaryDraft(event.target.value)}
                  />
                </>
              ) : (
                <TextField
                  multiline
                  minRows={3}
                  size="small"
                  label="Thêm ghi chú"
                  placeholder="Nhập suy nghĩ, ý chính, việc cần nhớ..."
                  value={noteDraft}
                  inputRef={noteInputRef}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button variant="contained" size="small" disabled={!hasActiveDraft} onClick={handleAddNote}>
                  Lưu trang {activeNotePage}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  disabled={!hasActiveDraft}
                  onClick={() => void handleCopyDraftMarkdown()}
                >
                  Copy MD
                </Button>
              </Box>
            </Box>

            <Divider />
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ flexGrow: 1 }}>
                  Highlights & Notes
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  disabled={notes.length === 0}
                  onClick={handleCopyAllNotesMarkdown}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Copy MD
                </Button>
              </Box>

              {copyStatus !== 'idle' && (
                <Alert severity={copyStatus} sx={{ mb: 1 }}>
                  {copyMessage}
                </Alert>
              )}

              {notes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                  Chưa có ghi chú cho PDF này.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {notes.map((note) => {
                    const mode = getPdfNoteMode(note);

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
                            onClick={() => handleNotePageSelect(note.pageNumber)}
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
                            onClick={() => void handleCopyNoteMarkdown(note)}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="Xoá ghi chú" onClick={() => handleDeleteNote(note.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {mode === 'cornell' ? (
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
      </Box>
    </Box>
  );
}

export default App;
