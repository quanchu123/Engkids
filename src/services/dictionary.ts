// Dictionary API Service
// Sử dụng Free Dictionary API: https://dictionaryapi.dev/

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
  partOfSpeech: string;
}

// Cache để tránh gọi API nhiều lần
const wordCache = new Map<string, WordInfo>();

/**
 * Lấy thông tin từ vựng từ Free Dictionary API
 */
export async function lookupWord(word: string): Promise<WordInfo | null> {
  const normalizedWord = word.toLowerCase().trim();
  
  // Check cache first
  if (wordCache.has(normalizedWord)) {
    return wordCache.get(normalizedWord)!;
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`
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

    // Lấy definitions
    const definitions: string[] = [];
    const partOfSpeech = entry.meanings[0]?.partOfSpeech || '';
    
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions.slice(0, 2)) {
        definitions.push(def.definition);
      }
    }

    const wordInfo: WordInfo = {
      word: entry.word,
      ipa,
      audioUrl,
      definitions: definitions.slice(0, 3),
      partOfSpeech,
    };

    // Save to cache
    wordCache.set(normalizedWord, wordInfo);

    return wordInfo;
  } catch (error) {
    console.error(`Error looking up word: ${normalizedWord}`, error);
    return null;
  }
}

/**
 * Lookup nhiều từ cùng lúc
 */
export async function lookupWords(words: string[]): Promise<Map<string, WordInfo>> {
  const results = new Map<string, WordInfo>();
  
  // Lọc từ đã có trong cache
  const wordsToFetch = words.filter(w => !wordCache.has(w.toLowerCase().trim()));
  
  // Thêm từ cache
  for (const word of words) {
    const cached = wordCache.get(word.toLowerCase().trim());
    if (cached) {
      results.set(word.toLowerCase().trim(), cached);
    }
  }

  // Fetch từ còn thiếu (với rate limiting)
  for (const word of wordsToFetch) {
    const info = await lookupWord(word);
    if (info) {
      results.set(word.toLowerCase().trim(), info);
    }
    // Rate limit: chờ 100ms giữa các request
    await new Promise(resolve => setTimeout(resolve, 100));
  }

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
