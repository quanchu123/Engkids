'use client';

import Link from 'next/link';

const EDITABLE_GAMES = [
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nội dung Game</h1>
          <p className="text-gray-600 mt-1">
            Chỉnh sửa câu hỏi cho các game. Để trống sẽ dùng nội dung mặc định có sẵn.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {EDITABLE_GAMES.map((game) => (
            <Link
              key={game.type}
              href={`/admin/games/${game.type}`}
              className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="mb-3 text-4xl">{game.emoji}</div>
              <h2 className="text-xl font-bold text-gray-800">{game.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{game.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-blue-600">
                Chỉnh sửa nội dung →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
