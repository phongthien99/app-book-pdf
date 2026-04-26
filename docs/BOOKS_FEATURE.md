# Books Feature

Location:

```text
src/features/books/
```

Pure helpers:

```text
src/features/books/utils/book-slug.ts
```

`BookList` reports selected books through `onSelectBook`. URL/history updates stay in `src/app-shell.tsx`, which uses `createBookSlug` to build `/books/<book-title-slug>`.

On reload, `src/app-shell.tsx` resolves that slug from `useBooksQuery`. This restores localStorage-configured books. Temporary URL-only books and uploaded-file object URLs cannot be restored after reload unless they were saved as configured books.

This feature uses Facade + Hook + DTO + Repository. Components should not import hooks, DTOs, or repositories directly.

## Public UI Entry

```text
src/features/books/components/BookList.tsx
```

Responsibilities:

- Render library toolbar, book cards, loading/error states, and the open PDF dialog.
- Call `useBooksFacade`.
- Pass selected books back through `onSelectBook`.

Allowed imports:

- MUI and icons
- facade types/API
- schema types for props

Avoid:

- importing repositories
- importing DTOs
- importing TanStack Query hooks directly

## Facade

```text
src/features/books/facade/book.facade.ts
src/features/books/facade/book.facade.types.ts
```

Responsibilities:

- Compose query/mutation hooks.
- Own dialog UI state: tab, URL, selected file, config form, errors.
- Expose a single API to the component.
- Convert mutation success into `onSelectBook(book)`.

Current tabs:

- `url`: open a PDF from a direct URL, not persisted.
- `file`: open an uploaded PDF using `URL.createObjectURL`, not persisted.
- `config`: save configured book metadata to localStorage and open it.
- `json`: import many configured books from a JSON file or pasted JSON text, persisted.

## Hooks

```text
src/features/books/hooks/useBooksQuery.ts
src/features/books/hooks/useCreateBookFromUrlMutation.ts
src/features/books/hooks/useCreateBookFromFileMutation.ts
src/features/books/hooks/useCreateBookConfigMutation.ts
src/features/books/hooks/useImportBookConfigsMutation.ts
```

Rules:

- Query hooks wrap `useQuery`.
- Mutation hooks wrap `useMutation`.
- Hooks call DTO parse functions before repository writes when user input is involved.
- Hooks should not hold data source state.

Query key:

```ts
['books']
```

Invalidate this key after changing persisted books.

## DTO

```text
src/features/books/dto/book.dto.ts
```

Responsibilities:

- Parse unknown user input.
- Return typed input inferred from schema.
- Throw Zod errors for invalid input.

Current DTO functions:

- `parseCreateBookFromUrl`
- `parseCreateBookFromFile`
- `parseCreateBookConfig`
- `parseImportBookConfigs`

## Schema

```text
src/features/books/schema/book.schema.ts
```

Defines:

- `BookSchema`
- `BooksSchema`
- `CreateBookFromUrlSchema`
- `CreateBookFromFileSchema`
- `CreateBookConfigSchema`
- `ImportBookConfigsSchema`

Exports inferred TypeScript types used by all layers.

## Repository

```text
src/features/books/repositories/book.repository.ts
```

Responsibilities:

- Own data sources.
- Read/write configured books from localStorage.
- Create object URLs for uploaded files.

Local storage key:

```text
react-mui.books
```

Methods:

- `getAll()`: returns persisted configured books.
- `createFromUrl(input)`: creates an immediate URL book, not persisted.
- `createFromFile(input)`: creates an immediate object-URL book, not persisted.
- `createConfig(input)`: persists a configured book and returns it.
- `createConfigs(inputs)`: persists many configured books and returns them.

## JSON Import Format

The JSON tab accepts either an uploaded `.json` file or JSON pasted directly into the text box.

Supported shape: a plain array:

```json
[
  {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "description": "Software craftsmanship book.",
    "coverUrl": "https://example.com/clean-code.jpg",
    "pdfUrl": "/books/pm/clean-code.pdf"
  },
  {
    "title": "Domain-Driven Design",
    "author": "Eric Evans",
    "description": "",
    "coverUrl": "",
    "pdfUrl": "/books/pm/ddd.pdf"
  }
]
```

Or an object with a `books` array:

```json
{
  "books": [
    {
      "title": "PDF Spec",
      "author": "ISO",
      "description": "",
      "coverUrl": "",
      "pdfUrl": "/books/pm/pdf-spec.pdf"
    }
  ]
}
```

Required fields:

- `title`
- `author`
- `description`
- `coverUrl`
- `pdfUrl`

`coverUrl` can be an empty string. `pdfUrl` can be an absolute URL or a relative path such as `/books/pm/file.pdf`.

## Adding A New Book Operation

1. Add or update Zod schema in `schema/book.schema.ts`.
2. Add parse function in `dto/book.dto.ts`.
3. Add repository method in `repositories/book.repository.ts`.
4. Add one query/mutation hook in `hooks/`.
5. Compose it in `facade/book.facade.ts`.
6. Expose only the needed facade API in `book.facade.types.ts`.
7. Update `components/BookList.tsx` to call the facade only.
8. Run:

```bash
pnpm exec tsc --noEmit
pnpm run build
```

## Common Changes

Change book URL slug behavior:

- Update `utils/book-slug.ts`.
- Keep selection URL updates in `src/app-shell.tsx`.
- Do not put URL/history logic inside `BookList`.

Add another persisted field:

- Update `BookSchema`.
- Update `CreateBookConfigSchema`.
- Add form control in `BookList`.
- Add facade state if the field is user-editable.
- Existing localStorage data may fail schema validation if the new field is required. Prefer defaultable or optional migration behavior.

Add another JSON import shape:

- Update `ImportBookConfigsSchema`.
- Keep the transform returning `CreateBookConfigInput[]`.
- Keep file parsing in `useImportBookConfigsMutation`.
- Keep pasted JSON parsing in `useImportBookConfigsMutation`.
- Keep persistence in `book.repository.ts`.

Clear saved configured books:

- Add repository method that removes `react-mui.books`.
- Add mutation hook that invalidates `['books']`.
- Expose a facade command.
- Add a component button that calls the facade command.
