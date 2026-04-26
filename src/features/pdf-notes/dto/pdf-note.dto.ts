import {
  CreatePdfNoteSchema,
  ImportedPdfNotesSchema,
  PdfNoteSchema,
  type CreatePdfNoteInput,
  type PdfNote,
} from '../schema/pdf-note.schema';

export function parseCreatePdfNote(rawInput: unknown): CreatePdfNoteInput {
  const input = CreatePdfNoteSchema.parse(rawInput);

  return input.mode === 'cornell'
    ? {
        pageNumber: input.pageNumber,
        mode: input.mode,
        cue: input.cue?.trim() ?? '',
        notes: input.notes?.trim() ?? '',
        summary: input.summary?.trim() ?? '',
      }
    : {
        pageNumber: input.pageNumber,
        mode: input.mode,
        text: input.text?.trim() ?? '',
      };
}

export function parsePdfNotesImport(rawJson: string): PdfNote[] {
  const parsed = JSON.parse(rawJson) as unknown;
  const importedNotes = ImportedPdfNotesSchema.parse(parsed);
  const normalizedNotes: PdfNote[] = [];

  importedNotes.forEach((note) => {
    const parsedNote = PdfNoteSchema.safeParse({
      ...note,
      id: note.id || `${Date.now()}-${Math.random()}`,
      createdAt: note.createdAt || new Date().toISOString(),
      mode: note.mode === 'cornell' ? 'cornell' : 'plain',
    });

    if (!parsedNote.success) return;

    const data = parsedNote.data;

    if (data.mode === 'cornell') {
      const notes = data.notes ?? data.text ?? '';

      if (!data.cue?.trim() && !notes.trim() && !data.summary?.trim()) return;

      normalizedNotes.push({
        ...data,
        notes,
        text: undefined,
      });

      return;
    }

    const text = data.text ?? data.notes ?? '';
    if (!text.trim()) return;

    normalizedNotes.push({
      ...data,
      mode: 'plain',
      text,
      cue: undefined,
      notes: undefined,
      summary: undefined,
    });
  });

  if (!normalizedNotes.length) {
    throw new Error('Không tìm thấy ghi chú hợp lệ trong file JSON.');
  }

  return normalizedNotes;
}
