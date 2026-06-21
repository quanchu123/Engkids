'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { pronounceWord } from '@/services/dictionary';
import { getSupabaseClient } from '@/lib/auth-client';
import { getWordsForReview, submitReview, VocabularyItem } from '@/services/vocabulary';
import Header from '@/components/layout/Header';
import PronunciationPractice from '@/components/learning/PronunciationPractice';
import { SavedWord } from '@/types';

const QUALITY_RESPONSES = [
  { label: 'Không nhớ', quality: 0, color: 'from-red-400 to-red-500' },
  { label: 'Khó nhớ', quality: 2, color: 'from-orange-400 to-orange-500' },
  { label: 'Nhớ', quality: 3, color: 'from-yellow-400 to-yellow-500' },
  { label: 'Dễ dàng', quality: 4, color: 'from-green-400 to-green-500' },
  { label: 'Quá dễ', quality: 5, color: 'from-emerald-400 to-emerald-500' },
];

const MASTERY_LABELS: Record<number, { label: string; bgClass: string; textClass: string }> = {
  0: { label: 'Mới', bgClass: 'bg-gray-100', textClass: 'text-gray-600' },
  1: { label: 'Đang học', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
  2: { label: 'Quen thuộc', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  3: { label: 'Nhớ tốt', bgClass: 'bg-orange-100', textClass: 'text-orange-600' },
  4: { label: 'Rất tốt', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
  5: { label: 'Thành thạo', bgClass: 'bg-green-100', textClass: 'text-green-600' },
};

// Mode of the review session.
// - 'loading': detecting auth / loading due words
// - 'srs': logged-in user, server-side spaced repetition (due-based)
// - 'local': guest fallback using local savedWords
type ReviewMode = 'loading' | 'srs' | 'local';

// Normalized view model the flashcard renders, regardless of source.
interface CardView {
  word: string;
  vi: string;
  ipa?: string;
  exampleSentence?: string;
  masteryLevel: number;
}

export default function ReviewPage() {
  const { progress, updateWordMastery } = useAppStore();

  const [mode, setMode] = useState<ReviewMode>('loading');

  // SRS (logged-in) state
  const [srsWords, setSrsWords] = useState<VocabularyItem[]>([]);
  const [srsError, setSrsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local (guest) state
  const [localWords, setLocalWords] = useState<SavedWord[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  // Optional, non-blocking pronunciation practice panel toggle (per flipped card).
  const [showPractice, setShowPractice] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    reviewed: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  // On mount: detect auth and choose mode. SRS for logged-in users, local fallback otherwise.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          // Logged-in → load due words via SRS service.
          try {
            const words = await getWordsForReview(20);
            if (cancelled) return;
            setSrsWords(words);
            setSessionStats((prev) => ({ ...prev, total: words.length }));
            setMode('srs');
          } catch (err) {
            // SRS load failed (network/table missing) → fall back to local mode safely.
            console.error('Failed to load review words, falling back to local mode:', err);
            if (cancelled) return;
            setMode('local');
          }
        } else {
          setMode('local');
        }
      } catch (err) {
        // Any unexpected auth error → never crash, fall back to local.
        console.error('Auth detection failed, falling back to local mode:', err);
        if (cancelled) return;
        setMode('local');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Local mode: keep existing behavior — sort savedWords by mastery then lastReviewedAt.
  useEffect(() => {
    if (mode !== 'local') return;

    const wordsToReview = [...progress.savedWords].sort((a, b) => {
      const masteryDiff = (a.masteryLevel || 0) - (b.masteryLevel || 0);
      if (masteryDiff !== 0) return masteryDiff;

      const aReviewed = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const bReviewed = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      return aReviewed - bReviewed;
    });

    setLocalWords(wordsToReview);
    setSessionStats((prev) => ({ ...prev, total: wordsToReview.length }));
  }, [progress.savedWords, mode]);

  const totalCount = mode === 'srs' ? srsWords.length : localWords.length;
  const currentItem = mode === 'srs' ? srsWords[currentIndex] : undefined;
  const currentLocalWord = mode === 'local' ? localWords[currentIndex] : undefined;

  // Map the active source row to the shared card view model.
  const currentCard: CardView | undefined = mode === 'srs'
    ? (currentItem
      ? {
          word: currentItem.word,
          vi: currentItem.meaningVi,
          ipa: currentItem.pronunciation,
          exampleSentence: currentItem.exampleSentence,
          masteryLevel: currentItem.masteryLevel,
        }
      : undefined)
    : (currentLocalWord
      ? {
          word: currentLocalWord.word,
          vi: currentLocalWord.vi,
          ipa: currentLocalWord.ipa,
          exampleSentence: currentLocalWord.exampleSentence,
          masteryLevel: currentLocalWord.masteryLevel || 0,
        }
      : undefined);

  const calculateNewMastery = (currentLevel: number, quality: number): 0 | 1 | 2 | 3 | 4 | 5 => {
    if (quality < 2) {
      return Math.max(0, currentLevel - 1) as 0 | 1 | 2 | 3 | 4 | 5;
    }
    if (quality >= 4) {
      return Math.min(5, currentLevel + 1) as 0 | 1 | 2 | 3 | 4 | 5;
    }
    return currentLevel as 0 | 1 | 2 | 3 | 4 | 5;
  };

  const advance = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowPractice(false);
    } else {
      setIsComplete(true);
    }
  };

  const recordStats = (quality: number) => {
    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
    }));
  };

  // Local (guest) flow — unchanged behavior: calculateNewMastery + updateWordMastery.
  const handleLocalResponse = (quality: number) => {
    if (!currentLocalWord) return;

    const currentMastery = currentLocalWord.masteryLevel || 0;
    const newMastery = calculateNewMastery(currentMastery, quality);

    updateWordMastery(currentLocalWord.word, newMastery);

    recordStats(quality);
    advance();
  };

  // SRS flow — submit quality to the server, then advance. On failure keep progress.
  const handleSrsResponse = async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!currentItem || submitting) return;

    setSubmitting(true);
    setSrsError(null);

    try {
      const result = await submitReview(currentItem.id, quality);
      if (!result) {
        setSrsError('Không lưu được kết quả ôn, nhưng bạn vẫn có thể tiếp tục.');
      }
    } catch (err) {
      console.error('submitReview failed:', err);
      setSrsError('Không lưu được kết quả ôn, nhưng bạn vẫn có thể tiếp tục.');
    }

    // Update stats and advance regardless of save outcome so progress is never lost.
    recordStats(quality);
    advance();
    setSubmitting(false);
  };

  const handleResponse = (quality: number) => {
    if (mode === 'srs') {
      void handleSrsResponse(quality as 0 | 1 | 2 | 3 | 4 | 5);
    } else {
      handleLocalResponse(quality);
    }
  };

  const handlePronounce = () => {
    if (currentCard) {
      pronounceWord(currentCard.word);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowPractice(false);
    setIsComplete(false);
    setSrsError(null);
    setSessionStats({
      total: totalCount,
      correct: 0,
      incorrect: 0,
      reviewed: 0,
    });
  };

  // Loading state while detecting auth / fetching due words.
  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Đang chuẩn bị phiên ôn tập...</p>
        </main>
      </div>
    );
  }

  // SRS empty state: no words due today (Requirement 2.3).
  if (mode === 'srs' && srsWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Hôm nay không có từ cần ôn</h1>
            <p className="text-gray-500 mb-6">
              Tuyệt vời! Bạn đã ôn hết các từ đến hạn. Hãy đọc truyện hoặc xem video để thêm từ mới
              vào lịch ôn tập nhé.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/stories"
                className="inline-block px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
              >
                Đọc truyện
              </Link>
              <Link
                href="/videos"
                className="inline-block px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors"
              >
                Xem video
              </Link>
              <Link
                href="/progress"
                className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                ← Quay lại
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Local empty state: guest with no saved words.
  if (mode === 'local' && localWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-sm">
            <div className="text-6xl mb-4">0</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Chưa có từ vựng nào</h1>
            <p className="text-gray-500 mb-6">Hãy lưu từ vựng khi đọc truyện để bắt đầu ôn tập.</p>
            <Link
              href="/stories"
              className="inline-block px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
            >
              Đọc truyện ngay
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Hoàn thành</h1>
            <p className="text-gray-500 mb-6">Bạn đã ôn tập xong {sessionStats.reviewed} từ</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-600">{sessionStats.correct}</div>
                <div className="text-sm text-green-600">Đúng</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-600">{sessionStats.incorrect}</div>
                <div className="text-sm text-red-600">Cần ôn lại</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-600">{accuracy}%</div>
                <div className="text-sm text-purple-600">Độ chính xác</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={restartSession}
                className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
              >
                Ôn tập lại
              </button>
              <Link
                href="/progress"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                ← Quay lại
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const masteryInfo = MASTERY_LABELS[currentCard?.masteryLevel || 0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Guest banner: invite login to unlock smart review (SRS) */}
        {mode === 'local' && (
          <div className="mb-6 bg-white border border-purple-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <p className="text-sm text-gray-600">
              Đăng nhập để mở khóa ôn tập thông minh (Spaced Repetition) — chỉ ôn đúng từ đến hạn.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors whitespace-nowrap"
            >
              Đăng nhập
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <Link href="/progress" className="text-gray-500 hover:text-gray-700">
            ← Quay lại
          </Link>
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {totalCount}
          </div>
        </div>

        {/* Session progress: reviewed / total due */}
        {mode === 'srs' && (
          <p className="text-xs text-gray-400 mb-4">
            Đã ôn {sessionStats.reviewed} / {totalCount} từ đến hạn
          </p>
        )}

        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
          />
        </div>

        {srsError && (
          <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-xl px-4 py-3">
            {srsError}
          </div>
        )}

        <div onClick={() => setIsFlipped(!isFlipped)} className="relative w-full aspect-[3/2] cursor-pointer perspective-1000 mb-8">
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden shadow-xl ${isFlipped ? 'invisible' : ''}`}>
              <div className="text-white/50 text-sm mb-2">Từ vựng</div>
              <h2 className="text-4xl font-bold text-white mb-4">{currentCard?.word}</h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePronounce();
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Nghe phát âm
              </button>
              <div className="absolute bottom-4 text-white/50 text-sm">Nhấp để xem nghĩa</div>
            </div>

            <div
              className={`absolute inset-0 bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl ${!isFlipped ? 'invisible' : ''}`}
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className="text-gray-400 text-sm mb-2">Nghĩa tiếng Việt</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{currentCard?.vi}</h2>
              {currentCard?.ipa && <p className="text-gray-400 text-lg mb-4">/{currentCard.ipa}/</p>}
              {currentCard?.exampleSentence && (
                <p className="text-gray-500 italic text-center">&quot;{currentCard.exampleSentence}&quot;</p>
              )}
              <div className={`mt-4 px-3 py-1 rounded-full text-sm ${masteryInfo.bgClass} ${masteryInfo.textClass}`}>
                {masteryInfo.label}
              </div>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="space-y-4">
            <p className="text-center text-gray-500 mb-4">Bạn nhớ từ này như thế nào?</p>
            <div className="grid grid-cols-5 gap-2">
              {QUALITY_RESPONSES.map((response) => (
                <button
                  key={response.quality}
                  onClick={() => handleResponse(response.quality)}
                  disabled={submitting}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-br ${response.color} text-white hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100`}
                >
                  <span className="text-xs font-medium">{response.label}</span>
                </button>
              ))}
            </div>

            {/* Optional, non-blocking pronunciation practice. Does not affect SRS submit/advance. */}
            {currentCard && (
              <div className="pt-2">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPractice((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-purple-600 font-bold border-2 border-purple-200 hover:bg-purple-50 hover:scale-105 active:scale-95 transition-transform shadow-sm"
                  >
                    {showPractice ? 'Đóng luyện nói ✖' : 'Luyện nói 🎤'}
                  </button>
                </div>

                {showPractice && (
                  <div className="mt-4">
                    <PronunciationPractice
                      key={currentCard.word}
                      word={currentCard.word}
                      ipa={currentCard.ipa}
                      meaningVi={currentCard.vi}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Đúng: {sessionStats.correct}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-gray-600">Sai: {sessionStats.incorrect}</span>
          </div>
        </div>
      </main>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
