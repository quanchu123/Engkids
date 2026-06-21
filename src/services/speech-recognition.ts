/**
 * Speech recognition service — SSR-safe wrapper around the Web Speech API.
 *
 * Captures a single spoken utterance from the microphone and resolves with the
 * best transcript. All browser access is guarded so importing this module on
 * the server (or in unsupported browsers like Safari/iOS) never throws.
 *
 * Pairs with `src/lib/pronunciation.ts` (scoring) and the TTS helpers in
 * `src/services/dictionary.ts` (the "listen to the model" side).
 */

// ---------------------------------------------------------------------------
// Minimal Web Speech API typings.
// The DOM lib doesn't ship SpeechRecognition types, so we declare just enough
// to use it without scattering `any` everywhere.
// ---------------------------------------------------------------------------

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
  onnomatch: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Typed error codes surfaced by {@link listenOnce}. */
export type SpeechErrorCode =
  | 'unsupported'
  | 'no-speech'
  | 'timeout'
  | 'aborted'
  | 'not-allowed'
  | 'error';

/** Error thrown/rejected by {@link listenOnce}. */
export class SpeechRecognitionError extends Error {
  readonly code: SpeechErrorCode;
  constructor(code: SpeechErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SpeechRecognitionError';
    this.code = code;
  }
}

export interface ListenOptions {
  /** BCP-47 language tag. Defaults to 'en-US'. */
  lang?: string;
  /** Max time to wait for a result before timing out. Defaults to 8000ms. */
  timeoutMs?: number;
}

export interface ListenResult {
  transcript: string;
  confidence: number;
}

/**
 * Resolve the SpeechRecognition constructor in a browser, or `undefined`.
 * Guarded by `typeof window` so it is safe during SSR.
 */
function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Feature-detect Web Speech recognition support (SSR-safe). */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== undefined;
}

/**
 * Listen for a single spoken utterance and resolve with the best transcript.
 *
 * Starts recognition (single-shot, no interim results, up to 3 alternatives),
 * auto-stops, cleans up all handlers, and rejects with a
 * {@link SpeechRecognitionError} on error / no-speech / timeout. Recognition is
 * never left running.
 */
export function listenOnce(opts: ListenOptions = {}): Promise<ListenResult> {
  const { lang = 'en-US', timeoutMs = 8000 } = opts;

  return new Promise<ListenResult>((resolve, reject) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new SpeechRecognitionError('unsupported', 'SpeechRecognition is not supported in this browser.'));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onnomatch = null;
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      // Ensure recognition is never left running.
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      fn();
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      // Pick the alternative with the highest confidence from the first result.
      const result = event.results[event.resultIndex] ?? event.results[0];
      let best: SpeechRecognitionAlternative | undefined;
      if (result) {
        for (let i = 0; i < result.length; i++) {
          const alt = result[i];
          if (!best || alt.confidence > best.confidence) {
            best = alt;
          }
        }
      }

      if (!best || !best.transcript) {
        finish(() => reject(new SpeechRecognitionError('no-speech', 'No speech was detected.')));
        return;
      }

      const transcript = best.transcript;
      const confidence = best.confidence;
      finish(() => resolve({ transcript, confidence }));
    };

    recognition.onnomatch = () => {
      finish(() => reject(new SpeechRecognitionError('no-speech', 'Speech was not recognized.')));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const raw = event.error;
      let code: SpeechErrorCode = 'error';
      if (raw === 'no-speech') code = 'no-speech';
      else if (raw === 'aborted') code = 'aborted';
      else if (raw === 'not-allowed' || raw === 'service-not-allowed') code = 'not-allowed';
      finish(() => reject(new SpeechRecognitionError(code, event.message || raw)));
    };

    recognition.onend = () => {
      // If recognition ended without producing a result, treat as no-speech.
      finish(() => reject(new SpeechRecognitionError('no-speech', 'Recognition ended without a result.')));
    };

    timer = setTimeout(() => {
      finish(() => reject(new SpeechRecognitionError('timeout', 'Listening timed out.')));
    }, timeoutMs);

    try {
      recognition.start();
    } catch (err) {
      finish(() =>
        reject(
          new SpeechRecognitionError(
            'error',
            err instanceof Error ? err.message : 'Failed to start recognition.'
          )
        )
      );
    }
  });
}
