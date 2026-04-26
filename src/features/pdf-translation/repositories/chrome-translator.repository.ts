import type {
  PdfTranslationLanguage,
  PdfTranslationResult,
  TranslatePdfTextInput,
} from '../schema/pdf-translation.schema';

type ChromeTranslationAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

type ChromeTranslatorInstance = {
  translate(text: string): Promise<string>;
  destroy?: () => void;
};

type ChromeTranslator = {
  availability(options: {
    sourceLanguage: PdfTranslationLanguage;
    targetLanguage: PdfTranslationLanguage;
  }): Promise<ChromeTranslationAvailability>;
  create(options: {
    sourceLanguage: PdfTranslationLanguage;
    targetLanguage: PdfTranslationLanguage;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<ChromeTranslatorInstance>;
};

type ChromeLanguageDetectionResult = {
  detectedLanguage: string;
  confidence: number;
};

type ChromeLanguageDetectorInstance = {
  detect(text: string): Promise<ChromeLanguageDetectionResult[]>;
  destroy?: () => void;
};

type ChromeLanguageDetector = {
  availability(): Promise<ChromeTranslationAvailability>;
  create(): Promise<ChromeLanguageDetectorInstance>;
};

function getChromeTranslator(): ChromeTranslator | null {
  const candidate = (globalThis as { Translator?: ChromeTranslator }).Translator;

  return candidate ?? null;
}

function getChromeLanguageDetector(): ChromeLanguageDetector | null {
  const candidate = (globalThis as { LanguageDetector?: ChromeLanguageDetector }).LanguageDetector;

  return candidate ?? null;
}

function normalizeDetectedLanguage(value: string): PdfTranslationLanguage | null {
  const baseLanguage = value.toLowerCase().split('-')[0];

  return baseLanguage === 'vi' || baseLanguage === 'en' ? baseLanguage : null;
}

async function detectLanguage(text: string, fallbackLanguage: PdfTranslationLanguage) {
  const detectorApi = getChromeLanguageDetector();
  if (!detectorApi) return fallbackLanguage;

  try {
    const availability = await detectorApi.availability();
    if (availability === 'unavailable') return fallbackLanguage;

    const detector = await detectorApi.create();
    const detections = await detector.detect(text);
    detector.destroy?.();

    const detectedLanguage = detections
      .filter((result) => result.confidence >= 0.5)
      .map((result) => normalizeDetectedLanguage(result.detectedLanguage))
      .find((language): language is PdfTranslationLanguage => Boolean(language));

    return detectedLanguage ?? fallbackLanguage;
  } catch {
    return fallbackLanguage;
  }
}

function getTargetLanguage(sourceLanguage: PdfTranslationLanguage, requestedTarget: PdfTranslationLanguage) {
  return sourceLanguage === requestedTarget ? (sourceLanguage === 'vi' ? 'en' : 'vi') : requestedTarget;
}

function getUnavailableMessage(availability: ChromeTranslationAvailability) {
  if (availability === 'unavailable') {
    return 'Chrome hiện tại chưa hỗ trợ cặp ngôn ngữ này. Hãy cập nhật Chrome hoặc dùng cấu hình API dịch khác.';
  }

  return 'Không thể khởi tạo Chrome Translator API.';
}

export const chromeTranslatorRepository = {
  async translate(input: TranslatePdfTextInput): Promise<PdfTranslationResult> {
    const translatorApi = getChromeTranslator();

    if (!translatorApi) {
      throw new Error('Trình duyệt hiện tại chưa hỗ trợ Chrome Translator API.');
    }

    const sourceLanguage =
      input.sourceLanguage ?? (await detectLanguage(input.text, input.targetLanguage === 'vi' ? 'en' : 'vi'));
    const targetLanguage = getTargetLanguage(sourceLanguage, input.targetLanguage);
    const availability = await translatorApi.availability({ sourceLanguage, targetLanguage });

    if (availability === 'unavailable') {
      throw new Error(getUnavailableMessage(availability));
    }

    const translator = await translatorApi.create({ sourceLanguage, targetLanguage });
    const translatedText = await translator.translate(input.text);
    translator.destroy?.();

    return {
      sourceLanguage,
      targetLanguage,
      sourceText: input.text,
      translatedText,
    };
  },
};
