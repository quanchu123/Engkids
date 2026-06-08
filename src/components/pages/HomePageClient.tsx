'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clapperboard, Music, Play, Sparkles, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Story, Video } from '@/types';
import Header from '@/components/layout/Header';
import BackgroundMusic from '@/components/common/BackgroundMusic';
import { StoryFallbackArtwork, VideoFallbackArtwork } from '@/components/common/FallbackArtwork';
import { DecorIcon } from '@/components/common/DecorIcon';

const GAMES = [
  { id: 'rpg-world', title: 'RPG World', icon: 'game', color: 'from-emerald-400 to-teal-500', href: '/games/rpg-world' },
  { id: 'word-burst', title: 'Word Burst', icon: 'sparkles', color: 'from-violet-500 to-purple-500', href: '/games/word-burst' },
  { id: 'word-puzzle', title: 'Word Puzzle', icon: 'puzzle', color: 'from-blue-500 to-indigo-500', href: '/games/word-puzzle' },
  { id: 'memory-match', title: 'Memory Match', icon: 'story', color: 'from-pink-500 to-rose-500', href: '/games/memory-match' },
];

type HomeStory = Pick<Story, 'id' | 'title_en' | 'title_vi' | 'level' | 'topics' | 'cover_image' | 'estimated_minutes' | 'published'>;

