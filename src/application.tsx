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
  Divider,
  Drawer,
  Fade,
  IconButton,
  ButtonBase,
  Menu,
  MenuItem,
  Toolbar as MuiToolbar,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotesIcon from '@mui/icons-material/Notes';
import GestureOutlinedIcon from '@mui/icons-material/GestureOutlined';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';

import { PdfDrawingLayer } from './components/pdf-drawing-layer';
import { PdfNotesDrawer } from './features/pdf-notes/components/PdfNotesDrawer';
import type { PdfDrawingLine, PdfDrawingTool } from './components/pdf-drawing-layer';
import type { NoteDraftSeed } from './features/pdf-notes/hooks/hooks.types';

// Worker must be configured in the same module as Document/Page components
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const MIN_ZOOM = ZOOM_STEPS[0]!;
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]!;
const OUTLINE_WIDTH = 260;
const DRAWING_COLOR_OPTIONS = ['#d32f2f', '#1976d2', '#2e7d32', '#f9a825', '#111827'];
const PEN_WIDTH_OPTIONS = [2, 3, 5, 8, 12];
const ERASER_WIDTH_OPTIONS = [12, 20, 32, 48];
const PDF_DRAWINGS_STORAGE_PREFIX = 'react-mui.pdf-drawings.';

type PdfContextMenu = {
  mouseX: number;
  mouseY: number;
  pageNumber: number;
  selectedText: string;
};

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

function getPdfDrawingsStorageKey(pdfUrl: string) {
  return `${PDF_DRAWINGS_STORAGE_PREFIX}${pdfUrl}`;
}

function isPdfDrawingTool(value: unknown): value is PdfDrawingTool {
  return value === 'pen' || value === 'eraser';
}

function isPdfDrawingLine(value: unknown): value is PdfDrawingLine {
  if (!value || typeof value !== 'object') return false;

  const line = value as Partial<PdfDrawingLine>;

  return (
    typeof line.id === 'string' &&
    isPdfDrawingTool(line.tool) &&
    typeof line.color === 'string' &&
    typeof line.strokeWidth === 'number' &&
    Number.isFinite(line.strokeWidth) &&
    Array.isArray(line.points) &&
    line.points.every((point) => typeof point === 'number' && Number.isFinite(point))
  );
}

function isPdfDrawingsRecord(value: unknown): value is Record<number, PdfDrawingLine[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(([pageNumber, lines]) => {
    const normalizedPageNumber = Number(pageNumber);

    return (
      Number.isInteger(normalizedPageNumber) &&
      normalizedPageNumber > 0 &&
      Array.isArray(lines) &&
      lines.every(isPdfDrawingLine)
    );
  });
}

