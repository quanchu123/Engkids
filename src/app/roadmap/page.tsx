"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Gamepad2,
  GraduationCap,
  Headphones,
  Layers3,
  Mic,
  Route,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { CURRICULUM_STAGES, getLearnerStageProgress } from '@/lib/curriculum';

const ROADMAP = [
  {
    id: 'sound-play',
    cefr: 'Pre-A1 readiness',
    title: 'Làm quen âm thanh',
    age: '4-6 tuổi hoặc mới bắt đầu',
    weeks: '4-8 tuần',
    color: 'from-sky-400 to-cyan-500',
    focus: ['Nghe hiểu chỉ dẫn ngắn', 'Bắt chước âm và nhịp câu', 'Nhận diện 150-250 từ quen thuộc'],
    canDo: ['Bé hiểu lời chào, màu sắc, số, đồ vật quen thuộc.', 'Bé nhắc lại từ đơn và cụm 2-3 từ.', 'Bé chọn đúng tranh/từ khi nghe tiếng Anh.'],
    engkids: ['Bài hát và video ngắn', 'Memory Match', 'Pet: chăm sóc bằng câu hỏi 1 từ'],
  },
  {
    id: 'starters',
    cefr: 'Pre A1 Starters',
    title: 'Nền tảng từ và câu ngắn',
    age: '6-8 tuổi',
    weeks: '3-5 tháng',
    color: 'from-violet-500 to-fuchsia-500',
    focus: ['Từ vựng gia đình, trường lớp, đồ ăn, động vật', 'Câu mẫu: I like..., This is..., Where is...?', 'Đọc từ/câu rất ngắn'],
    canDo: ['Bé trả lời câu hỏi cá nhân rất đơn giản.', 'Bé ghép Anh-Việt và đọc được câu ngắn có tranh hỗ trợ.', 'Bé viết hoặc kéo thả được từ đơn đúng ngữ cảnh.'],
    engkids: ['Truyện cấp dễ', 'Word Burst, Word Puzzle', 'Progress review để ôn từ đã lưu'],
  },
  {
    id: 'movers',
    cefr: 'A1 Movers',
    title: 'Giao tiếp câu đơn',
    age: '7-10 tuổi',
    weeks: '5-8 tháng',
    color: 'from-emerald-400 to-teal-500',
    focus: ['Hỏi đáp về thói quen, sở thích, nơi chốn', 'Đọc truyện ngắn 80-150 từ', 'Viết cụm và câu đơn'],
    canDo: ['Bé hiểu đoạn hội thoại ngắn có chủ đề quen thuộc.', 'Bé kể lại nội dung truyện bằng 2-4 câu đơn.', 'Bé dùng được thì hiện tại đơn và mệnh lệnh quen thuộc.'],
    engkids: ['English Farm để học từ theo vòng lặp', 'RPG World, Tower Climb', 'Story games sau mỗi truyện'],
  },
  {
    id: 'flyers',
    cefr: 'A2 Flyers',
    title: 'Đọc hiểu và kể chuyện',
    age: '9-12 tuổi',
    weeks: '8-12 tháng',
    color: 'from-amber-400 to-orange-500',
    focus: ['Đọc đoạn 150-300 từ', 'Nghe chi tiết chính trong video/truyện', 'Viết 4-6 câu có trình tự'],
    canDo: ['Bé nắm ý chính và chi tiết trong truyện/video ngắn.', 'Bé mô tả tranh, nhân vật, sự kiện bằng câu nối tiếp.', 'Bé dùng được quá khứ đơn cơ bản và từ nối như because, then, first.'],
    engkids: ['Fill Blanks, Sentence Scramble', 'Video quiz và Story vocab', 'SRS review theo ngày đến hạn'],
  },
  {
    id: 'a2-key-bridge',
    cefr: 'A2 bridge',
    title: 'Tự học có hướng dẫn',
    age: '10+ hoặc bé đã hoàn thành Flyers',
    weeks: '3-6 tháng',
    color: 'from-rose-400 to-pink-500',
    focus: ['Đọc nhiều chủ đề hơn', 'Nói/viết ý kiến đơn giản', 'Tự theo dõi lỗi và mục tiêu tuần'],
    canDo: ['Bé đọc được email, tin nhắn, truyện ngắn đời thường.', 'Bé nói về kế hoạch, trải nghiệm, sở thích bằng đoạn ngắn.', 'Bé biết ôn lại từ yếu và chọn hoạt động phù hợp.'],
    engkids: ['Progress dashboard', 'Today plan', 'Game luyện phản xạ và từ vựng nâng cao'],
  },
];

const DAILY_LOOP = [
  { icon: Headphones, title: 'Nghe 8-12 phút', desc: 'Video hoặc bài hát ngắn để lấy input tự nhiên.' },
  { icon: BookOpen, title: 'Đọc 10 phút', desc: 'Một truyện vừa sức, ưu tiên hiểu ý chính trước.' },
  { icon: Gamepad2, title: 'Chơi 10 phút', desc: 'Game dùng word bank để biến từ mới thành phản xạ.' },
  { icon: Star, title: 'Ôn 5 phút', desc: 'SRS/progress review để từ cũ quay lại đúng lúc.' },
];

const PRINCIPLES = [
  'Đi từ nghe-nói sang đọc-viết, không ép bé viết dài quá sớm.',
  'Lặp xoắn ốc: một từ gặp lại trong truyện, video, game và ôn tập.',
  'Đánh giá bằng can-do: bé làm được gì, không chỉ đúng bao nhiêu câu.',
  'Mỗi buổi ngắn, vui, có phản hồi ngay và có lựa chọn cho bé.',
];

