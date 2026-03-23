'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { Story, Video } from '@/types';
import Header from '@/components/layout/Header';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50">
      <div className="h-16 bg-white/50 mb-4" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-48 bg-white/40 rounded-3xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/40 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const totalStars = useAppStore(state => state.progress.totalStars);
  const updateStreak = useAppStore(state => state.updateStreak);
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [musicVideos, setMusicVideos] = useState<Video[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    updateStreak();
    
    const loadData = async () => {
      // Load stories
      const loadedStories = await getAllStories();
      setStories(loadedStories);
      
      // Load videos
      try {
        const response = await fetch('/api/videos');
        const data = await response.json();
        const allVideos = data.videos || [];
        setVideos(allVideos.filter((v: Video) => v.category === 'video'));
        setMusicVideos(allVideos.filter((v: Video) => v.category === 'music'));
      } catch (error) {
        console.error('Failed to load videos:', error);
      }
      
      setIsLoaded(true);
    };
    loadData();
  }, [updateStreak]);

  if (!isLoaded) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50">
      <Header />

      {/* Hero Banner — Duolingo style: text left + mascot right */}
      <section className="relative px-4 pt-8 pb-0 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 via-pink-500 to-orange-400 p-7 md:p-12 shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.2), 0 20px 60px rgba(139,92,246,0.4)' }}>
            {/* Floating background deco */}
            <span aria-hidden className="absolute top-4 left-[55%] text-5xl opacity-20 deco-twinkle delay-1">⭐</span>
            <span aria-hidden className="absolute top-12 right-[8%] text-4xl opacity-25 deco-float delay-3">🌈</span>
            <span aria-hidden className="absolute bottom-6 left-[50%] text-5xl opacity-20 deco-float delay-2">✨</span>
            <span aria-hidden className="absolute top-6 right-[25%] text-3xl opacity-20 deco-spin">🌟</span>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              {/* Text */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
                  🚀 Học tiếng Anh cùng Engkids!
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg leading-tight">
                  Chào mừng bé đến với<br/>
                  <span className="text-yellow-300 drop-shadow-xl">Engkids! 🎉</span>
                </h1>
                <p className="text-base md:text-lg text-white/90 mb-6 max-w-xl">
                  Học tiếng Anh siêu vui qua truyện tranh, video hoạt hình và bài hát! 
                  Bấm vào từ để học nghĩa ngay nhé! 🚀
                </p>
                
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Link 
                    href="/stories"
                    className="btn-kid bg-white text-violet-600 hover:bg-yellow-50"
                    style={{ boxShadow: '0 6px 0 rgba(109,40,217,0.4)' }}
                  >
                    📚 Đọc truyện
                  </Link>
                  <Link 
                    href="/videos"
                    className="btn-kid bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                    style={{ boxShadow: '0 6px 0 rgba(180,83,9,0.5)' }}
                  >
                    🎬 Xem video
                  </Link>
                  <Link 
                    href="/music"
                    className="btn-kid bg-pink-400 text-white hover:bg-pink-300"
                    style={{ boxShadow: '0 6px 0 rgba(157,23,77,0.4)' }}
                  >
                    🎵 Bài hát
                  </Link>
                </div>
              </div>

              {/* Mascot — big Engkids logo (Duolingo-style) */}
              <div className="flex-shrink-0 text-center" aria-hidden>
                <div className="relative inline-block">
                  <div className="deco-float w-36 h-36 md:w-52 md:h-52 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 flex items-center justify-center shadow-2xl overflow-hidden"
                    style={{ animationDuration: '3s' }}>
                    <Image
                      src="/engkids-logo.png"
                      alt="Engkids mascot"
                      width={200}
                      height={200}
                      className="object-contain scale-110"
                      priority
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML = '<span style="font-size:6rem;line-height:1">🐨</span>';
                      }}
                    />
                  </div>
                  {/* Speech bubble */}
                  <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-3 py-1.5 shadow-lg text-sm font-black text-purple-600 border-2 border-purple-200 deco-float delay-2"
                    style={{ animationDuration: '2s' }}>
                    Hello! 👋
                  </div>
                  {/* Star badges */}
                  <span className="absolute -bottom-2 -left-2 text-3xl deco-twinkle delay-1">⭐</span>
                  <span className="absolute top-2 -left-4 text-2xl deco-twinkle delay-4">✨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Wave bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden" aria-hidden>
          <svg viewBox="0 0 1440 32" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,32 C360,0 1080,32 1440,16 L1440,32 Z" fill="rgb(253,242,248)" />
          </svg>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader emoji="🎯" title="Bắt đầu học nhé!" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureCard 
              href="/stories"
              emoji="📖"
              title="Truyện tranh"
              count={stories.length}
              unit="truyện"
              gradient="from-blue-500 to-cyan-400"
              shadow="rgba(6,182,212,0.5)"
              bg="bg-blue-50"
            />
            <FeatureCard 
              href="/videos"
              emoji="🎬"
              title="Video học"
              count={videos.length}
              unit="video"
              gradient="from-violet-500 to-pink-400"
              shadow="rgba(139,92,246,0.5)"
              bg="bg-violet-50"
            />
            <FeatureCard 
              href="/music"
              emoji="🎤"
              title="Học nhạc"
              count={musicVideos.length}
              unit="bài hát"
              gradient="from-pink-500 to-rose-400"
              shadow="rgba(244,63,94,0.5)"
              bg="bg-pink-50"
            />
            <FeatureCard 
              href="/progress"
              emoji="⭐"
              title="Tiến trình"
              count={totalStars}
              unit="sao"
              gradient="from-amber-400 to-orange-400"
              shadow="rgba(245,158,11,0.5)"
              bg="bg-amber-50"
            />
          </div>
        </div>
      </section>

      {/* Motivation stripe */}
      <div className="overflow-hidden bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400 py-2.5 shadow-inner">
        <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'marquee 18s linear infinite' }}>
          {['🌟 Giỏi lắm!', '⭐ Tuyệt vời!', '🎉 Xuất sắc!', '🏆 Cố lên!', '💪 Học nào!', '🚀 Tiếp tục!',
            '🌟 Giỏi lắm!', '⭐ Tuyệt vời!', '🎉 Xuất sắc!', '🏆 Cố lên!', '💪 Học nào!', '🚀 Tiếp tục!'].map((t, i) => (
            <span key={i} className="text-white font-black text-sm">{t}</span>
          ))}
        </div>
      </div>

      {/* Stories Section */}
      {stories.length > 0 && (
        <section className="px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <SectionHeader emoji="📚" title="Truyện nổi bật" href="/stories" hrefLabel="Xem tất cả" color="text-blue-700" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.slice(0, 4).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Wave divider */}
      {stories.length > 0 && videos.length > 0 && (
        <div aria-hidden className="h-12 overflow-hidden -mt-2">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 C360,48 1080,0 1440,32 L1440,48 L0,48 Z" fill="rgb(237,233,254)" />
          </svg>
        </div>
      )}

      {/* Videos Section */}
      {videos.length > 0 && (
        <section className="px-4 py-6 bg-violet-50/60">
          <div className="max-w-6xl mx-auto">
            <SectionHeader emoji="🎬" title="Video mới nhất" href="/videos" hrefLabel="Xem tất cả" color="text-violet-700" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.slice(0, 4).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Wave divider */}
      {videos.length > 0 && musicVideos.length > 0 && (
        <div aria-hidden className="h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,48 C480,0 960,48 1440,16 L1440,0 L0,0 Z" fill="rgb(237,233,254)" />
          </svg>
        </div>
      )}

      {/* Music Section */}
      {musicVideos.length > 0 && (
        <section className="px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <SectionHeader emoji="🎵" title="Bài hát vui nhộn" href="/music" hrefLabel="Xem tất cả" color="text-pink-700" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {musicVideos.slice(0, 4).map((video, index) => (
                <MusicCard key={video.id} video={video} colorIndex={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {stories.length === 0 && videos.length === 0 && musicVideos.length === 0 && (
        <section className="px-4 py-8">
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-lg border-4 border-purple-100">
            <div className="text-7xl mb-4 deco-float">🎒</div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">Sẵn sàng học chưa?</h3>
            <p className="text-gray-600 mb-4">
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

      {/* Fun Footer */}
      <footer className="relative px-4 py-8 mt-4 bg-gradient-to-r from-violet-100 via-pink-100 to-amber-100 border-t-4 border-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-3 deco-float relative flex items-center justify-center">
            <Image src="/engkids-logo.png" alt="Engkids" fill className="object-contain" sizes="64px"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) parent.innerHTML = '<span style="font-size:3rem;line-height:1">🐨</span>';
              }}
            />
          </div>
          <div className="flex justify-center gap-3 mb-3 flex-wrap">
            {['🌈','🦄','⭐','🎉','🚀','💖','🎵','📚'].map((e,i) => (
              <span key={i} className="text-2xl deco-float" style={{ animationDelay: `${i*0.2}s`, animationDuration: `${2+i*0.3}s` }}>{e}</span>
            ))}
          </div>
          <p className="text-gray-600 font-bold text-sm">
            Engkids © 2026 · Học tiếng Anh thật vui! 💖
          </p>
          <p className="text-gray-400 text-xs mt-1">Dành cho các bé yêu tiếng Anh 🌟</p>
        </div>
      </footer>
    </div>
  );
}

// Section header component
function SectionHeader({ emoji, title, href, hrefLabel, color = 'text-gray-800' }: {
  emoji: string; title: string; href?: string; hrefLabel?: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl border-2 border-gray-100">
          {emoji}
        </div>
        <h2 className={`text-xl md:text-2xl font-black ${color}`}>{title}</h2>
      </div>
      {href && hrefLabel && (
        <Link href={href} className="text-sm font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-all">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ 
  href, emoji, title, count, unit, gradient, shadow, bg,
}: { 
  href: string; emoji: string; title: string; count: number; unit: string;
  gradient: string; shadow: string; bg: string;
}) {
  return (
    <Link href={href}>
      <div className={`${bg} rounded-3xl p-5 card-bouncy cursor-pointer group border-2 border-white shadow-lg`}>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md`}
          style={{ boxShadow: `0 4px 0 ${shadow}` }}>
          <span className="text-3xl">{emoji}</span>
        </div>
        <h3 className="font-black text-gray-800 mb-1 text-sm md:text-base">{title}</h3>
        <p className="text-3xl font-black text-gray-700">
          {count} <span className="text-sm font-bold text-gray-400">{unit}</span>
        </p>
      </div>
    </Link>
  );
}

// Story Card Component
function StoryCard({ story }: { story: Story }) {
  const levelColors = {
    Beginner: 'bg-green-100 text-green-700',
    Elementary: 'bg-blue-100 text-blue-700',
    Intermediate: 'bg-purple-100 text-purple-700',
  };

  const isImageUrl = story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:');

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-md card-bouncy cursor-pointer group border-2 border-gray-50">
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden relative">
          {isImageUrl ? (
            <Image src={story.cover_image} alt={story.title_en} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <span className="text-5xl group-hover:scale-110 transition-transform">{story.cover_image || '🦄'}</span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-black text-gray-800 text-sm leading-tight truncate mb-1">{story.title_en}</h3>
          <p className="text-xs text-gray-500 truncate mb-2">{story.title_vi}</p>
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

// Video Card Component
function VideoCard({ video }: { video: Video }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-md card-bouncy cursor-pointer group border-2 border-gray-50">
        <div className="aspect-video bg-gradient-to-br from-purple-200 to-pink-200 relative overflow-hidden">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">🎬</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xl ml-1">▶️</span>
            </div>
          </div>
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-bold">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-black text-gray-800 text-sm leading-tight truncate mb-1">{video.title}</h3>
          <p className="text-xs text-gray-500 truncate">{video.titleVi}</p>
        </div>
      </div>
    </Link>
  );
}

// Music Card Component
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
      <div className="bg-white rounded-3xl overflow-hidden shadow-md card-bouncy cursor-pointer group border-2 border-gray-50">
        <div className={`aspect-video bg-gradient-to-br ${gradient} relative overflow-hidden flex items-center justify-center`}>
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <span className="text-6xl group-hover:scale-125 transition-transform drop-shadow-lg">{emoji}</span>
          )}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xl ml-1">▶️</span>
            </div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-black text-gray-800 text-sm leading-tight truncate mb-1">{video.title}</h3>
          <p className="text-xs text-gray-500 truncate">{video.titleVi}</p>
        </div>
      </div>
    </Link>
  );
}
