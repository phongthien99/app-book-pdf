# Project Map

Use this file as the first stop before scanning the repository.

## Entry Points

```text
src/main.tsx
```

Creates the React root and wraps the app with:

- `QueryClientProvider`
- MUI `ThemeProvider`
- `CssBaseline`

```text
src/app-shell.tsx
```

Owns `selectedBook` state.

- If `selectedBook === null`, renders `BookList`.
- If a book is selected, renders `App` from `src/application.tsx`.
- The selected book type comes from `src/features/books/schema/book.schema.ts`.
- Selecting a book pushes URL path `/books/<book-title-slug>`.
- Reloading a book URL resolves the slug from books returned by `useBooksQuery`.
- Viewer back clears the selected book and returns to `/`.

```text
src/application.tsx
```

PDF viewer screen.

- Receives `pdfUrl`, `title`, and `onBack`.
- Uses `react-pdf` `Document` and `Page`.
- Handles page count, current page, zoom, custom outline drawer with page numbers, PDF right-click note menu, lazy page rendering, and scroll page chip.
- Renders the PDF notes feature from `src/features/pdf-notes/components/PdfNotesDrawer.tsx`.

## Feature Areas

```text
src/features/books/
```

Book library feature. See `docs/BOOKS_FEATURE.md`.

```text
src/features/pdf-notes/
```

PDF notes feature.

- Follows Component -> Facade -> Hooks -> DTO -> Repository / Schema.
- Supports plain notes, Cornell notes, Markdown copy, JSON export/import, and page navigation.
- Persists notes in localStorage per `pdfUrl` using keys prefixed with `react-mui.pdf-notes.`.

```text
src/components/
```

Shared viewer UI components from the original example. Some are not used by the current `react-pdf` viewer screen but are kept in the repo.

```text
src/hooks/
```

Shared hooks. Currently contains `use-is-mobile`.

```text
src/pages/
```

Page-level compatibility exports. `src/pages/book-list.tsx` only re-exports the feature component.

## Important Current State

- The active PDF viewer path is `src/application.tsx`, not the older EmbedPDF plugin component set.
- The book list should be changed under `src/features/books`, not under `src/pages`.
- Book URL slug generation lives in `src/features/books/utils/book-slug.ts`.
- Do not reintroduce `src/data/books.ts`; book data belongs in the repository layer.
- `pnpm run lint` needs ESLint 9 flat config before it can be used.

## Verification

Run these after changes:

```bash
pnpm exec tsc --noEmit
pnpm run build
```

If touching app startup, query providers, or PDF loading, also run the Vite dev server and test:

- library renders
- URL PDF opens
- configured book persists after reload
- PDF notes save, reload, navigate by page, and delete
