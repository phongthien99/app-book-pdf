# Conventions

## Architecture

Feature code should use this layer order:

```text
Component -> Facade -> Hooks -> DTO -> Repository
                    -> Schema
```

Rules:

- Components call facade hooks only.
- Components do not import feature repositories, DTOs, or TanStack Query hooks.
- DTOs validate user input with Zod.
- Repositories own data source details.
- Hooks do one thing: fetch or mutate.
- Facades orchestrate hooks and UI-facing feature state.

## File Naming

Use lowercase feature filenames:

```text
schema/book.schema.ts
dto/book.dto.ts
repositories/book.repository.ts
facade/book.facade.ts
facade/book.facade.types.ts
hooks/useBooksQuery.ts
hooks/useCreateBookConfigMutation.ts
```

Hook suffixes:

- `Query` for `useQuery`.
- `Mutation` for `useMutation`.

## Type Rules

- Export inferred types from schema files.
- Prefer `type` imports when importing only TypeScript types.
- Keep `tsconfig` strict clean.
- Avoid `NodeJS.*` browser timer types; use `ReturnType<typeof setTimeout>`.

## UI Rules

- Keep feature components mostly presentational.
- Use MUI components and icons already used in the app.
- Use concise Vietnamese labels where the existing UI already uses Vietnamese.
- Do not put data fetching or validation logic in UI components.

## Data Rules

- Persisted configured books live in localStorage key `react-mui.books`.
- Uploaded files use object URLs and are not persisted.
- Direct URL books opened from the quick URL tab are not persisted.
- JSON imports persist many configured books at once. They support both uploaded files and pasted JSON text.

## Verification Checklist

Run:

```bash
pnpm exec tsc --noEmit
pnpm run build
```

Known issue:

```bash
pnpm run lint
```

This currently fails because ESLint 9 requires `eslint.config.js`, and the repo does not have one yet.
