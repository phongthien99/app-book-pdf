import { useMutation } from '@tanstack/react-query';

import { parseTranslatePdfText } from '../dto/pdf-translation.dto';
import { chromeTranslatorRepository } from '../repositories/chrome-translator.repository';
import type { TranslatePdfTextInput } from '../schema/pdf-translation.schema';

export function useTranslatePdfTextMutation() {
  return useMutation({
    mutationFn: async (rawInput: TranslatePdfTextInput) => {
      const input = parseTranslatePdfText(rawInput);

      return chromeTranslatorRepository.translate(input);
    },
  });
}
