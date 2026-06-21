'use client';

import { useState, useEffect } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';
import { DEFAULT_WORD_BANK, filterWordBank, loadWordBank, toSentenceScrambles } from '@/lib/word-bank';
import { stageForDifficulty } from '@/lib/curriculum';

interface Sentence {
  id: number;
  text: string;
  hint: string;
}

const SENTENCES_BY_DIFFICULTY: Record<string, Sentence[]>= {
  beginner: [
    { id: 1, text: "I love cats", hint: "Tôi yêu mèo" },
    { id: 2, text: "The cat is big", hint: "Con mèo lớn" },
    { id: 3, text: "I drink tea", hint: "Tôi uống trà" },
    { id: 4, text: "He reads a book", hint: "Anh ấy đọc sách" },
    { id: 5, text: "I like blue", hint: "Tôi thích màu xanh" },
    { id: 6, text: "The sun is hot", hint: "Mặt trời nóng" },
    { id: 7, text: "Close the door", hint: "Đóng cửa lại" },
    { id: 8, text: "They eat lunch", hint: "Họ ăn trưa" },
    { id: 9, text: "I eat pizza", hint: "Tôi ăn pizza" },
    { id: 10, text: "The dog plays", hint: "Con chó chơi" },
    { id: 11, text: "She sings a song", hint: "Cô ấy hát bài hát" },
    { id: 12, text: "We have a car", hint: "Chúng tôi có xe hơi" },
    { id: 13, text: "Kids play outside", hint: "Trẻ em chơi ngoài trời" },
    { id: 14, text: "I learn English", hint: "Tôi học tiếng Anh" },
    { id: 15, text: "The cat sleeps", hint: "Con mèo ngủ" },
    { id: 16, text: "The bird flies", hint: "Con chim bay" },
    { id: 17, text: "He drinks water", hint: "Anh ấy uống nước" },
    { id: 18, text: "I play ball", hint: "Tôi chơi bóng" },
    { id: 19, text: "The fish swims", hint: "Con cá bơi" },
    { id: 20, text: "She cooks food", hint: "Cô ấy nấu ăn" },
    { id: 21, text: "The car is red", hint: "Chiếc xe màu đỏ" },
    { id: 22, text: "The tree is tall", hint: "Cái cây cao" },
    { id: 23, text: "The baby sleeps", hint: "Em bé ngủ" },
    { id: 24, text: "The moon is full", hint: "Trăng tròn" },
    { id: 25, text: "I buy milk", hint: "Tôi mua sữa" },
    { id: 26, text: "The sun shines", hint: "Mặt trời tỏa sáng" },
    { id: 27, text: "I go to school", hint: "Tôi đi học" },
    { id: 28, text: "He writes a note", hint: "Anh ấy viết ghi chú" },
    { id: 29, text: "She likes to dance", hint: "Cô ấy thích nhảy" },
    { id: 30, text: "They live here", hint: "Họ sống ở đây" },
  ],
  intermediate: [
    { id: 31, text: "I like to play football", hint: "Tôi thích chơi bóng đá" },
    { id: 32, text: "The cat is sleeping on the sofa", hint: "Con mèo đang ngủ trên sofa" },
    { id: 33, text: "She drinks a cup of tea", hint: "Cô ấy uống tách trà" },
    { id: 34, text: "We are going to the park", hint: "Chúng tôi đang đi công viên" },
    { id: 35, text: "He reads a book every night", hint: "Anh ấy đọc sách mỗi tối" },
    { id: 36, text: "My favorite color is blue", hint: "Màu yêu thích của tôi là xanh" },
    { id: 37, text: "The sun is shining today", hint: "Hôm nay trời nắng" },
    { id: 38, text: "Please close the window", hint: "Xin hãy đóng cửa sổ" },
    { id: 39, text: "They are eating lunch together", hint: "Họ đang ăn trưa cùng nhau" },
    { id: 40, text: "Can you help me with homework", hint: "Bạn có thể giúp tôi làm bài không" },
    { id: 41, text: "The dog is playing in the garden", hint: "Con chó đang chơi trong vườn" },
    { id: 42, text: "We have a new car", hint: "Chúng tôi có xe mới" },
    { id: 43, text: "The children are playing outside", hint: "Trẻ em đang chơi ngoài trời" },
    { id: 44, text: "I want to learn English", hint: "Tôi muốn học tiếng Anh" },
    { id: 45, text: "The weather is very nice today", hint: "Thời tiết hôm nay rất đẹp" },
    { id: 46, text: "They live in a big house", hint: "Họ sống trong nhà lớn" },
    { id: 47, text: "She likes to dance and sing", hint: "Cô ấy thích nhảy và hát" },
    { id: 48, text: "I need to buy some milk", hint: "Tôi cần mua sữa" },
    { id: 49, text: "He is watching television now", hint: "Anh ấy đang xem TV" },
    { id: 50, text: "She is singing a song", hint: "Cô ấy đang hát bài hát" },
  ],
  advanced: [
    { id: 51, text: "The students are studying for their exam", hint: "Các sinh viên đang ôn thi" },
    { id: 52, text: "We should protect the environment", hint: "Chúng ta nên bảo vệ môi trường" },
    { id: 53, text: "I enjoy listening to classical music", hint: "Tôi thích nghe nhạc cổ điển" },
    { id: 54, text: "The teacher explains the lesson clearly", hint: "Thầy giáo giải thích bài rõ ràng" },
    { id: 55, text: "They are planning a summer vacation", hint: "Họ đang lên kế hoạch nghỉ hè" },
    { id: 56, text: "She works at a large company", hint: "Cô ấy làm việc ở công ty lớn" },
    { id: 57, text: "We need to finish this project today", hint: "Hôm nay cần hoàn thành dự án" },
    { id: 58, text: "He practices piano every afternoon", hint: "Anh ấy tập piano mỗi chiều" },
    { id: 59, text: "The restaurant serves delicious food", hint: "Nhà hàng phục vụ đồ ăn ngon" },
    { id: 60, text: "The movie starts in ten minutes", hint: "Phim bắt đầu sau mười phút" },
    { id: 61, text: "She speaks three different languages", hint: "Cô ấy nói ba ngôn ngữ khác nhau" },
    { id: 62, text: "The library has many good books", hint: "Thư viện có nhiều sách hay" },
    { id: 63, text: "The doctor is examining the patient", hint: "Bác sĩ đang khám bệnh nhân" },
    { id: 64, text: "Technology has changed our lives dramatically", hint: "Công nghệ đã thay đổi cuộc sống" },
    { id: 65, text: "The weather forecast predicts rain", hint: "Dự báo thời tiết có mưa" },
    { id: 66, text: "She is learning to play the guitar", hint: "Cô ấy đang học chơi guitar" },
    { id: 67, text: "The scientist discovered a new element", hint: "Nhà khoa học phát hiện nguyên tố mới" },
    { id: 68, text: "We must preserve our natural resources", hint: "Phải bảo tồn tài nguyên thiên nhiên" },
    { id: 69, text: "Students should develop critical thinking skills", hint: "Sinh viên cần phát triển tư duy phản biện" },
    { id: 70, text: "The artist created a beautiful masterpiece", hint: "Nghệ sĩ tạo ra kiệt tác đẹp" },
  ],
};

