'use client';

import { useState, useEffect } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';
import { DEFAULT_TRUE_FALSE } from '@/data/game-defaults';
import type { TFContent } from '@/types/games';

interface TFQuestion {
  id: number;
  text: string;
  answer: boolean;
  explanation: string;
}

const DIFFICULTY_LABELS: Record<string, string>= {
  beginner:'Dễ',
  intermediate:'Trung bình',
  advanced:'Khó',
};

export default function TrueFalsePage() {
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [questions, setQuestions] = useState<TFQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct'|'wrong'| null>(null);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [content, setContent] = useState<TFContent>(DEFAULT_TRUE_FALSE);

  useEffect(() => {
    fetch('/api/games/true-false', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data) setContent(res.data as TFContent);
      })
      .catch(() => {});
  }, []);

  const startGame = (level: string) =>{
    const pool = content[level as keyof TFContent] || content.beginner;
    const shuffled = [...pool].sort(() =>Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setDifficulty(level);
    setCurrent(0);
    setScore(0);
    setTime(0);
    setFinished(false);
    setFeedback(null);
    setGameStarted(true);
  };

  useEffect(() =>{
    if (gameStarted && !finished) {
      const timer = setInterval(() =>setTime(prev =>prev + 1), 1000);
      return () =>clearInterval(timer);
    }
  }, [gameStarted, finished]);

  const handleAnswer = (answer: boolean) =>{
    if (feedback) return;
    const question = questions[current];
    const isCorrect = answer === question.answer;
    setFeedback(isCorrect ?'correct':'wrong');
    if (isCorrect) setScore(prev =>prev + 10);
  };

  const handleNext = () =>{
    setFeedback(null);
    if (current< questions.length - 1) {
      setCurrent(prev =>prev + 1);
    } else {
      setFinished(true);
    }
  };

  const formatTime = (s: number) =>`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2,'0')}`;

  // Start screen
  if (!gameStarted) {
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-green-200"><Link href="/games" className="inline-block mb-4 text-green-600 hover:text-green-800 font-bold text-sm">← Quay lại</Link><div className="text-6xl mb-4"></div><h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">Đúng hay Sai?</h1><p className="text-gray-600 mb-8">Đọc câu tiếng Anh và chọn ĐÚNG hoặc SAI!</p><div className="space-y-3 mb-8">{Object.entries(DIFFICULTY_LABELS).map(([key, label]) =>(<button
                  key={key}
                  onClick={() =>startGame(key)}
                  className={`w-full px-6 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all hover:scale-105 text-white ${
                    key ==='beginner'?'bg-gradient-to-r from-green-400 to-green-500':
                    key ==='intermediate'?'bg-gradient-to-r from-yellow-400 to-orange-500':'bg-gradient-to-r from-red-400 to-red-500'}`}
                >{key ==='beginner'?'': key ==='intermediate'?'':''} {label}<span className="block text-sm opacity-80 mt-1">{key ==='beginner'?'Sự thật đơn giản': key ==='intermediate'?'Kiến thức phổ thông':'Thử thách kiến thức'}</span></button>))}</div></div></div></>);
  }

  // Finished screen
  if (finished) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-green-200"><div className="text-6xl mb-4">{percentage >= 80 ?'': percentage >= 50 ?'':''}</div><h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-4">{percentage >= 80 ?'Xuất sắc!': percentage >= 50 ?'Tốt lắm!':'Cố gắng thêm!'}</h1><div className="bg-green-50 rounded-2xl p-6 mb-6 space-y-2"><p className="text-2xl font-bold text-green-600">{score}/{questions.length * 10} điểm</p><p className="text-lg text-teal-600">{formatTime(time)}</p><p className="text-lg text-emerald-600">{score / 10}/{questions.length} câu đúng</p></div><div className="flex flex-wrap gap-3 justify-center"><button onClick={() =>startGame(difficulty)} className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Chơi lại</button><Link href="/games" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Trò chơi khác</Link></div></div></div></>);
  }

  const question = questions[current];

  return (<><Header /><div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-300 to-teal-500 p-4"><div className="max-w-2xl mx-auto">{/* Game header */}<div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl shadow-xl p-5 mb-5 text-white"><div className="flex justify-between items-center mb-3"><span className="text-lg font-bold">Câu {current + 1}/{questions.length}</span><span className="text-green-100">{formatTime(time)}</span><span className="font-bold text-yellow-200">{score}</span></div><div className="w-full bg-white/30 rounded-full h-3"><div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width:`${((current + 1) / questions.length) * 100}%`}}
              /></div></div>{/* Question */}<div className="bg-white/95 rounded-2xl shadow-xl p-7 border-2 border-green-200"><div className="text-center mb-8"><p className="text-sm text-gray-400 mb-3 font-semibold uppercase tracking-wider">Câu này đúng hay sai?</p><h2 className="text-2xl sm:text-3xl font-black text-gray-800 leading-relaxed">&ldquo;{question.text}&rdquo;</h2></div>{/* True/False buttons */}<div className="grid grid-cols-2 gap-4 mb-6"><button
                onClick={() =>handleAnswer(true)}
                disabled={!!feedback}
                className={`p-6 rounded-2xl text-xl font-black transition-all duration-200 ${
                  feedback
                    ? question.answer === true
                      ?'bg-gradient-to-r from-green-500 to-green-600 text-white scale-105 shadow-lg':'bg-gray-200 text-gray-400':'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 hover:shadow-lg cursor-pointer'}`}
              >ĐÚNG</button><button
                onClick={() =>handleAnswer(false)}
                disabled={!!feedback}
                className={`p-6 rounded-2xl text-xl font-black transition-all duration-200 ${
                  feedback
                    ? question.answer === false
                      ?'bg-gradient-to-r from-green-500 to-green-600 text-white scale-105 shadow-lg':'bg-gray-200 text-gray-400':'bg-gradient-to-r from-red-400 to-rose-500 text-white hover:scale-105 hover:shadow-lg cursor-pointer'}`}
              >SAI</button></div>{/* Feedback */}
            {feedback && (<div className={`text-center mb-5 p-5 rounded-2xl shadow-lg ${
                feedback ==='correct'?'bg-gradient-to-r from-green-400 to-green-500':'bg-gradient-to-r from-red-400 to-red-500'} text-white`}><p className="text-xl font-bold mb-1">{feedback ==='correct'?'Chính xác!':`Sai rồi!  Đáp án: ${question.answer ?'ĐÚNG':'SAI'}`}</p><p className="text-sm opacity-90">{question.explanation}</p></div>)}

            {/* Next button */}
            {feedback && (<div className="text-center"><button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                >{current< questions.length - 1 ?'Câu tiếp':'Xem kết quả'}</button></div>)}</div></div></div></>);
}
