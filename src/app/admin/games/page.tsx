'use client';

import Link from 'next/link';

const EDITABLE_GAMES = [
  {
    type: 'word-bank',
    title: 'Kho từ vựng (6 game)',
    desc: 'Danh sách từ Anh-Việt dùng chung cho: RPG World, Word Burst, Word Puzzle, Memory Match, Tower Word, Tower Climb.',
    emoji: '📚',
  },
  {
    type: 'multiple-choice',
    title: 'Trắc nghiệm (Multiple Choice)',
    desc: 'Câu hỏi nhiều lựa chọn theo 3 cấp độ.',
    emoji: '📝',
  },
  {
    type: 'true-false',
    title: 'Đúng / Sai (True / False)',
    desc: 'Câu khẳng định đúng hoặc sai theo 3 cấp độ.',
    emoji: '✅',
  },
];

export default function AdminGamesPage() {
  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-1 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Nội dung học</p>
        <h1 className="text-2xl font-black text-admin-text">Nội dung Game</h1>
        <p className="text-sm text-admin-text-muted">
          Chỉnh sửa câu hỏi cho các game. Để trống sẽ dùng nội dung mặc định có sẵn.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {EDITABLE_GAMES.map((game) => (
          <Link
            key={game.type}
            href={`/admin/games/${game.type}`}
            className="admin-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-admin-lg"
          >
            <div className="mb-3 text-4xl">{game.emoji}</div>
            <h2 className="text-xl font-black text-admin-text">{game.title}</h2>
            <p className="mt-1 text-sm text-admin-text-muted">{game.desc}</p>
            <span className="mt-4 inline-block text-sm font-black text-admin-primary">
              Chỉnh sửa nội dung →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