const DIFFICULTY_LABELS: Record<string, string>= {
  beginner:'Dễ',
  intermediate:'Trung bình',
  advanced:'Khó',
};

function shuffleWords(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i >0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Ensure not in original order
  if (shuffled.join(' ') === text && words.length >1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export default function SentenceScramblePage() {
  const [wordBank, setWordBank] = useState(DEFAULT_WORD_BANK);
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [questions, setQuestions] = useState<Sentence[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<'correct'|'wrong'| null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) setWordBank(bank);
    });
    return () => {
      active = false;
    };
  }, []);

  const startGame = (level: string) =>{
    const stageBank = filterWordBank(wordBank, { level: stageForDifficulty(level), min: 10 });
    const sharedSentences = toSentenceScrambles(stageBank, 10);
    const pool = sharedSentences.length >= 10 ? sharedSentences : (SENTENCES_BY_DIFFICULTY[level] || SENTENCES_BY_DIFFICULTY.beginner);
    const shuffled = [...pool].sort(() =>Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setDifficulty(level);
    setCurrentIdx(0);
    setScore(0);
    setTimer(0);
    setGameOver(false);
    setFeedback(null);
    setGameStarted(true);
    setSelected([]);
    setShowHint(false);
    setScrambled(shuffleWords(shuffled[0].text));
  };

  useEffect(() =>{
    if (gameStarted && !gameOver) {
      const interval = setInterval(() =>setTimer(t =>t + 1), 1000);
      return () =>clearInterval(interval);
    }
  }, [gameStarted, gameOver]);

  useEffect(() =>{
    if (questions.length >0 && currentIdx< questions.length) {
      setScrambled(shuffleWords(questions[currentIdx].text));
      setSelected([]);
      setFeedback(null);
      setShowHint(false);
    }
  }, [currentIdx, questions]);

  const handleWordClick = (word: string, fromSelected: boolean, index: number) =>{
    if (feedback) return;
    if (fromSelected) {
      // Move word back to scrambled
      const newSelected = [...selected];
      newSelected.splice(index, 1);
      setSelected(newSelected);
      setScrambled([...scrambled, word]);
    } else {
      // Move word to selected
      const newScrambled = [...scrambled];
      newScrambled.splice(index, 1);
      setScrambled(newScrambled);
      setSelected([...selected, word]);
    }
  };

  const handleCheck = () =>{
    if (selected.length === 0) return;
    const answer = selected.join(' ');
    const correct = questions[currentIdx].text;
    if (answer === correct) {
      setFeedback('correct');
      setScore(prev =>prev + 10);
    } else {
      setFeedback('wrong');
    }
  };

  const handleNext = () =>{
    if (currentIdx< questions.length - 1) {
      setCurrentIdx(prev =>prev + 1);
    } else {
      setGameOver(true);
    }
  };

  const handleReset = () =>{
    setScrambled(shuffleWords(questions[currentIdx].text));
    setSelected([]);
    setFeedback(null);
  };

  const formatTime = (s: number) =>`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2,'0')}`;

  // Start screen
  if (!gameStarted) {
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-cyan-200"><Link href="/games" className="inline-block mb-4 text-blue-600 hover:text-blue-800 font-bold text-sm">← Quay lại</Link><div className="text-6xl mb-4"></div><h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">Sắp Xếp Câu</h1><p className="text-gray-600 mb-8">Sắp xếp các từ thành câu tiếng Anh đúng!</p><div className="space-y-3 mb-8">{Object.entries(DIFFICULTY_LABELS).map(([key, label]) =>(<button
                  key={key}
                  onClick={() =>startGame(key)}
                  className={`w-full px-6 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all hover:scale-105 text-white ${
                    key ==='beginner'?'bg-gradient-to-r from-green-400 to-green-500':
                    key ==='intermediate'?'bg-gradient-to-r from-yellow-400 to-orange-500':'bg-gradient-to-r from-red-400 to-red-500'}`}
                >{key ==='beginner'?'': key ==='intermediate'?'':''} {label}<span className="block text-sm opacity-80 mt-1">{key ==='beginner'?'Câu ngắn 3-4 từ': key ==='intermediate'?'Câu 5-7 từ':'Câu dài 6-8 từ'}</span></button>))}</div></div></div></>);
  }

  // Finished screen
  if (gameOver) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return (<><Header /><div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 flex items-center justify-center p-4"><div className="max-w-lg w-full bg-white/95 rounded-3xl shadow-2xl p-8 text-center border-4 border-cyan-200"><div className="text-6xl mb-4">{percentage >= 80 ?'': percentage >= 50 ?'':''}</div><h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">{percentage >= 80 ?'Xuất sắc!': percentage >= 50 ?'Tốt lắm!':'Cố gắng thêm!'}</h1><div className="bg-blue-50 rounded-2xl p-6 mb-6 space-y-2"><p className="text-2xl font-bold text-blue-600">{score}/{questions.length * 10} điểm</p><p className="text-lg text-cyan-600">{formatTime(timer)}</p><p className="text-lg text-green-600">{score / 10}/{questions.length} câu đúng</p></div><div className="flex flex-wrap gap-3 justify-center"><button onClick={() =>startGame(difficulty)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Chơi lại</button><Link href="/games" className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Trò chơi khác</Link></div></div></div></>);
  }

  const currentQ = questions[currentIdx];

  return (<><Header /><div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 p-4"><div className="max-w-2xl mx-auto">{/* Game header */}<div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-5 mb-5 text-white"><div className="flex justify-between items-center mb-3"><span className="text-lg font-bold">Câu {currentIdx + 1}/{questions.length}</span><span className="text-cyan-100">{formatTime(timer)}</span><span className="font-bold text-yellow-200">{score}</span></div><div className="w-full bg-white/30 rounded-full h-3"><div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width:`${((currentIdx + 1) / questions.length) * 100}%`}}
              /></div></div>{/* Game area */}<div className="bg-white/95 rounded-2xl shadow-xl p-7 border-2 border-cyan-200">{/* Hint */}<div className="text-center mb-4"><button
                onClick={() =>setShowHint(!showHint)}
                className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
              >{showHint ?'Ẩn gợi ý':'Xem gợi ý'}</button>{showHint && (<p className="text-gray-500 mt-2 italic text-lg">&ldquo;{currentQ.hint}&rdquo;</p>)}</div>{/* Selected words (answer area) */}<div className="min-h-[60px] bg-blue-50 rounded-xl p-4 mb-5 border-2 border-dashed border-blue-300 flex flex-wrap gap-2 items-center">{selected.length === 0 && (<span className="text-blue-300 italic text-sm">Chạm vào các từ bên dưới để sắp xếp câu...</span>)}
              {selected.map((word, i) =>(<button
                  key={`sel-${i}`}
                  onClick={() =>handleWordClick(word, true, i)}
                  disabled={!!feedback}
                  className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all ${
                    feedback ==='correct'?'bg-green-500':
                    feedback ==='wrong'?'bg-red-400':'bg-blue-500 hover:bg-blue-600 hover:scale-105 cursor-pointer'}`}
                >{word}</button>))}</div>{/* Scrambled words */}<div className="flex flex-wrap gap-2 justify-center mb-6">{scrambled.map((word, i) =>(<button
                  key={`scr-${i}`}
                  onClick={() =>handleWordClick(word, false, i)}
                  disabled={!!feedback}
                  className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-500 text-white shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer"
                >{word}</button>))}</div>{/* Feedback */}
            {feedback && (<div className={`text-center mb-5 p-4 rounded-2xl shadow-lg ${
                feedback ==='correct'?'bg-gradient-to-r from-green-400 to-green-500':'bg-gradient-to-r from-red-400 to-red-500'} text-white`}><p className="text-xl font-bold mb-1">{feedback ==='correct'?'Chính xác!':'Sai rồi!'}</p>{feedback ==='wrong'&& (<p className="text-sm opacity-90">Đáp án:<span className="font-bold">{currentQ.text}</span></p>)}</div>)}

            {/* Action buttons */}<div className="flex justify-center gap-3">{!feedback && (<><button
                    onClick={handleReset}
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-colors"
                  >Xóa</button><button
                    onClick={handleCheck}
                    disabled={selected.length === 0 || scrambled.length >0}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >Kiểm tra ✓</button></>)}
              {feedback && (<button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                >{currentIdx< questions.length - 1 ?'Câu tiếp':'Xem kết quả'}</button>)}</div></div></div></div></>);
}
