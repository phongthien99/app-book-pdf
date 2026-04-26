import {
  PdfNotesSchemaVersion,
  PdfNotesStorageSchema,
  type CreatePdfNoteInput,
  type PdfNote,
  type PdfNoteMode,
} from '../schema/pdf-note.schema';

type PdfNotesExport = {
  version: typeof PdfNotesSchemaVersion;
  pdfTitle: string;
  pdfUrl: string | null;
  exportedAt: string;
  notes: PdfNote[];
};

function getPdfNotesStorageKey(pdfUrl: string | null) {
  return pdfUrl ? `react-mui.pdf-notes.${encodeURIComponent(pdfUrl)}` : null;
}

function readStoredNotes(pdfUrl: string | null): PdfNote[] {
  const key = getPdfNotesStorageKey(pdfUrl);
  if (!key || typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = PdfNotesStorageSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data.notes : [];
  } catch {
    return [];
  }
}

function writeStoredNotes(pdfUrl: string | null, notes: PdfNote[]) {
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

function formatPdfNoteContent(note: PdfNote): string {
  const mode = getPdfNoteMode(note);
  const noteText = note.text ?? note.notes ?? '';

  if (mode === 'cornell') {
    const cue = note.cue?.trim() || ' ';
    const notes = note.notes?.trim() || noteText || ' ';
    const summary = note.summary?.trim();

    return [
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

  return noteText;
}

function formatPdfNoteMarkdown(note: PdfNote) {
  return [`**Trang ${note.pageNumber}**`, '', formatPdfNoteContent(note)].join('\n');
}

function formatPdfNotesMarkdown(notes: PdfNote[], pdfTitle: string) {
  const grouped = new Map<number, PdfNote[]>();
  for (const note of notes) {
    const group = grouped.get(note.pageNumber) ?? [];
    group.push(note);
    grouped.set(note.pageNumber, group);
  }

  const pageBlocks = Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, pageNotes]) => {
      const contents = pageNotes.map(formatPdfNoteContent).join('\n\n');
      return `**Trang ${pageNumber}**\n\n${contents}`;
    });

  return [`# ${pdfTitle}`, '', ...pageBlocks].join('\n\n');
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

function createSafeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'pdf';
}

function downloadJsonFile(filename: string, data: PdfNotesExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const pdfNoteRepository = {
  async getAll(pdfUrl: string | null): Promise<PdfNote[]> {
    return Promise.resolve(readStoredNotes(pdfUrl));
  },

  async create(pdfUrl: string | null, input: CreatePdfNoteInput): Promise<PdfNote> {
    const note: PdfNote =
      input.mode === 'cornell'
        ? {
            id: `${Date.now()}`,
            pageNumber: input.pageNumber,
            mode: 'cornell',
            cue: input.cue,
            notes: input.notes,
            summary: input.summary,
            createdAt: new Date().toISOString(),
          }
        : {
            id: `${Date.now()}`,
            pageNumber: input.pageNumber,
            mode: 'plain',
            text: input.text,
            createdAt: new Date().toISOString(),
          };
    const notes = readStoredNotes(pdfUrl);

    writeStoredNotes(pdfUrl, [note, ...notes]);

    return Promise.resolve(note);
  },

  async delete(pdfUrl: string | null, noteId: string): Promise<void> {
    writeStoredNotes(
      pdfUrl,
      readStoredNotes(pdfUrl).filter((note) => note.id !== noteId),
    );
  },

  async importMany(pdfUrl: string | null, importedNotes: PdfNote[]): Promise<PdfNote[]> {
    const currentNotes = readStoredNotes(pdfUrl);
    const existingIds = new Set(currentNotes.map((note) => note.id));
    const normalizedNotes = importedNotes.map((note) =>
      existingIds.has(note.id)
        ? {
            ...note,
            id: `${note.id}-${Date.now()}`,
          }
        : note,
    );

    writeStoredNotes(pdfUrl, [...normalizedNotes, ...currentNotes]);

    return Promise.resolve(normalizedNotes);
  },

  async copyNoteMarkdown(note: PdfNote, _pdfTitle: string, _pdfUrl: string | null): Promise<void> {
    await copyTextToClipboard(formatPdfNoteMarkdown(note));
  },

  async copyNotesMarkdown(notes: PdfNote[], pdfTitle: string, _pdfUrl: string | null): Promise<void> {
    await copyTextToClipboard(formatPdfNotesMarkdown(notes, pdfTitle));
  },

  exportNotesJson(notes: PdfNote[], pdfTitle: string, pdfUrl: string | null) {
    downloadJsonFile(`${createSafeFilename(pdfTitle)}-notes.json`, {
      version: PdfNotesSchemaVersion,
      pdfTitle,
      pdfUrl,
      exportedAt: new Date().toISOString(),
      notes,
    });
  },

  getNoteMode: getPdfNoteMode,
};
