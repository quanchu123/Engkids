'use client';

import { useState, useEffect, useCallback } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';
import { DEFAULT_WORD_BANK, loadWordBank, toMatchingPairs } from '@/lib/word-bank';

interface WordPair {
  id: number;
  en: string;
  vi: string;
  level:'easy'|'medium'|'hard';
}

type Difficulty ='easy'|'medium'|'hard';

// Word bank adapted from a0534166556-cpu/eanglish-game (matching-pairs)
const WORD_BANK: WordPair[] = [
  // Easy
  { id: 1, en:'Dog', vi:'Con chó', level:'easy'},
  { id: 2, en:'Cat', vi:'Con mèo', level:'easy'},
  { id: 3, en:'Apple', vi:'Quả táo', level:'easy'},
  { id: 4, en:'Book', vi:'Quyển sách', level:'easy'},
  { id: 5, en:'Car', vi:'Ô tô', level:'easy'},
  { id: 6, en:'Sun', vi:'Mặt trời', level:'easy'},
  { id: 7, en:'Chair', vi:'Cái ghế', level:'easy'},
  { id: 8, en:'Tree', vi:'Cái cây', level:'easy'},
  { id: 9, en:'Water', vi:'Nước', level:'easy'},
  { id: 10, en:'Flower', vi:'Bông hoa', level:'easy'},
  { id: 11, en:'Bird', vi:'Con chim', level:'easy'},
  { id: 12, en:'Fish', vi:'Con cá', level:'easy'},
  { id: 13, en:'Bread', vi:'Bánh mì', level:'easy'},
  { id: 14, en:'Milk', vi:'Sữa', level:'easy'},
  { id: 15, en:'Banana', vi:'Quả chuối', level:'easy'},
  { id: 16, en:'Ball', vi:'Quả bóng', level:'easy'},
  { id: 17, en:'Pen', vi:'Cây bút', level:'easy'},
  { id: 18, en:'Hat', vi:'Cái mũ', level:'easy'},
  { id: 19, en:'Bed', vi:'Cái giường', level:'easy'},
  { id: 20, en:'Door', vi:'Cánh cửa', level:'easy'},
  { id: 21, en:'Rain', vi:'Mưa', level:'easy'},
  { id: 22, en:'Snow', vi:'Tuyết', level:'easy'},
  { id: 23, en:'Cake', vi:'Bánh ngọt', level:'easy'},
  { id: 24, en:'Shoe', vi:'Giày', level:'easy'},
  { id: 25, en:'Cup', vi:'Cốc uống', level:'easy'},
  // Medium
  { id: 26, en:'School', vi:'Trường học', level:'medium'},
  { id: 27, en:'Teacher', vi:'Giáo viên', level:'medium'},
  { id: 28, en:'Kitchen', vi:'Nhà bếp', level:'medium'},
  { id: 29, en:'Library', vi:'Thư viện', level:'medium'},
  { id: 30, en:'Hospital', vi:'Bệnh viện', level:'medium'},
  { id: 31, en:'Market', vi:'Chợ', level:'medium'},
  { id: 32, en:'Airplane', vi:'Máy bay', level:'medium'},
  { id: 33, en:'Train', vi:'Tàu hỏa', level:'medium'},
  { id: 34, en:'Camera', vi:'Máy ảnh', level:'medium'},
  { id: 35, en:'Umbrella', vi:'Cái ô', level:'medium'},
  { id: 36, en:'Mountain', vi:'Ngọn núi', level:'medium'},
  { id: 37, en:'Ocean', vi:'Đại dương', level:'medium'},
  { id: 38, en:'Rainbow', vi:'Cầu vồng', level:'medium'},
  { id: 39, en:'Butterfly', vi:'Con bướm', level:'medium'},
  { id: 40, en:'Elephant', vi:'Con voi', level:'medium'},
  { id: 41, en:'Monkey', vi:'Con khỉ', level:'medium'},
  { id: 42, en:'Giraffe', vi:'Con hươu cao cổ', level:'medium'},
  { id: 43, en:'Strawberry', vi:'Quả dâu tây', level:'medium'},
  { id: 44, en:'Chocolate', vi:'Sô-cô-la', level:'medium'},
  { id: 45, en:'Sandwich', vi:'Bánh sandwich', level:'medium'},
  { id: 46, en:'Breakfast', vi:'Bữa sáng', level:'medium'},
  { id: 47, en:'Dinner', vi:'Bữa tối', level:'medium'},
  { id: 48, en:'Computer', vi:'Máy tính', level:'medium'},
  { id: 49, en:'Telephone', vi:'Điện thoại', level:'medium'},
  { id: 50, en:'Television', vi:'Tivi', level:'medium'},
  // Hard
  { id: 51, en:'Microscope', vi:'Kính hiển vi', level:'hard'},
  { id: 52, en:'Telescope', vi:'Kính thiên văn', level:'hard'},
  { id: 53, en:'Laboratory', vi:'Phòng thí nghiệm', level:'hard'},
  { id: 54, en:'Aquarium', vi:'Bể cá cảnh', level:'hard'},
  { id: 55, en:'Orchestra', vi:'Dàn nhạc', level:'hard'},
  { id: 56, en:'Architecture', vi:'Kiến trúc', level:'hard'},
  { id: 57, en:'Phenomenon', vi:'Hiện tượng', level:'hard'},
  { id: 58, en:'Vocabulary', vi:'Từ vựng', level:'hard'},
  { id: 59, en:'Pronunciation', vi:'Phát âm', level:'hard'},
  { id: 60, en:'Encyclopedia', vi:'Bách khoa toàn thư', level:'hard'},
  { id: 61, en:'Expedition', vi:'Cuộc thám hiểm', level:'hard'},
  { id: 62, en:'Navigation', vi:'Điều hướng', level:'hard'},
  { id: 63, en:'Civilization', vi:'Nền văn minh', level:'hard'},
  { id: 64, en:'Environment', vi:'Môi trường', level:'hard'},
  { id: 65, en:'Sustainability', vi:'Sự bền vững', level:'hard'},
  { id: 66, en:'Constitution', vi:'Hiến pháp', level:'hard'},
  { id: 67, en:'Democracy', vi:'Dân chủ', level:'hard'},
  { id: 68, en:'Philosophy', vi:'Triết học', level:'hard'},
  { id: 69, en:'Psychology', vi:'Tâm lý học', level:'hard'},
  { id: 70, en:'Archaeology', vi:'Khảo cổ học', level:'hard'},
  { id: 71, en:'Astronomy', vi:'Thiên văn học', level:'hard'},
  { id: 72, en:'Biochemistry', vi:'Hóa sinh học', level:'hard'},
  { id: 73, en:'Geopolitics', vi:'Địa chính trị', level:'hard'},
  { id: 74, en:'Hypothesis', vi:'Giả thuyết', level:'hard'},
  { id: 75, en:'Bureaucracy', vi:'Bộ máy quan liêu', level:'hard'},
];

