// Translation Service - Dịch sang tiếng Việt
// Sử dụng MyMemory Translation API (miễn phí)

import { apiRateLimiter } from '@/lib/rate-limit';

export interface TranslationResult {
  vietnamese: string;
  success: boolean;
}

/**
 * Dịch từ tiếng Anh sang tiếng Việt
 * Sử dụng MyMemory API (miễn phí, không cần API key)
 */
export async function translateToVietnamese(word: string): Promise<TranslationResult> {
  const normalizedWord = word.toLowerCase().trim();
  
  return apiRateLimiter.execute(
    `translate:${normalizedWord}`,
    async () => {
      try {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(normalizedWord)}&langpair=en|vi`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!response.ok) {
          return { vietnamese: '', success: false };
        }

        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          return {
            vietnamese: data.responseData.translatedText,
            success: true
          };
        }

        return { vietnamese: '', success: false };
      } catch (error) {
        console.error(`Translation error for: ${normalizedWord}`, error);
        return { vietnamese: '', success: false };
      }
    }
  );
}
