import { useCallback, useMemo } from 'react';

import { useTranslatePdfTextMutation } from '../hooks/useTranslatePdfTextMutation';
import type {
  PdfTranslationLanguage,
  PdfTranslationResult,
} from '../schema/pdf-translation.schema';

interface UsePdfTranslationFacadeParams {
  targetLanguage?: PdfTranslationLanguage;
}

function getLanguageLabel(language: PdfTranslationLanguage) {
  return language === 'vi' ? 'Tiếng Việt' : 'English';
}

function escapeMarkdownTableCell(value: string) {
  return value.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

export function formatBilingualPdfNote(result: PdfTranslationResult) {
  return [
    `| ${getLanguageLabel(result.sourceLanguage)} | ${getLanguageLabel(result.targetLanguage)} |`,
    '|---|---|',
    `| ${escapeMarkdownTableCell(result.sourceText)} | ${escapeMarkdownTableCell(result.translatedText)} |`,
  ].join('\n');
}

export function usePdfTranslationFacade({ targetLanguage = 'vi' }: UsePdfTranslationFacadeParams = {}) {
  const translateMutation = useTranslatePdfTextMutation();

  const translateText = useCallback(
    (text: string) =>
      translateMutation.mutateAsync({
        text,
        targetLanguage,
      }),
    [targetLanguage, translateMutation],
  );

  return useMemo(
    () => ({
      translateText,
      translating: translateMutation.isPending,
      errorMessage: translateMutation.error?.message ?? null,
      reset: translateMutation.reset,
    }),
    [translateMutation.error?.message, translateMutation.isPending, translateMutation.reset, translateText],
  );
}
