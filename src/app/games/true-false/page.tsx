'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';

interface TFQuestion {
  id: number;
  text: string;
  answer: boolean;
  explanation: string;
}

const QUESTIONS_BY_DIFFICULTY: Record<string, TFQuestion[]> = {
  beginner: [
    { id: 1, text: "The sky is blue.", answer: true, explanation: "The sky appears blue due to the scattering of sunlight." },
    { id: 2, text: "Cats can fly.", answer: false, explanation: "Cats cannot fly — they don't have wings." },
    { id: 3, text: "Fish live in water.", answer: true, explanation: "Fish are aquatic animals that live in water." },
    { id: 4, text: "The sun is cold.", answer: false, explanation: "The sun is extremely hot, not cold." },
    { id: 5, text: "Birds have wings.", answer: true, explanation: "Birds have wings to help them fly." },
    { id: 6, text: "Dogs say meow.", answer: false, explanation: "Dogs bark. Cats say meow." },
    { id: 7, text: "Milk is white.", answer: true, explanation: "Milk is usually white in color." },
    { id: 8, text: "Books are for eating.", answer: false, explanation: "Books are for reading, not eating." },
    { id: 9, text: "Bananas are yellow.", answer: true, explanation: "Ripe bananas are yellow." },
    { id: 10, text: "Cars swim in the sea.", answer: false, explanation: "Cars cannot swim; they drive on roads." },
    { id: 11, text: "The moon shines at night.", answer: true, explanation: "The moon is visible and shines at night." },
    { id: 12, text: "Apples are a fruit.", answer: true, explanation: "Apples are indeed a type of fruit." },
    { id: 13, text: "Water is wet.", answer: true, explanation: "Water is considered wet as it is a liquid." },
    { id: 14, text: "Fire is cold.", answer: false, explanation: "Fire is hot, not cold." },
    { id: 15, text: "The earth is round.", answer: true, explanation: "The Earth is round (spherical) in shape." },
    { id: 16, text: "Fish can walk on land.", answer: false, explanation: "Fish cannot walk on land; they swim in water." },
    { id: 17, text: "Grass is green.", answer: true, explanation: "Grass is green in color." },
    { id: 18, text: "Eggs grow on trees.", answer: false, explanation: "Eggs don't grow on trees; they come from animals." },
    { id: 19, text: "Dogs are animals.", answer: true, explanation: "Dogs are animals." },
    { id: 20, text: "The sun rises in the west.", answer: false, explanation: "The sun rises in the east, not the west." },
    { id: 21, text: "Roses are flowers.", answer: true, explanation: "Roses are flowers." },
    { id: 22, text: "Ice is hot.", answer: false, explanation: "Ice is cold, not hot." },
    { id: 23, text: "Clouds are in the sky.", answer: true, explanation: "Clouds are in the sky." },
    { id: 24, text: "Trees have leaves.", answer: true, explanation: "Trees have leaves." },
    { id: 25, text: "Rain falls from clouds.", answer: true, explanation: "Rain falls from clouds." },
    { id: 26, text: "Flowers smell nice.", answer: true, explanation: "Flowers usually smell nice." },
    { id: 27, text: "The ocean is salty.", answer: true, explanation: "The ocean is salty." },
    { id: 28, text: "Bees make honey.", answer: true, explanation: "Bees produce honey." },
    { id: 29, text: "Stars shine at night.", answer: true, explanation: "Stars shine at night." },
    { id: 30, text: "Stones can fly.", answer: false, explanation: "Stones cannot fly." },
  ],
  intermediate: [
    { id: 31, text: "Cats can swim.", answer: true, explanation: "Cats can swim, though they usually don't like water." },
    { id: 32, text: "The moon is made of cheese.", answer: false, explanation: "The moon is made of rock and dust, not cheese." },
    { id: 33, text: "Birds can fly.", answer: true, explanation: "Most birds can fly, though some cannot." },
    { id: 34, text: "The sun is a star.", answer: true, explanation: "The sun is indeed a star — the closest one to Earth." },
    { id: 35, text: "Water boils at 100 degrees Celsius.", answer: true, explanation: "Water boils at 100°C at sea level." },
    { id: 36, text: "Trees can walk.", answer: false, explanation: "Trees cannot walk; they are rooted in the ground." },
    { id: 37, text: "Birds have feathers.", answer: true, explanation: "Birds have feathers that help them fly and stay warm." },
    { id: 38, text: "The moon orbits around the Earth.", answer: true, explanation: "The moon orbits around the Earth." },
    { id: 39, text: "Snow is white.", answer: true, explanation: "Snow is white in color." },
    { id: 40, text: "Honey is sweet.", answer: true, explanation: "Honey is sweet." },
    { id: 41, text: "Lemons are sweet.", answer: false, explanation: "Lemons are sour, not sweet." },
    { id: 42, text: "Elephants are large.", answer: true, explanation: "Elephants are large animals." },
    { id: 43, text: "Ants are bigger than elephants.", answer: false, explanation: "Ants are much smaller than elephants." },
    { id: 44, text: "The Earth revolves around the Sun.", answer: true, explanation: "The Earth revolves around the Sun." },
    { id: 45, text: "Humans need oxygen to breathe.", answer: true, explanation: "Humans need oxygen for breathing." },
    { id: 46, text: "Plants produce oxygen.", answer: true, explanation: "Plants produce oxygen through photosynthesis." },
    { id: 47, text: "Diamonds are soft.", answer: false, explanation: "Diamonds are very hard." },
    { id: 48, text: "Gold is a metal.", answer: true, explanation: "Gold is a metal." },
    { id: 49, text: "Glass is transparent.", answer: true, explanation: "Glass is transparent." },
    { id: 50, text: "Wood comes from animals.", answer: false, explanation: "Wood comes from plants (trees), not animals." },
    { id: 51, text: "Wool comes from sheep.", answer: true, explanation: "Wool comes from sheep." },
    { id: 52, text: "Bread is made from flour.", answer: true, explanation: "Bread is made from flour." },
    { id: 53, text: "Salt makes food salty.", answer: true, explanation: "Salt makes food salty." },
    { id: 54, text: "Sugar makes food salty.", answer: false, explanation: "Sugar makes food sweet, not salty." },
    { id: 55, text: "A whale is a fish.", answer: false, explanation: "A whale is a mammal, not a fish." },
  ],
  advanced: [
    { id: 56, text: "Sound travels faster than light.", answer: false, explanation: "Light travels much faster than sound." },
    { id: 57, text: "The Great Wall of China is visible from space.", answer: false, explanation: "The Great Wall is not visible from space with the naked eye." },
    { id: 58, text: "Penguins can fly.", answer: false, explanation: "Penguins are flightless birds that swim instead." },
    { id: 59, text: "The Amazon is the longest river in the world.", answer: false, explanation: "The Nile is the longest river; Amazon is the largest by volume." },
    { id: 60, text: "Humans have 206 bones.", answer: true, explanation: "Adult humans have 206 bones." },
    { id: 61, text: "The Pacific Ocean is the largest ocean.", answer: true, explanation: "The Pacific is the largest and deepest ocean." },
    { id: 62, text: "Lightning is hotter than the sun's surface.", answer: true, explanation: "Lightning can reach temperatures 5x hotter than the sun's surface." },
    { id: 63, text: "Octopuses have three hearts.", answer: true, explanation: "Octopuses have three hearts." },
    { id: 64, text: "Venus is the closest planet to the Sun.", answer: false, explanation: "Mercury is closest to the Sun, not Venus." },
    { id: 65, text: "A tomato is a fruit.", answer: true, explanation: "Botanically, a tomato is a fruit (a berry)." },
    { id: 66, text: "Oxygen is the most abundant element on Earth.", answer: false, explanation: "Iron is the most abundant element; oxygen is most abundant in the crust." },
    { id: 67, text: "Sharks are mammals.", answer: false, explanation: "Sharks are fish, not mammals." },
    { id: 68, text: "The Sahara is the largest hot desert.", answer: true, explanation: "The Sahara Desert is the largest hot desert." },
    { id: 69, text: "Dolphins are fish.", answer: false, explanation: "Dolphins are mammals, not fish." },
    { id: 70, text: "Mount Everest is the tallest mountain.", answer: true, explanation: "Mount Everest is the tallest mountain above sea level." },
    { id: 71, text: "Bamboo is a type of grass.", answer: true, explanation: "Bamboo is indeed a type of grass." },
    { id: 72, text: "The human body is mostly water.", answer: true, explanation: "The human body is about 60% water." },
    { id: 73, text: "Bats are blind.", answer: false, explanation: "Bats are not blind — they can see." },
    { id: 74, text: "Antarctica is a continent.", answer: true, explanation: "Antarctica is a continent." },
    { id: 75, text: "Spiders are insects.", answer: false, explanation: "Spiders are arachnids, not insects." },
  ],
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó',
};

