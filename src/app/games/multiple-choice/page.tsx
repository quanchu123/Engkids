'use client';

import { useState, useEffect } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';
import { DEFAULT_MULTIPLE_CHOICE } from '@/data/game-defaults';
import type { MCContent } from '@/types/games';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const OPTION_COLORS = ['from-blue-400 to-blue-500','from-purple-400 to-purple-500','from-pink-400 to-pink-500','from-orange-400 to-orange-500',
];

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó',
};

export default function MultipleChoicePage() {
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct'|'wrong'| null>(null);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  // Editable content: starts from built-in defaults, replaced by admin override.
  const [content, setContent] = useState<MCContent>(DEFAULT_MULTIPLE_CHOICE);

  useEffect(() => {
    fetch('/api/games/multiple-choice')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data) setContent(res.data as MCContent);
      })
      .catch(() => {});
  }, []);

  const startGame = (level: string) =>{
    const pool = content[level as keyof MCContent] || content.beginner;
    const shuffled = [...pool].sort(() =>Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setDifficulty(level);
    setCurrent(0);
    setScore(0);
    setTime(0);
    setFinished(false);
    setSelected(null);
    setFeedback(null);
    setGameStarted(true);
  };

  useEffect(() =>{
    if (gameStarted && !finished) {
      const timer = setInterval(() =>setTime(prev =>prev + 1), 1000);
      return () =>clearInterval(timer);
    }
  }, [gameStarted, finished]);

  const handleSelect = (option: string) =>{
    if (feedback) return;
    const question = questions[current];
    const isCorrect = option === question.answer;
    setSelected(option);
    setFeedback(isCorrect ?'correct':'wrong');
    if (isCorrect) setScore(prev =>prev + 10);
  };

  const handleNext = () =>{
    setFeedback(null);
    setSelected(null);
    if (current< questions.length - 1) {
      setCurrent(prev =>prev + 1);
    } else {
      setFinished(true);
    }
  };

  const formatTime = (s: number) =>`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2,'0')}`;

  // Start screen
  if (!gameStarted) {
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-300 to-purple-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-blue-200"><Link href="/games" className="inline-block mb-4 text-purple-600 hover:text-purple-800 font-bold text-sm">← Quay lại</Link><div className="text-6xl mb-4"></div><h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Trắc Nghiệm Tiếng Anh</h1><p className="text-gray-600 mb-8">Chọn đáp án đúng cho mỗi câu hỏi!</p><div className="space-y-3 mb-8">{Object.entries(DIFFICULTY_LABELS).map(([key, label]) =>(<button
                  key={key}
                  onClick={() =>startGame(key)}
                  className={`w-full px-6 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all hover:scale-105 text-white ${
                    key ==='beginner'?'bg-gradient-to-r from-green-400 to-green-500':
                    key ==='intermediate'?'bg-gradient-to-r from-yellow-400 to-orange-500':'bg-gradient-to-r from-red-400 to-red-500'}`}
                >{key ==='beginner'?'': key ==='intermediate'?'':''} {label}<span className="block text-sm opacity-80 mt-1">{key ==='beginner'?'Từ vựng cơ bản': key ==='intermediate'?'Từ vựng hàng ngày':'Từ vựng nâng cao'}</span></button>))}</div></div></div></>);
  }

  // Finished screen
  if (finished) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-300 to-purple-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-blue-200"><div className="text-6xl mb-4">{percentage >= 80 ?'': percentage >= 50 ?'':''}</div><h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">{percentage >= 80 ?'Xuất sắc!': percentage >= 50 ?'Tốt lắm!':'Cố gắng thêm!'}</h1><div className="bg-blue-50 rounded-2xl p-6 mb-6 space-y-2"><p className="text-2xl font-bold text-blue-600">{score}/{questions.length * 10} điểm</p><p className="text-lg text-purple-600">{formatTime(time)}</p><p className="text-lg text-green-600">{score / 10}/{questions.length} câu đúng</p></div><div className="flex flex-wrap gap-3 justify-center"><button onClick={() =>startGame(difficulty)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Chơi lại</button><Link href="/games" className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Trò chơi khác</Link></div></div></div></>);
  }

  const question = questions[current];

  return (<><Header /><div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-300 to-purple-500 p-4"><div className="max-w-2xl mx-auto">{/* Game header */}<div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-5 mb-5 text-white"><div className="flex justify-between items-center mb-3"><span className="text-lg font-bold">Câu {current + 1}/{questions.length}</span><span className="text-blue-100">{formatTime(time)}</span><span className="font-bold text-yellow-200">{score}</span></div><div className="w-full bg-white/30 rounded-full h-3"><div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width:`${((current + 1) / questions.length) * 100}%`}}
              /></div></div>{/* Question */}<div className="bg-white/95 rounded-2xl shadow-xl p-7 border-2 border-blue-200"><h2 className="text-2xl font-black text-gray-800 mb-7 text-center">{question.question}</h2>{/* Options */}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">{question.options.map((option, i) =>{
                let cls =`bg-gradient-to-r ${OPTION_COLORS[i]} text-white hover:scale-105 hover:shadow-lg`;
                if (feedback) {
                  if (option === question.answer) {
                    cls ='bg-gradient-to-r from-green-500 to-green-600 text-white scale-105 shadow-lg';
                  } else if (selected === option) {
                    cls ='bg-gradient-to-r from-red-500 to-red-600 text-white scale-105 shadow-lg';
                  } else {
                    cls ='bg-gray-200 text-gray-400';
                  }
                }
                return (<button
                    key={i}
                    onClick={() =>handleSelect(option)}
                    disabled={!!feedback}
                    className={`p-5 rounded-xl text-lg font-bold transition-all duration-200 ${cls} ${feedback ?'cursor-default':'cursor-pointer'}`}
                  >{option}</button>);
              })}</div>{/* Feedback */}
            {feedback && (<div className={`text-center mb-5 p-5 rounded-2xl shadow-lg ${
                feedback ==='correct'?'bg-gradient-to-r from-green-400 to-green-500':'bg-gradient-to-r from-red-400 to-red-500'} text-white`}><p className="text-xl font-bold mb-1">{feedback ==='correct'?'Chính xác!':`Sai rồi!  Đáp án: ${question.answer}`}</p><p className="text-sm opacity-90">{question.explanation}</p></div>)}

            {/* Next button */}
            {feedback && (<div className="text-center"><button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                >{current< questions.length - 1 ?'Câu tiếp':'Xem kết quả'}</button></div>)}</div></div></div></>);
}
