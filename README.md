# React MUI PDF Library

React 18 + MUI PDF reader app. The first screen is a small book library; selecting a book opens the PDF viewer. Books can come from a direct PDF URL, an uploaded file, a saved local configuration, or a JSON import.

The viewer includes a local PDF notes sidebar. Notes are saved per PDF in localStorage and can jump back to their source page. Right-click inside the PDF to add a note from the page context menu. Notes support plain and Cornell formats, Markdown copy, and JSON export/import.

## Quick Start

```bash
pnpm install
pnpm run dev
```

Useful commands:

```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm run lint
```

Notes:

- `pnpm run build` is the reliable production verification command.
- `pnpm run lint` currently fails until an ESLint 9 `eslint.config.js` is added.
- Vite may warn about large chunks because the PDF viewer dependencies are heavy.

## Current App Flow

```text
src/main.tsx
  -> QueryClientProvider + MUI ThemeProvider
  -> src/app-shell.tsx
      -> BookList when no book is selected
      -> application.tsx PDF viewer when a book is selected
```

Main files:

- `src/main.tsx`: React root, TanStack Query provider, MUI theme.
- `src/app-shell.tsx`: owns selected book state and switches between library and viewer.
- `src/application.tsx`: PDF viewer implementation using `react-pdf`.
- `src/features/pdf-notes/components/PdfNotesDrawer.tsx`: PDF notes UI backed by the notes facade.
- `src/features/books/components/BookList.tsx`: book library UI.
- `src/pages/book-list.tsx`: compatibility re-export for old imports.
- Selecting a book updates the URL to `/books/<book-title-slug>`.
- Reloading a book URL restores matching localStorage books.

## Books Feature

Feature code follows the Facade + Hook + DTO + Repository pattern.

```text
UI Component
  -> Facade
      -> Hooks
          -> DTO
              -> Schema
          -> Repository
```

Folder:

```text
src/features/books/
├── components/      # Dumb UI components. Components call facade only.
├── facade/          # Single public API for the UI.
├── hooks/           # TanStack Query hooks. One responsibility per hook.
├── dto/             # Zod parsing/validation functions.
├── schema/          # Zod schemas and inferred TypeScript types.
├── utils/           # Pure helpers, such as book title slug generation.
└── repositories/    # Data source: localStorage and object URLs.
```

The PDF notes feature follows the same shape under `src/features/pdf-notes/`.

Book sources:

- Configured books are saved in `localStorage` under `react-mui.books`.
- URL-only books and uploaded-file books are opened immediately and are not persisted.
- Configured books are persisted and reloaded into the library.
- JSON imports can add many configured books at once and are persisted. JSON can be uploaded as a file or pasted directly in the UI.

## Local Docs

Read these before making changes:

- `docs/PROJECT_MAP.md`: project entry points and where things live.
- `docs/BOOKS_FEATURE.md`: books feature architecture, data flow, and extension guide.
- `docs/CONVENTIONS.md`: repo conventions and verification checklist.

## Dependencies

Core UI/runtime:

- React 18
- MUI 7
- `react-pdf`
- TanStack Query
- Zod

The project also includes several `@embedpdf/*` packages from the original example. The active viewer in `src/application.tsx` currently uses `react-pdf`.

## License

MIT.
