import {
  CreateBookConfigSchema,
  CreateBookFromFileSchema,
  CreateBookFromUrlSchema,
  ImportBookConfigsSchema,
  type CreateBookConfigInput,
  type CreateBookFromFileInput,
  type CreateBookFromUrlInput,
  type ImportBookConfigsInput,
} from '../schema/book.schema';

export function parseCreateBookFromUrl(rawInput: unknown): CreateBookFromUrlInput {
  return CreateBookFromUrlSchema.parse(rawInput);
}

export function parseCreateBookFromFile(rawInput: unknown): CreateBookFromFileInput {
  return CreateBookFromFileSchema.parse(rawInput);
}

export function parseCreateBookConfig(rawInput: unknown): CreateBookConfigInput {
  return CreateBookConfigSchema.parse(rawInput);
}

export function parseImportBookConfigs(rawInput: unknown): ImportBookConfigsInput {
  return ImportBookConfigsSchema.parse(rawInput);
}