interface HomePageClientProps {
  stories: HomeStory[];
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
    const loadStories = () => fetch(`/api/stories?summary=1&_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stories?: HomeStory[] } | null) => {
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
      if (document.visibilityState !== 'visible') return;
      loadStories();
      loadVideos();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Polling fallback for long-open tabs; BroadcastChannel handles admin edits
    // immediately, so this can stay relaxed.
    const interval = window.setInterval(() => {
      loadStories();
      loadVideos();
    }, 300_000);

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
          <div
            className="hero-card relative overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-violet-600 via-pink-500 to-orange-400 p-6 shadow-2xl md:p-10"
            style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.2), 0 20px 60px rgba(139,92,246,0.4)' }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" aria-hidden>
              <div className="absolute -bottom-8 -left-6 h-24 w-64 rounded-[999px] bg-white/10" />
              <div className="absolute -bottom-10 left-[30%] h-28 w-72 rounded-[999px] bg-white/10" />
              <div className="absolute -bottom-9 right-[8%] h-24 w-60 rounded-[999px] bg-white/10" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-7 md:flex-row">
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                  <Sparkles size={14} aria-hidden="true" />
                  Học qua truyện, video và game
                </div>
                <h1 className="mb-3 text-3xl font-black leading-tight text-white drop-shadow-lg md:text-5xl">
                  Engkids giúp bé học tiếng Anh mỗi ngày
                </h1>
                <p className="mb-6 max-w-xl text-base font-semibold leading-relaxed text-white/90 md:text-lg">
                  Nội dung ngắn, rõ và có hình ảnh để bé dễ chọn bài học. Bắt đầu bằng một truyện, một video hoặc một bài hát.
                </p>

                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link
                    href="/stories"
                    className="btn-kid bg-white text-violet-600 hover:bg-yellow-50"
                    style={{ boxShadow: '0 6px 0 rgba(109,40,217,0.4)' }}
                  >
                    <BookOpen size={20} aria-hidden="true" />
                    Đọc truyện
                  </Link>
                  <Link
                    href="/videos"
                    className="btn-kid bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                    style={{ boxShadow: '0 6px 0 rgba(180,83,9,0.5)' }}
                  >
                    <Clapperboard size={20} aria-hidden="true" />
                    Xem video
                  </Link>
                  <Link
                    href="/music"
                    className="btn-kid bg-pink-400 text-white hover:bg-pink-300"
                    style={{ boxShadow: '0 6px 0 rgba(157,23,77,0.4)' }}
                  >
                    <Music size={20} aria-hidden="true" />
                    Bài hát
                  </Link>
                </div>
              </div>

              <div className="flex-shrink-0 text-center max-sm:-mt-1" aria-hidden>
                <div className="relative inline-block">
                  <div className="deco-float flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/20 shadow-2xl backdrop-blur-sm sm:h-36 sm:w-36 md:h-52 md:w-52"
                    style={{ animationDuration: '3s' }}>
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
                        if (parent) parent.innerHTML = '';
                      }}
                    />
                  </div>
                  <div className="absolute -right-3 -top-3 rounded-2xl border-2 border-purple-200 bg-white px-3 py-1.5 text-xs font-black text-purple-600 shadow-lg deco-float delay-2 sm:text-sm"
                    style={{ animationDuration: '2s' }}>
                    Hello!
                  </div>
                  <div className="absolute -bottom-3 -left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-lg ring-2 ring-amber-200">
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
          <SectionHeader icon="sparkles" title="Bắt đầu học nhé!" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <FeatureCard
              href="/roadmap"
              icon="sparkles"
              title="Lộ trình"
              count={5}
              unit="chặng"
              gradient="from-indigo-500 to-sky-500"
              bg="bg-indigo-50"
            />
            <FeatureCard
              href="/games"
              icon="game"
              title="Game"
              count={6}
              unit="trò chơi"
              gradient="from-emerald-400 to-teal-500"
              bg="bg-emerald-50"
            />
            <FeatureCard
              href="/stories"
              icon="story"
              title="Truyện tranh"
              count={liveStories.length}
              unit="truyện"
              gradient="from-blue-500 to-cyan-400"
              bg="bg-blue-50"
            />
            <FeatureCard
              href="/videos"
              icon="video"
              title="Video học"
              count={liveVideos.length}
              unit="video"
              gradient="from-violet-500 to-pink-400"
              bg="bg-violet-50"
            />
            <FeatureCard
              href="/music"
              icon="mic"
              title="Học nhạc"
              count={liveMusicVideos.length}
              unit="bài hát"
              gradient="from-pink-500 to-rose-400"
              bg="bg-pink-50"
            />
            <FeatureCard
              href="/progress"
              icon="progress"
              title="Tiến trình"
              count={totalStars}
              unit="sao"
              gradient="from-amber-400 to-orange-400"
              bg="bg-amber-50"
            />
          </div>
        </div>
      </section>

      <div className="max-w-full overflow-hidden bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400 py-2.5 shadow-inner">
        <div className="inline-flex min-w-max gap-8 whitespace-nowrap will-change-transform" style={{ animation: 'marquee 18s linear infinite' }}>
          {['Giỏi lắm!', 'Tuyệt vời!', 'Xuất sắc!', 'Cố lên!', 'Học nào!', 'Tiếp tục!',
            'Giỏi lắm!', 'Tuyệt vời!', 'Xuất sắc!', 'Cố lên!', 'Học nào!', 'Tiếp tục!'].map((t, i) => (
            <span key={i} className="text-sm font-black text-white">{t}</span>
          ))}
        </div>
      </div>

      {liveStories.length > 0 && (
        <section className="px-4 py-6">
          <div className="section-shell section-shell-sky max-w-6xl mx-auto rounded-[24px] p-5 md:p-6">
            <SectionHeader icon="story" title="Truyện nổi bật" href="/stories" hrefLabel="Xem tất cả" color="text-blue-700" />
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
          <SectionHeader icon="game" title="Game học tiếng Anh" href="/games" hrefLabel="Xem tất cả" color="text-emerald-700" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {GAMES.map((game) => (
              <Link key={game.id} href={game.href}>
                <div className="playful-card group cursor-pointer rounded-[18px] border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-3xl shadow-sm`}>
                      <DecorIcon name={game.icon} iconClassName="h-8 w-8 text-white" imageClassName="h-10 w-10 object-contain" />
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
            <SectionHeader icon="video" title="Video mới nhất" href="/videos" hrefLabel="Xem tất cả" color="text-violet-700" />
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
            <SectionHeader icon="music" title="Bài hát vui nhộn" href="/music" hrefLabel="Xem tất cả" color="text-pink-700" />
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
            <DecorIcon
              name="story"
              className="deco-float mx-auto mb-4 h-20 w-20 rounded-3xl bg-violet-100 text-violet-600 shadow-sm"
              iconClassName="h-11 w-11"
              imageClassName="h-16 w-16 object-contain"
            />
            <h3 className="mb-2 text-2xl font-black text-gray-800">Sẵn sàng học chưa?</h3>
            <p className="mb-4 text-gray-600">
              Hãy vào Admin để thêm truyện và video học nhé!
            </p>
            <Link
              href="/admin/login"
              className="btn-kid bg-violet-500 text-white"
              style={{ boxShadow: '0 6px 0 rgba(91,33,182,0.5)' }}
            >
              Vào Admin
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
                if (parent) parent.innerHTML = '';
              }}
            />
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-3">
            {['weather','animals','progress','sparkles','rocket','family','music','story'].map((iconName,i) => (
              <DecorIcon
                key={iconName}
                name={iconName}
                className="deco-float h-9 w-9 rounded-2xl bg-white/65 shadow-sm"
                iconClassName="h-5 w-5 text-violet-600"
                imageClassName="h-7 w-7 object-contain"
                strokeWidth={2.7}
              />
            ))}
          </div>
          <p className="text-sm font-bold text-gray-600">
            Engkids © 2026 · Học tiếng Anh thật vui!
          </p>
          <p className="mt-1 text-xs text-gray-400">Dành cho các bé yêu tiếng Anh</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon, title, href, hrefLabel, color = 'text-gray-800' }: {
  icon: string; title: string; href?: string; hrefLabel?: string; color?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-white text-2xl shadow-sm">
          <DecorIcon name={icon} iconClassName="h-6 w-6 text-slate-700" imageClassName="h-8 w-8 object-contain" />
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
  href, icon, title, count, unit, gradient, bg,
}: {
  href: string; icon: string; title: string; count: number; unit: string;
  gradient: string; bg: string;
}) {
  return (
    <Link href={href}>
      <div className={`${bg} playful-card group cursor-pointer rounded-[20px] border border-white/90 p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md`}>
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-sm transition-transform group-hover:scale-105`}>
          <DecorIcon name={icon} iconClassName="h-7 w-7 text-white" imageClassName="h-9 w-9 object-contain" />
        </div>
        <h3 className="mb-1 text-sm font-black text-gray-800 md:text-base">{title}</h3>
        <p className="text-2xl font-black text-gray-700">
          {count} <span className="text-sm font-bold text-gray-400">{unit}</span>
        </p>
      </div>
    </Link>
  );
}

function StoryCard({ story }: { story: HomeStory }) {
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
              {story.level}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCard({ video }: { video: Video }) {
  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
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
              <Play className="ml-0.5 h-5 w-5 text-slate-900" fill="currentColor" aria-hidden="true" />
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
  const iconNames = ['mic', 'music', 'sparkles', 'story'];
  const gradient = gradients[colorIndex % gradients.length];
  const iconName = iconNames[colorIndex % iconNames.length];

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="playful-card group cursor-pointer overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
        <div className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <VideoFallbackArtwork video={video} icon={iconName} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
              <Play className="ml-0.5 h-5 w-5 text-slate-900" fill="currentColor" aria-hidden="true" />
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
