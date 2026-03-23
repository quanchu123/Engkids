'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';

interface Question {
  sentence: string;
  answer: string;
  options: string[];
  hint: string;
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

const QUESTIONS_BY_DIFFICULTY: Record<Difficulty, Question[]> = {
  beginner: [
    { sentence: 'The ___ is big.', answer: 'dog', options: ['dog', 'cat', 'ant', 'bee'], hint: 'Con chó' },
    { sentence: 'The ___ can fly.', answer: 'bird', options: ['bird', 'cat', 'dog', 'fish'], hint: 'Con chim' },
    { sentence: 'The ___ can swim.', answer: 'fish', options: ['fish', 'cat', 'dog', 'bird'], hint: 'Con cá' },
    { sentence: 'I eat a red ___.', answer: 'apple', options: ['apple', 'cake', 'egg', 'fish'], hint: 'Quả táo' },
    { sentence: 'I drink ___ every day.', answer: 'water', options: ['water', 'milk', 'juice', 'tea'], hint: 'Nước' },
    { sentence: 'The ___ is hot.', answer: 'sun', options: ['sun', 'moon', 'snow', 'ice'], hint: 'Mặt trời' },
    { sentence: 'The ___ is blue.', answer: 'sky', options: ['sky', 'tree', 'grass', 'fire'], hint: 'Bầu trời' },
    { sentence: 'I read a ___.', answer: 'book', options: ['book', 'pen', 'cup', 'hat'], hint: 'Quyển sách' },
    { sentence: 'I use a ___ to write.', answer: 'pen', options: ['pen', 'dog', 'cat', 'tree'], hint: 'Cây bút' },
    { sentence: 'The ___ is sweet.', answer: 'cake', options: ['cake', 'salt', 'rock', 'wood'], hint: 'Bánh ngọt' },
    { sentence: 'I love my ___.', answer: 'mom', options: ['mom', 'dad', 'cat', 'dog'], hint: 'Mẹ' },
    { sentence: 'The ___ is green.', answer: 'grass', options: ['grass', 'sky', 'sun', 'snow'], hint: 'Cỏ' },
    { sentence: 'I wear a ___.', answer: 'hat', options: ['hat', 'rock', 'tree', 'fish'], hint: 'Mũ' },
    { sentence: 'I sit on a ___.', answer: 'chair', options: ['chair', 'tree', 'rock', 'fish'], hint: 'Cái ghế' },
    { sentence: 'I sleep on a ___.', answer: 'bed', options: ['bed', 'tree', 'rock', 'fish'], hint: 'Cái giường' },
    { sentence: 'I drink hot ___.', answer: 'tea', options: ['tea', 'ice', 'snow', 'rain'], hint: 'Trà' },
    { sentence: 'The ___ is white.', answer: 'snow', options: ['snow', 'fire', 'grass', 'sky'], hint: 'Tuyết' },
    { sentence: 'I eat a yellow ___.', answer: 'banana', options: ['banana', 'apple', 'grape', 'plum'], hint: 'Quả chuối' },
    { sentence: 'I go to ___ every day.', answer: 'school', options: ['school', 'car', 'dog', 'pen'], hint: 'Trường học' },
    { sentence: 'I play with a ___.', answer: 'ball', options: ['ball', 'rock', 'tree', 'fish'], hint: 'Quả bóng' },
    { sentence: 'The ___ falls.', answer: 'rain', options: ['rain', 'tree', 'rock', 'car'], hint: 'Mưa' },
    { sentence: 'I see a beautiful ___.', answer: 'flower', options: ['flower', 'rock', 'pen', 'car'], hint: 'Bông hoa' },
    { sentence: 'I live in a ___.', answer: 'house', options: ['house', 'car', 'dog', 'pen'], hint: 'Ngôi nhà' },
    { sentence: 'I drive my ___.', answer: 'car', options: ['car', 'dog', 'pen', 'book'], hint: 'Ô tô' },
    { sentence: 'I open the ___.', answer: 'door', options: ['door', 'car', 'dog', 'pen'], hint: 'Cánh cửa' },
  ],
  intermediate: [
    { sentence: 'The ___ is hunting for food.', answer: 'lion', options: ['lion', 'cat', 'dog', 'bird'], hint: 'Sư tử' },
    { sentence: 'The ___ is swimming in the ocean.', answer: 'whale', options: ['whale', 'fish', 'shark', 'dolphin'], hint: 'Cá voi' },
    { sentence: 'The ___ is climbing the tree.', answer: 'monkey', options: ['monkey', 'cat', 'dog', 'bird'], hint: 'Con khỉ' },
    { sentence: 'I eat Italian ___ for dinner.', answer: 'pasta', options: ['pasta', 'rice', 'bread', 'soup'], hint: 'Mì Ý' },
    { sentence: 'The ___ is cold and creamy.', answer: 'ice cream', options: ['ice cream', 'yogurt', 'milk', 'cheese'], hint: 'Kem' },
    { sentence: 'The ___ is very tall.', answer: 'mountain', options: ['mountain', 'hill', 'tree', 'building'], hint: 'Ngọn núi' },
    { sentence: 'The ___ is deep and blue.', answer: 'ocean', options: ['ocean', 'lake', 'river', 'pond'], hint: 'Đại dương' },
    { sentence: 'I use a ___ to take pictures.', answer: 'camera', options: ['camera', 'phone', 'tablet', 'computer'], hint: 'Máy ảnh' },
    { sentence: 'I listen to music with ___.', answer: 'headphones', options: ['headphones', 'speakers', 'radio', 'phone'], hint: 'Tai nghe' },
    { sentence: 'The ___ is colorful and beautiful.', answer: 'rainbow', options: ['rainbow', 'sky', 'cloud', 'sun'], hint: 'Cầu vồng' },
    { sentence: 'The ___ is flying at night.', answer: 'owl', options: ['owl', 'bird', 'bat', 'eagle'], hint: 'Con cú' },
    { sentence: 'I use a ___ to open doors.', answer: 'key', options: ['key', 'card', 'code', 'button'], hint: 'Chìa khóa' },
    { sentence: 'The ___ is hot and cheesy.', answer: 'pizza', options: ['pizza', 'sandwich', 'burger', 'pasta'], hint: 'Bánh pizza' },
    { sentence: 'I take the ___ to school.', answer: 'bus', options: ['bus', 'car', 'dog', 'pen'], hint: 'Xe buýt' },
    { sentence: 'I cook in the ___.', answer: 'kitchen', options: ['kitchen', 'car', 'dog', 'pen'], hint: 'Nhà bếp' },
    { sentence: 'I fly in an ___.', answer: 'airplane', options: ['airplane', 'car', 'dog', 'pen'], hint: 'Máy bay' },
    { sentence: 'The ___ is sweet and sticky.', answer: 'honey', options: ['honey', 'sugar', 'jam', 'syrup'], hint: 'Mật ong' },
    { sentence: 'I use a ___ to clean my teeth.', answer: 'toothbrush', options: ['toothbrush', 'brush', 'comb', 'sponge'], hint: 'Bàn chải đánh răng' },
    { sentence: 'The ___ is dark and scary.', answer: 'cave', options: ['cave', 'hole', 'tunnel', 'basement'], hint: 'Hang động' },
    { sentence: 'I watch movies on my ___.', answer: 'television', options: ['television', 'computer', 'phone', 'tablet'], hint: 'Tivi' },
    { sentence: 'The ___ is running in the forest.', answer: 'deer', options: ['deer', 'car', 'dog', 'cat'], hint: 'Con hươu' },
    { sentence: 'I ride the ___ to work.', answer: 'train', options: ['train', 'car', 'dog', 'pen'], hint: 'Tàu hỏa' },
    { sentence: 'The ___ is crunchy and salty.', answer: 'chips', options: ['chips', 'crackers', 'nuts', 'popcorn'], hint: 'Khoai tây chiên' },
    { sentence: 'I study in the ___.', answer: 'library', options: ['library', 'car', 'dog', 'pen'], hint: 'Thư viện' },
    { sentence: 'I use a ___ to keep warm.', answer: 'blanket', options: ['blanket', 'towel', 'sheet', 'pillow'], hint: 'Cái chăn' },
  ],
  advanced: [
    { sentence: 'She ___ her homework every evening.', answer: 'does', options: ['does', 'makes', 'takes', 'gets'], hint: 'Làm (bài tập)' },
    { sentence: 'We need to ___ a decision quickly.', answer: 'make', options: ['make', 'do', 'take', 'get'], hint: 'Đưa ra (quyết định)' },
    { sentence: 'He ___ the bus to work every morning.', answer: 'takes', options: ['takes', 'rides', 'drives', 'goes'], hint: 'Đi (xe buýt)' },
    { sentence: 'Please ___ attention to the teacher.', answer: 'pay', options: ['pay', 'give', 'take', 'make'], hint: 'Chú ý' },
    { sentence: 'Can you ___ me a favor?', answer: 'do', options: ['do', 'make', 'give', 'take'], hint: 'Giúp đỡ' },
    { sentence: 'I always ___ my best in exams.', answer: 'try', options: ['try', 'do', 'make', 'give'], hint: 'Cố gắng' },
    { sentence: 'She ___ a lot of progress this year.', answer: 'made', options: ['made', 'did', 'took', 'had'], hint: 'Tiến bộ' },
    { sentence: 'We had to ___ an important choice.', answer: 'make', options: ['make', 'do', 'take', 'have'], hint: 'Lựa chọn' },
    { sentence: 'He ___ notes during the lecture.', answer: 'took', options: ['took', 'made', 'did', 'wrote'], hint: 'Ghi chép' },
    { sentence: 'They ___ a great job on the project.', answer: 'did', options: ['did', 'made', 'took', 'had'], hint: 'Làm tốt' },
    { sentence: 'The teacher asked us to ___ an essay.', answer: 'write', options: ['write', 'make', 'do', 'read'], hint: 'Viết (bài luận)' },
    { sentence: 'You should ___ advantage of this opportunity.', answer: 'take', options: ['take', 'make', 'do', 'get'], hint: 'Tận dụng' },
    { sentence: 'We ___ a lot of fun at the party.', answer: 'had', options: ['had', 'made', 'did', 'took'], hint: 'Vui vẻ' },
    { sentence: 'She ___ her room clean every day.', answer: 'keeps', options: ['keeps', 'makes', 'does', 'takes'], hint: 'Giữ (sạch sẽ)' },
    { sentence: 'He ___ his mind about the trip.', answer: 'changed', options: ['changed', 'made', 'did', 'took'], hint: 'Thay đổi (suy nghĩ)' },
    { sentence: 'I ___ forward to meeting you.', answer: 'look', options: ['look', 'see', 'watch', 'find'], hint: 'Mong đợi' },
    { sentence: 'She ___ up early every morning.', answer: 'gets', options: ['gets', 'wakes', 'rises', 'stands'], hint: 'Thức dậy' },
    { sentence: 'They ___ along very well together.', answer: 'get', options: ['get', 'go', 'come', 'put'], hint: 'Hòa hợp' },
    { sentence: 'He ___ out of ideas for the project.', answer: 'ran', options: ['ran', 'got', 'went', 'came'], hint: 'Hết (ý tưởng)' },
    { sentence: 'We should ___ up with a new plan.', answer: 'come', options: ['come', 'get', 'make', 'put'], hint: 'Nghĩ ra' },
    { sentence: 'She ___ down the offer politely.', answer: 'turned', options: ['turned', 'put', 'took', 'gave'], hint: 'Từ chối' },
    { sentence: 'He ___ off his shoes at the door.', answer: 'took', options: ['took', 'put', 'got', 'gave'], hint: 'Cởi (giày)' },
    { sentence: 'Please ___ in the form with your details.', answer: 'fill', options: ['fill', 'write', 'put', 'take'], hint: 'Điền (thông tin)' },
    { sentence: 'I ___ across an old friend at the store.', answer: 'came', options: ['came', 'ran', 'got', 'went'], hint: 'Tình cờ gặp' },
    { sentence: 'She ___ after her mother in personality.', answer: 'takes', options: ['takes', 'looks', 'goes', 'comes'], hint: 'Giống (tính cách)' },
  ],
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '🌱 Cơ bản',
  intermediate: '🌿 Trung bình',
  advanced: '🌳 Nâng cao',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: 'from-green-400 to-emerald-500',
  intermediate: 'from-yellow-400 to-amber-500',
  advanced: 'from-red-400 to-rose-500',
};

export default function FillBlanksPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  const TOTAL = 10;

  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const pool = QUESTIONS_BY_DIFFICULTY[diff];
    const picked = shuffleArray(pool).slice(0, TOTAL);
    setQuestions(picked);
    setCurrentIndex(0);
    setSelected(null);
    setIsCorrect(null);
    setScore(0);
    setShowHint(false);
    setFinished(false);
  }, [shuffleArray]);

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    const correct = option === questions[currentIndex].answer;
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setIsCorrect(null);
      setShowHint(false);
    }
  };

  const renderSentence = (sentence: string) => {
    const parts = sentence.split('___');
    return (
      <span>
        {parts[0]}
        <span className={`inline-block min-w-[80px] border-b-4 mx-1 text-center font-black ${
          selected
            ? isCorrect
              ? 'border-green-500 text-green-600'
              : 'border-red-500 text-red-600'
            : 'border-purple-400 text-purple-500'
        }`}>
          {selected || '______'}
        </span>
        {parts[1]}
      </span>
    );
  };

  // Start screen
  if (!difficulty) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50 pb-16">
          <div className="max-w-2xl mx-auto px-4 pt-10">
            <Link href="/games" className="text-purple-600 font-bold text-sm hover:underline">← Quay lại</Link>
            <div className="text-center mt-6">
              <div className="text-6xl mb-4">✏️</div>
              <h1 className="text-3xl font-black text-gray-800 mb-2">Điền từ vào chỗ trống</h1>
              <p className="text-gray-500 mb-8">Chọn từ đúng để hoàn thành câu tiếng Anh</p>
            </div>
            <div className="space-y-3">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => startGame(diff)}
                  className={`w-full bg-gradient-to-r ${DIFFICULTY_COLORS[diff]} text-white rounded-2xl p-5 text-left hover:scale-[1.02] transition-transform shadow-lg`}
                >
                  <div className="font-black text-lg">{DIFFICULTY_LABELS[diff]}</div>
                  <div className="text-white/80 text-sm mt-1">
                    {QUESTIONS_BY_DIFFICULTY[diff].length} câu hỏi · 10 câu mỗi lượt
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // Finished screen
  if (finished) {
    const pct = Math.round((score / TOTAL) * 100);
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center pb-16">
          <div className="text-center px-4">
            <div className="text-7xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">Hoàn thành!</h2>
            <p className="text-5xl font-black text-purple-600 mb-2">{score}/{TOTAL}</p>
            <p className="text-gray-500 mb-6">{pct}% chính xác</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => startGame(difficulty)} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-purple-700 transition">
                Chơi lại
              </button>
              <button onClick={() => setDifficulty(null)} className="bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-300 transition">
                Đổi độ khó
              </button>
              <Link href="/games" className="bg-gray-100 text-gray-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">
                Quay lại
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Game screen
  const q = questions[currentIndex];
  const shuffledOptions = shuffleArray(q.options);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50 pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/games" className="text-purple-600 font-bold text-sm hover:underline">← Quay lại</Link>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600">⭐ {score}/{TOTAL}</span>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-purple-100 rounded-full h-3 mb-8">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Sentence card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 leading-relaxed">
              {renderSentence(q.sentence)}
            </p>
            {showHint && (
              <p className="text-purple-500 text-sm mt-3 font-semibold">💡 Gợi ý: {q.hint}</p>
            )}
            {!showHint && !selected && (
              <button
                onClick={() => setShowHint(true)}
                className="mt-4 text-purple-400 text-sm hover:text-purple-600 transition"
              >
                Xem gợi ý
              </button>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {shuffledOptions.map((option) => {
              let cls = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50';
              if (selected) {
                if (option === q.answer) {
                  cls = 'bg-green-100 border-2 border-green-500 text-green-700';
                } else if (option === selected) {
                  cls = 'bg-red-100 border-2 border-red-500 text-red-700';
                } else {
                  cls = 'bg-gray-50 border-2 border-gray-200 text-gray-400';
                }
              }
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={!!selected}
                  className={`${cls} rounded-2xl p-4 font-bold text-lg transition-all ${!selected ? 'hover:scale-[1.03] active:scale-95' : ''}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback & next */}
          {selected && (
            <div className="text-center">
              <p className={`text-lg font-black mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? '🎉 Chính xác!' : `❌ Sai rồi! Đáp án đúng: "${q.answer}"`}
              </p>
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold px-8 py-3 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition shadow-lg"
              >
                {currentIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo →'}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