const SOURCES = [
  {
    label: 'Council of Europe - CEFR',
    href: 'https://www.coe.int/en/web/common-european-framework-reference-languages',
  },
  {
    label: 'Cambridge English - Young Learners',
    href: 'https://www.cambridgeenglish.org/exams-and-tests/young-learners-english/',
  },
  {
    label: 'Cambridge English Qualifications for schools',
    href: 'https://www.cambridgeenglish.org/exams-and-tests/qualifications/schools/',
  },
];

export default function RoadmapPage() {
  const progress = useAppStore((state) => state.progress);
  const learner = getLearnerStageProgress(progress);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50 pb-20">
        <section className="mx-auto max-w-6xl px-4 pt-8">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 p-6 text-white shadow-2xl md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_300px] md:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-black uppercase tracking-wide backdrop-blur">
                  <Route className="h-4 w-4" />
                  CEFR + Cambridge Young Learners
                </div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight drop-shadow md:text-5xl">
                  Lộ trình học tiếng Anh quốc tế cho bé
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/90 md:text-base">
                  Engkids đi theo năng lực can-do của CEFR và các mốc Pre A1 Starters, A1 Movers, A2 Flyers. Bé học qua nghe, truyện, game, ôn tập, rồi tiến dần tới tự nói và tự đọc.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/learn/today" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-lg transition-transform hover:-translate-y-0.5">
                    Học hôm nay <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/progress" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-950/25 px-4 py-3 text-sm font-black text-white ring-1 ring-white/30 transition-transform hover:-translate-y-0.5">
                    Xem tiến trình
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/16 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wide text-white/75">Chặng hiện tại</p>
                <p className="mt-2 text-2xl font-black">{learner.stage.cefr}</p>
                <p className="mt-1 text-sm font-black text-white/90">{learner.stage.titleVi}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(learner.percent, 4)}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/86">
                  {learner.percent}% hoàn thành. {learner.missing[0] ?? 'Đã sẵn sàng chuyển sang chặng kế tiếp.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 md:grid-cols-4">
          {DAILY_LOOP.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[1.5rem] bg-white p-4 shadow-md ring-1 ring-slate-100">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-base font-black text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{item.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="mx-auto mt-8 max-w-6xl px-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">5 chặng học</p>
              <h2 className="text-2xl font-black text-slate-950">Từ nghe-nhìn đến tự diễn đạt</h2>
            </div>
            <GraduationCap className="hidden h-9 w-9 text-violet-500 sm:block" />
          </div>

          <div className="space-y-4">
            {ROADMAP.map((visual, index) => {
              const stage = CURRICULUM_STAGES[index] ?? learner.stage;
              const isCurrent = stage.id === learner.stage.id;
              const isDone = index < learner.stageIndex;
              return (
              <article key={stage.id} className={`overflow-hidden rounded-[1.75rem] bg-white shadow-lg ${isCurrent ? 'ring-4 ring-violet-300' : 'ring-1 ring-slate-100'}`}>
                <div className="grid md:grid-cols-[230px_1fr]">
                  <div className={`bg-gradient-to-br ${visual.color} p-5 text-white`}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-xl font-black ring-1 ring-white/30">
                      {isDone ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-wide text-white/76">{stage.cefr}</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight">{stage.titleVi}</h3>
                    <p className="mt-3 text-sm font-bold text-white/85">{stage.ageVi}</p>
                    <p className="mt-1 text-sm font-bold text-white/85">{stage.weeksVi}</p>
                    {isCurrent && <p className="mt-3 rounded-xl bg-white/20 px-3 py-1 text-xs font-black">Đang học</p>}
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-3">
                    <RoadmapColumn title="Trọng tâm" icon={<Target className="h-5 w-5" />} items={stage.focus} />
                    <RoadmapColumn title="Bé làm được" icon={<CheckCircle2 className="h-5 w-5" />} items={stage.canDo} />
                    <RoadmapColumn title="Trên Engkids" icon={<Sparkles className="h-5 w-5" />} items={stage.engkids} />
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-5 px-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-slate-100">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Nguyên tắc thiết kế</p>
                <h2 className="text-xl font-black text-slate-950">Cách Engkids nên vận hành lộ trình</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRINCIPLES.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/55">Đánh giá tháng</p>
                <h2 className="text-xl font-black">Can-do check</h2>
              </div>
            </div>
            <ul className="space-y-3 text-sm font-semibold leading-6 text-white/82">
              <li>Nghe: bé hiểu được mệnh lệnh/câu hỏi quen thuộc chưa?</li>
              <li>Nói: bé tự trả lời bằng từ/câu ngắn chưa?</li>
              <li>Đọc: bé đọc được truyện đúng cấp không cần dịch từng từ chưa?</li>
              <li>Viết: bé điền, kéo thả, hoặc viết câu ngắn đúng mẫu chưa?</li>
            </ul>
            <Link href="/progress" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
              Theo dõi tiến trình <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>

        <section className="mx-auto mt-8 max-w-6xl px-4">
          <div className="rounded-[1.75rem] bg-white/80 p-5 shadow ring-1 ring-white">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Nguồn chuẩn tham khảo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SOURCES.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50">
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function RoadmapColumn({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
        <span className="text-violet-500">{icon}</span>
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold leading-5 text-slate-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
