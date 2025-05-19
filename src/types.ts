export interface DeepLTranslationRequestPayload {
  text: string;
  targetLang: string;
  sourceLang?: string;
}
export interface DeepLTranslationResponsePayload {
  success: boolean;
  translatedText?: string;
  error?: string;
  status?: number;
}
