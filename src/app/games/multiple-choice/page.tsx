'use client';

import { useState, useEffect, useRef } from'react';
import Link from'next/link';
import Header from'@/components/layout/Header';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const QUESTIONS_BY_DIFFICULTY: Record<string, Question[]>= {
  beginner: [
    { id: 1, question: "What color is the sky?", options: ["Blue", "Red", "Green", "Yellow"], answer: "Blue", explanation: "The sky appears blue due to the scattering of sunlight." },
    { id: 2, question: "Which animal barks?", options: ["Cat", "Dog", "Fish", "Bird"], answer: "Dog", explanation: "Dogs bark. Cats meow." },
    { id: 3, question: "What do you drink in the morning?", options: ["Tea", "Juice", "Soda", "Wine"], answer: "Tea", explanation: "Tea is a common morning drink." },
    { id: 4, question: "Which is a fruit?", options: ["Apple", "Car", "Chair", "Book"], answer: "Apple", explanation: "Apple is a fruit." },
    { id: 5, question: "What do you use to write?", options: ["Pen", "Spoon", "Shoe", "Hat"], answer: "Pen", explanation: "A pen is used for writing." },
    { id: 6, question: "Which is a day of the week?", options: ["Monday", "January", "Summer", "Dog"], answer: "Monday", explanation: "Monday is a day of the week." },
    { id: 7, question: "What do you wear on your feet?", options: ["Socks", "Gloves", "Hat", "Shirt"], answer: "Socks", explanation: "Socks are worn on your feet." },
    { id: 8, question: "Which is a vegetable?", options: ["Carrot", "Apple", "Cake", "Milk"], answer: "Carrot", explanation: "Carrot is a vegetable." },
    { id: 9, question: "What do you read?", options: ["Book", "Shoe", "Egg", "Tree"], answer: "Book", explanation: "You read a book." },
    { id: 10, question: "Which is a season?", options: ["Winter", "Monday", "Dog", "Pen"], answer: "Winter", explanation: "Winter is a season." },
    { id: 11, question: "What do you eat for breakfast?", options: ["Eggs", "Shoes", "Books", "Cars"], answer: "Eggs", explanation: "Eggs are a common breakfast food." },
    { id: 12, question: "Which animal can fly?", options: ["Bird", "Dog", "Cat", "Fish"], answer: "Bird", explanation: "Birds can fly with their wings." },
    { id: 13, question: "What do you use to cut paper?", options: ["Scissors", "Pen", "Book", "Spoon"], answer: "Scissors", explanation: "Scissors are used to cut paper." },
    { id: 14, question: "Which is a drink?", options: ["Juice", "Chair", "Hat", "Shoe"], answer: "Juice", explanation: "Juice is a drink." },
    { id: 15, question: "What do you wear on your head?", options: ["Hat", "Socks", "Book", "Car"], answer: "Hat", explanation: "A hat is worn on your head." },
    { id: 16, question: "Which is a pet?", options: ["Cat", "Car", "Book", "Tree"], answer: "Cat", explanation: "A cat is a pet." },
    { id: 17, question: "What do you use to eat soup?", options: ["Spoon", "Pen", "Shoe", "Hat"], answer: "Spoon", explanation: "A spoon is used to eat soup." },
    { id: 18, question: "Which is a color?", options: ["Red", "Dog", "Book", "Car"], answer: "Red", explanation: "Red is a color." },
    { id: 19, question: "What do you use to call someone?", options: ["Phone", "Book", "Shoe", "Pen"], answer: "Phone", explanation: "A phone is used to call someone." },
    { id: 20, question: "Which is a vehicle?", options: ["Car", "Dog", "Book", "Pen"], answer: "Car", explanation: "A car is a vehicle." },
    { id: 21, question: "What do you sleep on?", options: ["Bed", "Chair", "Floor", "Wall"], answer: "Bed", explanation: "A bed is used for sleeping." },
    { id: 22, question: "Which animal says moo?", options: ["Cow", "Dog", "Cat", "Bird"], answer: "Cow", explanation: "Cows say moo." },
    { id: 23, question: "Which is hot?", options: ["Fire", "Ice", "Snow", "Water"], answer: "Fire", explanation: "Fire is hot." },
    { id: 24, question: "What do you sit on?", options: ["Chair", "Wall", "Door", "Window"], answer: "Chair", explanation: "A chair is used for sitting." },
    { id: 25, question: "Which is cold?", options: ["Ice", "Fire", "Sun", "Oven"], answer: "Ice", explanation: "Ice is cold." },
    { id: 26, question: "Which is round?", options: ["Ball", "Book", "Door", "Wall"], answer: "Ball", explanation: "A ball is round." },
    { id: 27, question: "What gives light?", options: ["Sun", "Moon", "Star", "Cloud"], answer: "Sun", explanation: "The sun gives light." },
    { id: 28, question: "Which is sweet?", options: ["Sugar", "Salt", "Pepper", "Vinegar"], answer: "Sugar", explanation: "Sugar is sweet." },
    { id: 29, question: "Which is big?", options: ["Elephant", "Ant", "Bee", "Fly"], answer: "Elephant", explanation: "An elephant is big." },
    { id: 30, question: "What is green?", options: ["Grass", "Sky", "Sun", "Moon"], answer: "Grass", explanation: "Grass is green." },
  ],
  intermediate: [
    { id: 31, question: "Which animal can swim?", options: ["Fish", "Cat", "Dog", "Bird"], answer: "Fish", explanation: "Fish swim in water." },
    { id: 32, question: "What do you use to open a door?", options: ["Key", "Book", "Pen", "Spoon"], answer: "Key", explanation: "A key is used to open a door." },
    { id: 33, question: "Which is a month?", options: ["January", "Monday", "Summer", "Dog"], answer: "January", explanation: "January is a month." },
    { id: 34, question: "What do you wear on your hands?", options: ["Gloves", "Socks", "Hat", "Shirt"], answer: "Gloves", explanation: "Gloves are worn on hands." },
    { id: 35, question: "What do you use to see?", options: ["Eyes", "Ears", "Nose", "Mouth"], answer: "Eyes", explanation: "Eyes are used for seeing." },
    { id: 36, question: "What do you use to listen to music?", options: ["Ears", "Eyes", "Nose", "Mouth"], answer: "Ears", explanation: "Ears are used for hearing." },
    { id: 37, question: "What do you use to eat with?", options: ["Fork", "Pen", "Book", "Shoe"], answer: "Fork", explanation: "A fork is used for eating." },
    { id: 38, question: "What do you use to write on?", options: ["Paper", "Spoon", "Shoe", "Hat"], answer: "Paper", explanation: "Paper is used for writing." },
    { id: 39, question: "What do you use to cut food?", options: ["Knife", "Pen", "Book", "Spoon"], answer: "Knife", explanation: "A knife is used to cut food." },
    { id: 40, question: "What do you use to tell time?", options: ["Watch", "Shoe", "Hat", "Glove"], answer: "Watch", explanation: "A watch is used to tell time." },
    { id: 41, question: "Which is sour?", options: ["Lemon", "Sugar", "Honey", "Candy"], answer: "Lemon", explanation: "Lemons are sour." },
    { id: 42, question: "What do you use to carry things?", options: ["Bag", "Shoe", "Hat", "Sock"], answer: "Bag", explanation: "A bag is used to carry things." },
    { id: 43, question: "Which is a tool?", options: ["Hammer", "Apple", "Bread", "Milk"], answer: "Hammer", explanation: "A hammer is a tool." },
    { id: 44, question: "Which is a body part?", options: ["Hand", "Car", "Tree", "Book"], answer: "Hand", explanation: "A hand is a body part." },
    { id: 45, question: "What do you use to dry yourself?", options: ["Towel", "Knife", "Fork", "Spoon"], answer: "Towel", explanation: "A towel is used to dry yourself." },
    { id: 46, question: "What do you use to cook?", options: ["Stove", "Bed", "Chair", "Table"], answer: "Stove", explanation: "A stove is used for cooking." },
    { id: 47, question: "Which is a shape?", options: ["Circle", "Dog", "Cat", "Tree"], answer: "Circle", explanation: "A circle is a shape." },
    { id: 48, question: "What do you use to measure?", options: ["Ruler", "Spoon", "Cup", "Plate"], answer: "Ruler", explanation: "A ruler is used for measuring." },
    { id: 49, question: "Which is a room?", options: ["Kitchen", "Car", "Tree", "Sky"], answer: "Kitchen", explanation: "A kitchen is a room." },
    { id: 50, question: "Which grows in a garden?", options: ["Flower", "Car", "Phone", "Book"], answer: "Flower", explanation: "Flowers grow in a garden." },
    { id: 51, question: "Which animal has stripes?", options: ["Zebra", "Dog", "Cat", "Cow"], answer: "Zebra", explanation: "Zebras have black and white stripes." },
    { id: 52, question: "What do you use to clean the floor?", options: ["Broom", "Knife", "Pen", "Cup"], answer: "Broom", explanation: "A broom is used to clean the floor." },
    { id: 53, question: "What do you use to wash dishes?", options: ["Soap", "Sugar", "Salt", "Flour"], answer: "Soap", explanation: "Soap is used to wash dishes." },
    { id: 54, question: "What do you use to protect from rain?", options: ["Umbrella", "Hat", "Shoe", "Glove"], answer: "Umbrella", explanation: "An umbrella protects from rain." },
    { id: 55, question: "Which is a direction?", options: ["North", "Dog", "Cat", "Tree"], answer: "North", explanation: "North is a direction." },
  ],
  advanced: [
    { id: 56, question: "Which animal has a long neck?", options: ["Giraffe", "Dog", "Cat", "Fish"], answer: "Giraffe", explanation: "A giraffe is known for its very long neck." },
    { id: 57, question: "What do you use to brush your teeth?", options: ["Toothbrush", "Spoon", "Pen", "Book"], answer: "Toothbrush", explanation: "A toothbrush is used for dental hygiene." },
    { id: 58, question: "Which is a type of transport?", options: ["Train", "Dog", "Book", "Tree"], answer: "Train", explanation: "A train is a type of transport." },
    { id: 59, question: "Which is a farm animal?", options: ["Cow", "Dog", "Cat", "Fish"], answer: "Cow", explanation: "A cow is a farm animal." },
    { id: 60, question: "Which is a wild animal?", options: ["Lion", "Dog", "Cat", "Fish"], answer: "Lion", explanation: "A lion is a wild animal." },
    { id: 61, question: "Which profession treats patients in hospitals?", options: ["Doctor", "Teacher", "Engineer", "Artist"], answer: "Doctor", explanation: "Doctors treat patients in hospitals." },
    { id: 62, question: "What device do you use to calculate numbers?", options: ["Calculator", "Hammer", "Scissors", "Spoon"], answer: "Calculator", explanation: "A calculator is used for calculations." },
    { id: 63, question: "Which instrument measures temperature?", options: ["Thermometer", "Barometer", "Speedometer", "Compass"], answer: "Thermometer", explanation: "A thermometer measures temperature." },
    { id: 64, question: "What profession designs buildings?", options: ["Architect", "Painter", "Writer", "Singer"], answer: "Architect", explanation: "An architect designs buildings." },
    { id: 65, question: "What profession creates software programs?", options: ["Programmer", "Mechanic", "Electrician", "Plumber"], answer: "Programmer", explanation: "A programmer creates software programs." },
    { id: 66, question: "Which is a continent?", options: ["Europe", "Paris", "London", "Tokyo"], answer: "Europe", explanation: "Europe is a continent." },
    { id: 67, question: "Which is a planet?", options: ["Mars", "Sun", "Moon", "Star"], answer: "Mars", explanation: "Mars is a planet." },
    { id: 68, question: "Which is an ocean?", options: ["Pacific", "River", "Lake", "Pond"], answer: "Pacific", explanation: "The Pacific is an ocean." },
    { id: 69, question: "Which is a precious stone?", options: ["Diamond", "Rock", "Sand", "Dirt"], answer: "Diamond", explanation: "A diamond is a precious stone." },
    { id: 70, question: "Which is a metal?", options: ["Gold", "Wood", "Plastic", "Glass"], answer: "Gold", explanation: "Gold is a metal." },
    { id: 71, question: "Which is a type of fish?", options: ["Salmon", "Dog", "Cat", "Bird"], answer: "Salmon", explanation: "Salmon is a type of fish." },
    { id: 72, question: "Which is a type of bird?", options: ["Eagle", "Dog", "Cat", "Fish"], answer: "Eagle", explanation: "An eagle is a type of bird." },
    { id: 73, question: "What profession defends people in court?", options: ["Lawyer", "Judge", "Police", "Detective"], answer: "Lawyer", explanation: "A lawyer defends people in court." },
    { id: 74, question: "What profession studies weather patterns?", options: ["Meteorologist", "Biologist", "Chemist", "Physicist"], answer: "Meteorologist", explanation: "A meteorologist studies weather patterns." },
    { id: 75, question: "What profession studies living organisms?", options: ["Biologist", "Chemist", "Physicist", "Geologist"], answer: "Biologist", explanation: "A biologist studies living organisms." },
  ],
};

const DIFFICULTY_LABELS: Record<string, string>= {
  beginner:'Dễ',
  intermediate:'Trung bình',
  advanced:'Khó',
};

const OPTION_COLORS = ['from-blue-400 to-blue-500','from-purple-400 to-purple-500','from-pink-400 to-pink-500','from-orange-400 to-orange-500',
];

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

  const startGame = (level: string) =>{
    const pool = QUESTIONS_BY_DIFFICULTY[level] || QUESTIONS_BY_DIFFICULTY.beginner;
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