function readStoredPdfDrawings(pdfUrl: string): Record<number, PdfDrawingLine[]> {
  try {
    const rawValue = window.localStorage.getItem(getPdfDrawingsStorageKey(pdfUrl));
    if (!rawValue) return {};

    const parsedValue: unknown = JSON.parse(rawValue);

    return isPdfDrawingsRecord(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

function hasAnyPdfDrawings(drawings: Record<number, PdfDrawingLine[]>) {
  return Object.values(drawings).some((lines) => lines.length > 0);
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
  const [contextMenu, setContextMenu] = useState<PdfContextMenu | null>(null);
  const [noteDraftSeed, setNoteDraftSeed] = useState<NoteDraftSeed | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [drawingTool, setDrawingTool] = useState<PdfDrawingTool | null>(null);
  const [drawingMenuAnchorEl, setDrawingMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [penColor, setPenColor] = useState(DRAWING_COLOR_OPTIONS[0]!);
  const [penStrokeWidth, setPenStrokeWidth] = useState(3);
  const [eraserStrokeWidth, setEraserStrokeWidth] = useState(24);
  const [activeDrawingPage, setActiveDrawingPage] = useState<number | null>(null);
  const [pageDrawings, setPageDrawings] = useState<Record<number, PdfDrawingLine[]>>({});
  const [drawingsHydrated, setDrawingsHydrated] = useState(false);
  const renderedPagesRef = useRef<Set<number>>(new Set());

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
    setContextMenu(null);
    setNoteDraftSeed(null);
    setDrawingTool(null);
    setActiveDrawingPage(null);
    setPageDrawings(pdfUrl ? readStoredPdfDrawings(pdfUrl) : {});
    setDrawingsHydrated(true);
    pageRefs.current.clear();
    renderedPagesRef.current = new Set();
    setRenderedPages(new Set());
  }, [pdfUrl]);

  useEffect(() => {
    setDrawingsHydrated(false);
    setActiveDrawingPage(null);
    setPageDrawings({});
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfUrl || !drawingsHydrated) return;

    const storageKey = getPdfDrawingsStorageKey(pdfUrl);

    try {
      if (hasAnyPdfDrawings(pageDrawings)) {
        window.localStorage.setItem(storageKey, JSON.stringify(pageDrawings));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore storage quota/private-mode failures; drawing still works for this session.
    }
  }, [drawingsHydrated, pageDrawings, pdfUrl]);

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

  const handleDrawingToolToggle = useCallback((tool: PdfDrawingTool) => {
    setDrawingTool((currentTool) => (currentTool === tool ? null : tool));
  }, []);

  const handleDrawingMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setDrawingMenuAnchorEl(event.currentTarget);
  }, []);

  const handleDrawingMenuClose = useCallback(() => {
    setDrawingMenuAnchorEl(null);
  }, []);

  const drawingActionPage =
    activeDrawingPage && pageDrawings[activeDrawingPage]?.length ? activeDrawingPage : currentPage;
  const drawingActionPageHasLines = Boolean(pageDrawings[drawingActionPage]?.length);

  const handlePageDrawingChange = useCallback((
    pageNumber: number,
    updater: (lines: PdfDrawingLine[]) => PdfDrawingLine[],
  ) => {
    setActiveDrawingPage(pageNumber);
    setPageDrawings((currentDrawings) => ({
      ...currentDrawings,
      [pageNumber]: updater(currentDrawings[pageNumber] ?? []),
    }));
  }, []);

  const undoCurrentPageDrawing = useCallback(() => {
    setPageDrawings((currentDrawings) => {
      const lines = currentDrawings[drawingActionPage] ?? [];
      if (!lines.length) return currentDrawings;

      return {
        ...currentDrawings,
        [drawingActionPage]: lines.slice(0, -1),
      };
    });
  }, [drawingActionPage]);

  const clearCurrentPageDrawings = useCallback(() => {
    setPageDrawings((currentDrawings) => {
      if (!currentDrawings[drawingActionPage]?.length) return currentDrawings;

      return {
        ...currentDrawings,
        [drawingActionPage]: [],
      };
    });
  }, [drawingActionPage]);

  const handleScroll = useCallback(() => {
    setShowPageChip(true);
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setShowPageChip(false), 1500);
  }, []);

  const handleOutlinePageSelect = useCallback((pageNumber: number) => {
    const el = pageRefs.current.get(pageNumber);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleNotePageSelect = useCallback((pageNumber: number) => {
    setShowNotes(true);
    handleOutlinePageSelect(pageNumber);
  }, [handleOutlinePageSelect]);

  const handlePdfContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfDoc || drawingTool) return;

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
  }, [currentPage, drawingTool, pdfDoc]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAddNote = useCallback(() => {
    if (!contextMenu) return;

    setShowNotes(true);
    setNoteDraftSeed({
      pageNumber: contextMenu.pageNumber,
      selectedText: contextMenu.selectedText,
      requestId: Date.now(),
    });
    setContextMenu(null);
  }, [contextMenu]);

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

          {pdfDoc && (
            <>
              <Tooltip title="Bút vẽ">
                <IconButton
                  size="small"
                  onClick={() => handleDrawingToolToggle('pen')}
                  aria-label="Bút vẽ"
                  sx={{ color: drawingTool === 'pen' ? 'rgba(255,255,255,0.45)' : 'white' }}
                >
                  <GestureOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Tẩy">
                <IconButton
                  size="small"
                  onClick={() => handleDrawingToolToggle('eraser')}
                  aria-label="Tẩy"
                  sx={{ color: drawingTool === 'eraser' ? 'rgba(255,255,255,0.45)' : 'white' }}
                >
                  <CleaningServicesOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Màu và cỡ nét">
                <IconButton
                  size="small"
                  onClick={handleDrawingMenuOpen}
                  aria-label="Màu và cỡ nét"
                  sx={{ color: drawingMenuAnchorEl ? 'rgba(255,255,255,0.45)' : 'white' }}
                >
                  <PaletteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={drawingMenuAnchorEl}
                open={Boolean(drawingMenuAnchorEl)}
                onClose={handleDrawingMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    Màu bút
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                    {DRAWING_COLOR_OPTIONS.map((color) => (
                      <ButtonBase
                        key={color}
                        onClick={() => setPenColor(color)}
                        aria-label={`Chọn màu ${color}`}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: color,
                          border: '2px solid',
                          borderColor: penColor === color ? 'text.primary' : 'divider',
                          boxShadow: penColor === color ? '0 0 0 2px rgba(0,0,0,0.12)' : 'none',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ px: 1.5, py: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    Cỡ bút
                  </Typography>
                </Box>
                {PEN_WIDTH_OPTIONS.map((width) => (
                  <MenuItem
                    key={width}
                    selected={penStrokeWidth === width}
                    onClick={() => setPenStrokeWidth(width)}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        mr: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: width,
                          maxHeight: 12,
                          borderRadius: 999,
                          bgcolor: penColor,
                        }}
                      />
                    </Box>
                    {width}px
                  </MenuItem>
                ))}
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ px: 1.5, py: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    Cỡ tẩy
                  </Typography>
                </Box>
                {ERASER_WIDTH_OPTIONS.map((width) => (
                  <MenuItem
                    key={width}
                    selected={eraserStrokeWidth === width}
                    onClick={() => setEraserStrokeWidth(width)}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        mr: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: Math.min(width, 14),
                          borderRadius: 999,
                          bgcolor: 'text.secondary',
                        }}
                      />
                    </Box>
                    {width}px
                  </MenuItem>
                ))}
              </Menu>
              <Tooltip title="Hoàn tác trang hiện tại">
                <span>
                  <IconButton
                    size="small"
                    onClick={undoCurrentPageDrawing}
                    disabled={!drawingActionPageHasLines}
                    aria-label="Hoàn tác nét vẽ"
                    sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.35)' } }}
                  >
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Xóa nét vẽ trang hiện tại">
                <span>
                  <IconButton
                    size="small"
                    onClick={clearCurrentPageDrawings}
                    disabled={!drawingActionPageHasLines}
                    aria-label="Xóa nét vẽ trang hiện tại"
                    sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.35)' } }}
                  >
                    <DeleteSweepOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'white', my: 1.2, opacity: 0.5 }} />
            </>
          )}

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
                        <PdfDrawingLayer
                          color={penColor}
                          lines={pageDrawings[pageNumber] ?? []}
                          onDrawStart={setActiveDrawingPage}
                          onLinesChange={(updater) => handlePageDrawingChange(pageNumber, updater)}
                          pageNumber={pageNumber}
                          strokeWidth={drawingTool === 'eraser' ? eraserStrokeWidth : penStrokeWidth}
                          tool={drawingTool}
                        >
                          <Page
                            pageNumber={pageNumber}
                            width={pageWidth}
                            loading={null}
                            renderTextLayer
                            renderAnnotationLayer
                          />
                        </PdfDrawingLayer>
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

        <PdfNotesDrawer
          open={showNotes}
          pdfUrl={pdfUrl}
          title={title}
          currentPage={currentPage}
          draftSeed={noteDraftSeed}
          onSelectPage={handleNotePageSelect}
        />
      </Box>
    </Box>
  );
}

export default App;
