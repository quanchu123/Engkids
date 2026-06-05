'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clapperboard, Gamepad2, Music, Sparkles, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Story, Video } from '@/types';
import Header from '@/components/layout/Header';
import BackgroundMusic from '@/components/common/BackgroundMusic';
import { StoryFallbackArtwork, VideoFallbackArtwork } from '@/components/common/FallbackArtwork';

const GAMES = [
  { id: 'rpg-world', title: 'RPG World', icon: '🗺️', color: 'from-emerald-400 to-teal-500', href: '/games/rpg-world' },
  { id: 'word-burst', title: 'Word Burst', icon: '💥', color: 'from-violet-500 to-purple-500', href: '/games/word-burst' },
  { id: 'word-puzzle', title: 'Word Puzzle', icon: '🧩', color: 'from-blue-500 to-indigo-500', href: '/games/word-puzzle' },
  { id: 'memory-match', title: 'Memory Match', icon: '🃏', color: 'from-pink-500 to-rose-500', href: '/games/memory-match' },
];

interface HomePageClientProps {
  stories: Story[];
  videos: Video[];
  musicVideos: Video[];
}

export default function HomePageClient({ stories, videos, musicVideos }: HomePageClientProps) {
  const [liveStories, setLiveStories] = useState(stories);
  const [liveVideos, setLiveVideos] = useState(videos);
  const [liveMusicVideos, setLiveMusicVideos] = useState(musicVideos);
  const totalStars = useAppStore(state => state.progress.totalStars);
  const updateStreak = useAppStore(state => state.updateStreak);

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  useEffect(() => {
    let cancelled = false;
    const loadStories = () => fetch(`/api/stories?_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stories?: Story[] } | null) => {
        if (!cancelled && Array.isArray(data?.stories)) {
          setLiveStories(data.stories);
        }
      })
      .catch(() => {});
    const loadVideos = () => fetch(`/api/videos?_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { videos?: Video[] } | null) => {
        if (cancelled || !Array.isArray(data?.videos)) return;
        setLiveVideos(data.videos.filter((video) => video.category === 'video'));
        setLiveMusicVideos(data.videos.filter((video) => video.category === 'music'));
      })
      .catch(() => {});
    const handleFocus = () => {
      loadStories();
      loadVideos();
    };
    loadStories();
    loadVideos();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Polling fallback: refresh every 30s so background tabs pick up admin
    // changes without needing a focus event.
    const interval = window.setInterval(() => {
      loadStories();
      loadVideos();
    }, 30_000);

    // Cross-tab sync: when another tab (e.g. admin) dispatches a content
    // change event, refresh immediately.
    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('engkids-content')
      : null;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'content-changed') {
        loadStories();
        loadVideos();
      }
    };
    channel?.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      channel?.removeEventListener('message', onMessage);
      channel?.close();
    };
  }, []);

  return (
    <div className="home-shell min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50">
      <Header />
      <BackgroundMusic />

      <section className="relative overflow-hidden px-4 pb-2 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="hero-card relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-sky-50 via-violet-50 to-amber-50 md:block" aria-hidden />
            <div className="pointer-events-none absolute left-6 top-6 h-2 w-24 rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-300" aria-hidden />

            <div className="relative z-10 flex flex-col items-center gap-7 md:flex-row">
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">
                  <Sparkles size={14} aria-hidden="true" />
                  Học qua truyện, video và game
                </div>
                <h1 className="mb-3 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                  Engkids giúp bé học tiếng Anh mỗi ngày
                </h1>
                <p className="mb-6 max-w-xl text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
                  Nội dung ngắn, rõ và có hình ảnh để bé dễ chọn bài học. Bắt đầu bằng một truyện, một video hoặc một bài hát.
                </p>

                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link
                    href="/stories"
                    className="btn-kid bg-slate-950 text-white hover:bg-slate-800"
                  >
                    <BookOpen size={20} aria-hidden="true" />
                    Đọc truyện
                  </Link>
                  <Link
                    href="/videos"
                    className="btn-kid bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <Clapperboard size={20} aria-hidden="true" />
                    Xem video
                  </Link>
                  <Link
                    href="/music"
                    className="btn-kid bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <Music size={20} aria-hidden="true" />
                    Bài hát
                  </Link>
                </div>
              </div>

              <div className="flex-shrink-0 text-center max-sm:-mt-1" aria-hidden>
                <div className="relative inline-block">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl sm:h-36 sm:w-36 md:h-52 md:w-52">
                    <Image
                      src="/engkids-logo.png"
                      alt="Engkids mascot"
                      width={200}
                      height={200}
                      className="scale-110 object-contain"
                      priority
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML = '<span style="font-size:6rem;line-height:1">🐨</span>';
                      }}
                    />
                  </div>
                  <div className="absolute -right-3 -top-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm sm:text-sm">
                    Hello!
                  </div>
                  <div className="absolute -bottom-3 -left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-100">
                    <Star size={22} fill="currentColor" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden" aria-hidden>
          <svg viewBox="0 0 1440 32" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,32 C360,0 1080,32 1440,16 L1440,32 Z" fill="rgb(253,242,248)" />
          </svg>
        </div>
      </section>

      <section className="px-4 py-6">
          <div className="section-shell section-shell-amber max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
          <SectionHeader emoji="🎯" title="Bắt đầu học nhé!" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <FeatureCard
              href="/games"
              emoji="🎮"
              title="Game"
              count={6}
              unit="trò chơi"
              gradient="from-emerald-400 to-teal-500"
              bg="bg-emerald-50"
            />
            <FeatureCard
              href="/stories"
              emoji="📖"
              title="Truyện tranh"
              count={liveStories.length}
              unit="truyện"
              gradient="from-blue-500 to-cyan-400"
              bg="bg-blue-50"
            />
            <FeatureCard
              href="/videos"
              emoji="🎬"
              title="Video học"
              count={liveVideos.length}
              unit="video"
              gradient="from-violet-500 to-pink-400"
              bg="bg-violet-50"
            />
            <FeatureCard
              href="/music"
              emoji="🎤"
              title="Học nhạc"
              count={liveMusicVideos.length}
              unit="bài hát"
              gradient="from-pink-500 to-rose-400"
              bg="bg-pink-50"
            />
            <FeatureCard
              href="/progress"
              emoji="⭐"
              title="Tiến trình"
              count={totalStars}
              unit="sao"
              gradient="from-amber-400 to-orange-400"
              bg="bg-amber-50"
            />
          </div>
        </div>
      </section>

      <div className="max-w-full overflow-hidden border-y border-slate-200/80 bg-white/82 py-2 shadow-sm backdrop-blur">
        <div className="inline-flex min-w-max gap-5 whitespace-nowrap will-change-transform" style={{ animation: 'marquee 24s linear infinite' }}>
          {['Giỏi lắm!', 'Tuyệt vời!', 'Học nào!', 'Tiếp tục!', 'Cố lên!', 'Xuất sắc!',
            'Giỏi lắm!', 'Tuyệt vời!', 'Học nào!', 'Tiếp tục!', 'Cố lên!', 'Xuất sắc!'].map((t, i) => (
            <span key={i} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
              {t}
            </span>
          ))}
        </div>
      </div>

      {liveStories.length > 0 && (
        <section className="px-4 py-6">
          <div className="section-shell section-shell-sky max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
            <SectionHeader emoji="📚" title="Truyện nổi bật" href="/stories" hrefLabel="Xem tất cả" color="text-blue-700" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {liveStories.slice(0, 4).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-6">
          <div className="section-shell section-shell-mint max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
          <SectionHeader emoji="🎮" title="Game học tiếng Anh" href="/games" hrefLabel="Xem tất cả" color="text-emerald-700" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GAMES.map((game) => (
              <Link key={game.id} href={game.href}>
                <div className="playful-card group cursor-pointer rounded-[18px] border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-3xl shadow-sm`}>
                    {game.icon}
                  </div>
                  <p className="text-sm font-bold text-gray-800">{game.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {liveStories.length > 0 && liveVideos.length > 0 && (
        <div aria-hidden className="-mt-2 h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 C360,48 1080,0 1440,32 L1440,48 L0,48 Z" fill="rgb(237,233,254)" />
          </svg>
        </div>
      )}

      {liveVideos.length > 0 && (
        <section className="bg-violet-50/60 px-4 py-6">
          <div className="section-shell section-shell-violet max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
            <SectionHeader emoji="🎬" title="Video mới nhất" href="/videos" hrefLabel="Xem tất cả" color="text-violet-700" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {liveVideos.slice(0, 4).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {liveVideos.length > 0 && liveMusicVideos.length > 0 && (
        <div aria-hidden className="h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,48 C480,0 960,48 1440,16 L1440,0 L0,0 Z" fill="rgb(237,233,254)" />
          </svg>
        </div>
      )}

      {liveMusicVideos.length > 0 && (
        <section className="px-4 py-6">
          <div className="section-shell section-shell-pink max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
            <SectionHeader emoji="🎵" title="Bài hát vui nhộn" href="/music" hrefLabel="Xem tất cả" color="text-pink-700" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {liveMusicVideos.slice(0, 4).map((video, index) => (
                <MusicCard key={video.id} video={video} colorIndex={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {liveStories.length === 0 && liveVideos.length === 0 && liveMusicVideos.length === 0 && (
        <section className="px-4 py-8">
          <div className="max-w-md mx-auto rounded-3xl border-4 border-purple-100 bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-7xl deco-float">🎒</div>
            <h3 className="mb-2 text-2xl font-black text-gray-800">Sẵn sàng học chưa?</h3>
            <p className="mb-4 text-gray-600">
              Hãy vào Admin để thêm truyện và video học nhé!
            </p>
            <Link
              href="/admin/login"
              className="btn-kid bg-violet-500 text-white"
              style={{ boxShadow: '0 6px 0 rgba(91,33,182,0.5)' }}
            >
              ⚙️ Vào Admin
            </Link>
          </div>
        </section>
      )}

      <footer className="relative mt-4 border-t-4 border-white bg-gradient-to-r from-violet-100 via-pink-100 to-amber-100 px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="deco-float relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
            <Image src="/engkids-logo.png" alt="Engkids" fill className="object-contain" sizes="64px"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) parent.innerHTML = '<span style="font-size:3rem;line-height:1">🐨</span>';
              }}
            />
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-3">
            {['🌈','🦄','⭐','🎉','🚀','💖','🎵','📚'].map((e,i) => (
              <span key={i} className="text-2xl deco-float" style={{ animationDelay: `${i*0.2}s`, animationDuration: `${2+i*0.3}s` }}>{e}</span>
            ))}
          </div>
          <p className="text-sm font-bold text-gray-600">
            Engkids © 2026 · Học tiếng Anh thật vui! 💖
          </p>
          <p className="mt-1 text-xs text-gray-400">Dành cho các bé yêu tiếng Anh 🌟</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ emoji, title, href, hrefLabel, color = 'text-gray-800' }: {
  emoji: string; title: string; href?: string; hrefLabel?: string; color?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-white text-2xl shadow-sm">
          {emoji}
        </div>
        <div>
          <h2 className={`text-xl md:text-2xl font-black ${color}`}>{title}</h2>
          <div className="mt-1 h-1.5 w-14 rounded-full bg-gradient-to-r from-yellow-300 via-pink-300 to-sky-300" />
        </div>
      </div>
      {href && hrefLabel && (
        <Link href={href} className="flex min-h-[40px] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-950">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

function FeatureCard({
  href, emoji, title, count, unit, gradient, bg,
}: {
  href: string; emoji: string; title: string; count: number; unit: string;
  gradient: string; bg: string;
}) {
  return (
    <Link href={href}>
      <div className={`${bg} playful-card group cursor-pointer rounded-[20px] border border-white/90 p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md`}>
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-sm transition-transform group-hover:scale-105`}>
          <span className="text-3xl">{emoji}</span>
        </div>
        <h3 className="mb-1 text-sm font-black text-gray-800 md:text-base">{title}</h3>
        <p className="text-2xl font-black text-gray-700">
          {count} <span className="text-sm font-bold text-gray-400">{unit}</span>
        </p>
      </div>
    </Link>
  );
}

function StoryCard({ story }: { story: Story }) {
  const levelColors = {
    Beginner: 'bg-green-100 text-green-700',
    Elementary: 'bg-blue-100 text-blue-700',
    Intermediate: 'bg-purple-100 text-purple-700',
  };

  const isImageUrl = story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:');

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="playful-card group cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
          {isImageUrl ? (
            <Image src={story.cover_image} alt={story.title_en} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <StoryFallbackArtwork story={story} />
          )}
        </div>
        <div className="p-3">
          <h3 className="mb-1 truncate text-sm font-black leading-tight text-gray-800">{story.title_en}</h3>
          <p className="mb-2 truncate text-xs text-gray-500">{story.title_vi}</p>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${levelColors[story.level]}`}>
              {story.level === 'Beginner' ? '🌱' : story.level === 'Elementary' ? '🌿' : '🌳'} {story.level}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCard({ video }: { video: Video }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="playful-card group cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-200 to-pink-200">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <VideoFallbackArtwork video={video} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="ml-1 text-xl">▶️</span>
            </div>
          </div>
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="mb-1 truncate text-sm font-black leading-tight text-gray-800">{video.title}</h3>
          <p className="truncate text-xs text-gray-500">{video.titleVi}</p>
        </div>
      </div>
    </Link>
  );
}

function MusicCard({ video, colorIndex }: { video: Video; colorIndex: number }) {
  const gradients = [
    'from-yellow-400 to-orange-400',
    'from-pink-400 to-rose-500',
    'from-blue-400 to-cyan-400',
    'from-green-400 to-emerald-400',
  ];
  const emojis = ['🎤', '🎵', '🎸', '🎹'];
  const gradient = gradients[colorIndex % gradients.length];
  const emoji = emojis[colorIndex % emojis.length];

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="playful-card group cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
        <div className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <VideoFallbackArtwork video={video} icon={emoji} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="ml-1 text-xl">▶️</span>
            </div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="mb-1 truncate text-sm font-black leading-tight text-gray-800">{video.title}</h3>
          <p className="truncate text-xs text-gray-500">{video.titleVi}</p>
        </div>
      </div>
    </Link>
  );
}