interface Card {
  id: number;       // unique card id (pair id * 2 or pair id * 2 + 1)
  pairId: number;   // shared between EN and VI card
  text: string;
  type:'en'|'vi';
  matched: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { label:'Dễ', pairs: 6, color:'from-green-400 to-emerald-500', time: 90 },
  medium: { label:'Trung bình', pairs: 8, color:'from-yellow-400 to-amber-500', time: 120 },
  hard: { label:'Khó', pairs: 10, color:'from-red-400 to-rose-500', time: 150 },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i >0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingPairsPage() {
  const [wordBank, setWordBank] = useState(DEFAULT_WORD_BANK);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]); // card ids
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]); // pairIds
  const [wrongPair, setWrongPair] = useState<number[]>([]); // card ids flashing wrong
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) setWordBank(bank);
    });
    return () => {
      active = false;
    };
  }, []);

  const startGame = useCallback((diff: Difficulty) =>{
    const config = DIFFICULTY_CONFIG[diff];
    const sharedPairs = toMatchingPairs(wordBank, diff, config.pairs);
    const fallbackPairs = shuffle(WORD_BANK.filter(w =>w.level === diff)).slice(0, config.pairs);
    const picked = sharedPairs.length >= config.pairs ? sharedPairs : fallbackPairs;

    const newCards: Card[] = [];
    picked.forEach(pair =>{
      newCards.push({ id: pair.id * 2, pairId: pair.id, text: pair.en, type:'en', matched: false });
      newCards.push({ id: pair.id * 2 + 1, pairId: pair.id, text: pair.vi, type:'vi', matched: false });
    });

    setDifficulty(diff);
    setCards(shuffle(newCards));
    setSelected([]);
    setMatchedPairs([]);
    setWrongPair([]);
    setMoves(0);
    setTimeLeft(config.time);
    setGameOver(false);
    setWon(false);
  }, [wordBank]);

  // Timer
  useEffect(() =>{
    if (!difficulty || gameOver || won) return;
    if (timeLeft<= 0) {
      setGameOver(true);
      return;
    }
    const t = setTimeout(() =>setTimeLeft(s =>s - 1), 1000);
    return () =>clearTimeout(t);
  }, [timeLeft, difficulty, gameOver, won]);

  // Handle card click
  const handleCardClick = useCallback((cardId: number) =>{
    if (wrongPair.length >0) return; // locked during wrong flash
    if (selected.includes(cardId)) return;
    const card = cards.find(c =>c.id === cardId);
    if (!card || card.matched) return;

    if (selected.length === 0) {
      setSelected([cardId]);
      return;
    }

    // second card
    const firstCard = cards.find(c =>c.id === selected[0])!;
    const secondCard = card;

    setMoves(m =>m + 1);

    if (firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type) {
      // Match!
      const newMatchedPairs = [...matchedPairs, firstCard.pairId];
      setMatchedPairs(newMatchedPairs);
      setCards(prev =>prev.map(c =>c.pairId === firstCard.pairId ? { ...c, matched: true } : c
      ));
      setSelected([]);
      if (newMatchedPairs.length === DIFFICULTY_CONFIG[difficulty!].pairs) {
        setWon(true);
      }
    } else {
      // Wrong
      setSelected([...selected, cardId]);
      setWrongPair([selected[0], cardId]);
      setTimeout(() =>{
        setWrongPair([]);
        setSelected([]);
      }, 700);
    }
  }, [cards, selected, matchedPairs, wrongPair, difficulty]);

  const getCardStyle = (card: Card) =>{
    if (card.matched) return'bg-green-100 border-green-400 text-green-700 scale-95 opacity-70';
    if (wrongPair.includes(card.id)) return'bg-red-100 border-red-400 text-red-700 animate-shake';
    if (selected.includes(card.id)) {
      return card.type ==='en'?'bg-purple-200 border-purple-500 text-purple-800 scale-105 shadow-xl':'bg-pink-200 border-pink-500 text-pink-800 scale-105 shadow-xl';
    }
    return card.type ==='en'?'bg-white border-purple-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50 hover:scale-105 cursor-pointer':'bg-white border-pink-200 text-gray-800 hover:border-pink-400 hover:bg-pink-50 hover:scale-105 cursor-pointer';
  };

  const config = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

  // Start screen
  if (!difficulty) {
    return (<><Header /><main className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-pink-50 to-purple-50 pb-16"><div className="max-w-2xl mx-auto px-4 pt-10"><Link href="/games" className="text-purple-600 font-bold text-sm hover:underline">← Quay lại</Link><div className="text-center mt-6"><div className="text-6xl mb-4"></div><h1 className="text-3xl font-black text-gray-800 mb-2">Ghép cặp từ vựng</h1><p className="text-gray-500 mb-8">Nối từ tiếng Anh với nghĩa tiếng Việt tương ứng trước khi hết giờ!</p></div><div className="space-y-3">{(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) =>(<button
                  key={diff}
                  onClick={() =>startGame(diff)}
                  className={`w-full bg-gradient-to-r ${DIFFICULTY_CONFIG[diff].color} text-white rounded-2xl p-5 text-left hover:scale-[1.02] transition-transform shadow-lg`}
                ><div className="font-black text-lg">{DIFFICULTY_CONFIG[diff].label}</div><div className="text-white/80 text-sm mt-1">{DIFFICULTY_CONFIG[diff].pairs} cặp từ · {DIFFICULTY_CONFIG[diff].time}s</div></button>))}</div></div></main></>);
  }

  const totalPairs = config!.pairs;
  const pct = Math.round((matchedPairs.length / totalPairs) * 100);

  return (<><Header /><main className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-pink-50 to-purple-50 pb-16"><div className="max-w-3xl mx-auto px-4 pt-6">{/* Top bar */}<div className="flex items-center justify-between mb-4"><Link href="/games" className="text-purple-600 font-bold text-sm hover:underline">← Quay lại</Link><div className="flex items-center gap-3 text-sm font-bold"><span className="bg-white px-3 py-1 rounded-full shadow text-gray-700">{matchedPairs.length}/{totalPairs}</span><span className="bg-white px-3 py-1 rounded-full shadow text-gray-700">{moves}</span><span className={`px-3 py-1 rounded-full shadow font-black ${
                timeLeft<= 15 ?'bg-red-100 text-red-600 animate-pulse':'bg-white text-gray-700'}`}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2,'0')}</span></div></div>{/* Progress bar */}<div className="w-full bg-purple-100 rounded-full h-3 mb-6"><div
              className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width:`${pct}%`}}
            /></div>{/* Legend */}<div className="flex gap-3 justify-center mb-4 text-xs font-bold"><span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">🇬🇧 Tiếng Anh</span><span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full">🇻🇳 Tiếng Việt</span></div>{/* Card grid */}<div className="grid grid-cols-3 sm:grid-cols-4 gap-3">{cards.map(card =>(<button
                key={card.id}
                onClick={() =>handleCardClick(card.id)}
                disabled={card.matched || gameOver || won}
                className={`border-2 rounded-2xl p-3 min-h-[64px] text-sm font-bold text-center transition-all duration-200 flex items-center justify-center ${getCardStyle(card)}`}
              >{card.matched ?'✓': card.text}</button>))}</div>{/* Game Over Overlay */}
          {(gameOver || won) && (<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full"><div className="text-6xl mb-4">{won ?'':''}</div><h2 className="text-2xl font-black text-gray-800 mb-2">{won ?'Xuất sắc!':'Hết giờ!'}</h2><p className="text-gray-500 mb-2">{won
                    ?`Ghép đúng tất cả ${totalPairs} cặp chỉ với ${moves} lần!`:`Bạn đã ghép được ${matchedPairs.length}/${totalPairs} cặp.`}</p><div className="text-4xl font-black text-fuchsia-600 mb-6">{matchedPairs.length}/{totalPairs}</div><div className="flex gap-3 justify-center flex-wrap"><button
                    onClick={() =>startGame(difficulty)}
                    className="bg-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-fuchsia-700 transition"
                  >Chơi lại</button><button
                    onClick={() =>setDifficulty(null)}
                    className="bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-300 transition"
                  >Đổi độ khó</button><Link href="/games" className="bg-gray-100 text-gray-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">Về trang games</Link></div></div></div>)}</div></main></>);
}