export default function TrueFalsePage() {
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [questions, setQuestions] = useState<TFQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const startGame = (level: string) => {
    const pool = QUESTIONS_BY_DIFFICULTY[level] || QUESTIONS_BY_DIFFICULTY.beginner;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setDifficulty(level);
    setCurrent(0);
    setScore(0);
    setTime(0);
    setFinished(false);
    setFeedback(null);
    setGameStarted(true);
  };

  useEffect(() => {
    if (gameStarted && !finished) {
      const timer = setInterval(() => setTime(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, finished]);

  const handleAnswer = (answer: boolean) => {
    if (feedback) return;
    const question = questions[current];
    const isCorrect = answer === question.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore(prev => prev + 10);
  };

  const handleNext = () => {
    setFeedback(null);
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Start screen
  if (!gameStarted) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-green-200">
            <Link href="/games" className="inline-block mb-4 text-green-600 hover:text-green-800 font-bold text-sm">
              ← Quay lại
            </Link>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
              Đúng hay Sai?
            </h1>
            <p className="text-gray-600 mb-8">Đọc câu tiếng Anh và chọn ĐÚNG hoặc SAI!</p>

            <div className="space-y-3 mb-8">
              {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => startGame(key)}
                  className={`w-full px-6 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all hover:scale-105 text-white ${
                    key === 'beginner' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    key === 'intermediate' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                >
                  {key === 'beginner' ? '🌱' : key === 'intermediate' ? '🌿' : '🌳'} {label}
                  <span className="block text-sm opacity-80 mt-1">
                    {key === 'beginner' ? 'Sự thật đơn giản' : key === 'intermediate' ? 'Kiến thức phổ thông' : 'Thử thách kiến thức'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Finished screen
  if (finished) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-green-200">
            <div className="text-6xl mb-4">{percentage >= 80 ? '🏆' : percentage >= 50 ? '⭐' : '💪'}</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-4">
              {percentage >= 80 ? 'Xuất sắc!' : percentage >= 50 ? 'Tốt lắm!' : 'Cố gắng thêm!'}
            </h1>
            <div className="bg-green-50 rounded-2xl p-6 mb-6 space-y-2">
              <p className="text-2xl font-bold text-green-600">🏆 {score}/{questions.length * 10} điểm</p>
              <p className="text-lg text-teal-600">⏱️ {formatTime(time)}</p>
              <p className="text-lg text-emerald-600">✅ {score / 10}/{questions.length} câu đúng</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => startGame(difficulty)} className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                Chơi lại 🔄
              </button>
              <Link href="/games" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                Trò chơi khác 🎮
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const question = questions[current];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Game header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl shadow-xl p-5 mb-5 text-white">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold">Câu {current + 1}/{questions.length}</span>
              <span className="text-green-100">⏱️ {formatTime(time)}</span>
              <span className="font-bold text-yellow-200">🏆 {score}</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-white/95 rounded-2xl shadow-xl p-7 border-2 border-green-200">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-400 mb-3 font-semibold uppercase tracking-wider">Câu này đúng hay sai?</p>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800 leading-relaxed">
                &ldquo;{question.text}&rdquo;
              </h2>
            </div>

            {/* True/False buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleAnswer(true)}
                disabled={!!feedback}
                className={`p-6 rounded-2xl text-xl font-black transition-all duration-200 ${
                  feedback
                    ? question.answer === true
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white scale-105 shadow-lg'
                      : 'bg-gray-200 text-gray-400'
                    : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 hover:shadow-lg cursor-pointer'
                }`}
              >
                ✅ ĐÚNG
              </button>
              <button
                onClick={() => handleAnswer(false)}
                disabled={!!feedback}
                className={`p-6 rounded-2xl text-xl font-black transition-all duration-200 ${
                  feedback
                    ? question.answer === false
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white scale-105 shadow-lg'
                      : 'bg-gray-200 text-gray-400'
                    : 'bg-gradient-to-r from-red-400 to-rose-500 text-white hover:scale-105 hover:shadow-lg cursor-pointer'
                }`}
              >
                ❌ SAI
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`text-center mb-5 p-5 rounded-2xl shadow-lg ${
                feedback === 'correct' ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'
              } text-white`}>
                <p className="text-xl font-bold mb-1">
                  {feedback === 'correct' ? 'Chính xác! 🎉' : `Sai rồi! ❌ Đáp án: ${question.answer ? 'ĐÚNG' : 'SAI'}`}
                </p>
                <p className="text-sm opacity-90">{question.explanation}</p>
              </div>
            )}

            {/* Next button */}
            {feedback && (
              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                >
                  {current < questions.length - 1 ? 'Câu tiếp ➡️' : 'Xem kết quả 🏁'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
