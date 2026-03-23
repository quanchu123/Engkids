// Dictionary API Service
// Sử dụng Free Dictionary API: https://dictionaryapi.dev/

import { apiRateLimiter } from '@/lib/rate-limit';

export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
}

export interface WordInfo {
  word: string;
  ipa: string;
  audioUrl: string | null;
  definitions: string[];
  examples: string[];
  partOfSpeech: string;
  vietnamese?: string;
}

/**
 * Lấy thông tin từ vựng từ Free Dictionary API với rate limiting
 */
export async function lookupWord(word: string): Promise<WordInfo | null> {
  const normalizedWord = word.toLowerCase().trim();
  
  // Use rate limiter with caching
  return apiRateLimiter.execute(
    `word:${normalizedWord}`,
    async () => {
      try {
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
          {
            // Add timeout
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!response.ok) {
          console.warn(`Word not found: ${normalizedWord}`);
          return null;
        }

        const data: DictionaryEntry[] = await response.json();
        
        if (!data || data.length === 0) {
          return null;
        }

        const entry = data[0];
        
        // Tìm audio URL (ưu tiên US English)
        let audioUrl: string | null = null;
        for (const phonetic of entry.phonetics) {
          if (phonetic.audio) {
            audioUrl = phonetic.audio;
            // Ưu tiên audio US
            if (phonetic.audio.includes('-us')) {
              break;
            }
          }
        }

        // Lấy IPA
        const ipa = entry.phonetic || 
          entry.phonetics.find(p => p.text)?.text || 
          '';

        // Lấy definitions và examples
        const definitions: string[] = [];
        const examples: string[] = [];
        const partOfSpeech = entry.meanings[0]?.partOfSpeech || '';
        
        for (const meaning of entry.meanings) {
          for (const def of meaning.definitions.slice(0, 3)) {
            definitions.push(def.definition);
            if (def.example && examples.length < 3) {
              examples.push(def.example);
            }
          }
        }

        const wordInfo: WordInfo = {
          word: entry.word,
          ipa,
          audioUrl,
          definitions: definitions.slice(0, 2),
          examples: examples.slice(0, 3),
          partOfSpeech,
        };

        return wordInfo;
      } catch (error) {
        console.error(`Error looking up word: ${normalizedWord}`, error);
        return null;
      }
    }
  );
}

/**
 * Lookup nhiều từ cùng lúc với batching
 */
export async function lookupWords(words: string[]): Promise<Map<string, WordInfo>> {
  const results = new Map<string, WordInfo>();
  
  // Fetch all words in parallel using rate limiter
  const promises = words.map(word => 
    lookupWord(word).then(info => {
      if (info) {
        results.set(word.toLowerCase().trim(), info);
      }
    }).catch(err => {
      console.error(`Failed to lookup word: ${word}`, err);
    })
  );

  await Promise.all(promises);
  return results;
}

/**
 * Phát âm từ bằng Web Speech API
 */
export function speakWord(word: string, rate: number = 0.9): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1;

  // Tìm voice English
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en-US')) || 
                  voices.find(v => v.lang.startsWith('en'));
  if (enVoice) {
    utterance.voice = enVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Phát audio từ URL
 */
export function playAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play audio'));
    audio.play().catch(reject);
  });
}

/**
 * Phát âm từ - ưu tiên audio URL, fallback Web Speech
 */
export async function pronounceWord(word: string, audioUrl?: string | null): Promise<void> {
  if (audioUrl) {
    try {
      await playAudio(audioUrl);
      return;
    } catch (error) {
      console.warn('Audio playback failed, falling back to TTS');
    }
  }
  
  speakWord(word);
}
