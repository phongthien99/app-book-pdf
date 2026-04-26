import {
  TranslatePdfTextSchema,
  type TranslatePdfTextInput,
} from '../schema/pdf-translation.schema';

export function parseTranslatePdfText(rawInput: unknown): TranslatePdfTextInput {
  return TranslatePdfTextSchema.parse(rawInput);
}
