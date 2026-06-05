import { Story, Video } from '@/types';

type ArtTone = {
  gradient: string;
  accent: string;
  icon: string;
};

const DEFAULT_TONE: ArtTone = {
  gradient: 'from-violet-500 via-fuchsia-400 to-orange-300',
  accent: 'bg-white/20',
  icon: '✨',
};

const ART_TONES: Record<string, ArtTone> = {
  animals: { gradient: 'from-amber-400 via-orange-400 to-rose-400', accent: 'bg-yellow-100/25', icon: '🦁' },
  body: { gradient: 'from-rose-400 via-pink-400 to-violet-500', accent: 'bg-white/20', icon: '🙋' },
  family: { gradient: 'from-pink-400 via-rose-400 to-orange-300', accent: 'bg-white/20', icon: '🏠' },
  food: { gradient: 'from-lime-400 via-emerald-400 to-cyan-400', accent: 'bg-white/25', icon: '🍎' },
  music: { gradient: 'from-pink-500 via-purple-500 to-sky-500', accent: 'bg-white/20', icon: '🎵' },
  nature: { gradient: 'from-emerald-400 via-teal-400 to-sky-400', accent: 'bg-white/25', icon: '🌿' },
  school: { gradient: 'from-blue-500 via-cyan-400 to-emerald-300', accent: 'bg-white/20', icon: '✏️' },
  science: { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', accent: 'bg-white/20', icon: '🔬' },
  space: { gradient: 'from-indigo-600 via-violet-600 to-fuchsia-500', accent: 'bg-white/15', icon: '🚀' },
  weather: { gradient: 'from-sky-400 via-blue-400 to-indigo-400', accent: 'bg-white/25', icon: '☀️' },
};

function normalizeToken(value?: string): string {
  return value?.trim().toLowerCase().replace(/\s+/g, '-') || '';
}

function pickTone(topics?: string[], category?: Video['category'], feature?: string): ArtTone {
  if (category === 'music') return ART_TONES.music;
  const tokens = [feature, ...(topics || [])].map(normalizeToken);
  const found = tokens.find((token) => ART_TONES[token]);
  return found ? ART_TONES[found] : DEFAULT_TONE;
}

export function StoryFallbackArtwork({ story }: { story: Story }) {
  const tone = pickTone(story.topics);
  const topic = story.topics?.[0] || story.level;
  const coverToken = story.cover_image?.trim();
  const icon = coverToken && coverToken.length <= 3 ? coverToken : tone.icon;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${tone.gradient}`}>
      <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full ${tone.accent}`} />
      <div className="absolute -bottom-10 right-2 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
        Story
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/18 p-3 text-white backdrop-blur-sm">
        <div className="mb-1 text-3xl drop-shadow-sm">{icon}</div>
        <div className="line-clamp-2 text-base font-black leading-tight drop-shadow-sm">{story.title_en}</div>
        <div className="mt-1 line-clamp-1 text-xs font-bold text-white/85">{topic}</div>
      </div>
    </div>
  );
}

export function VideoFallbackArtwork({ video, icon }: { video: Video; icon?: string }) {
  const tone = pickTone(video.topics, video.category, video.feature);
  const label = video.feature?.trim() || video.topics?.[0] || video.titleVi || video.title;
  const badge = video.category === 'music' ? 'Song' : 'Lesson';

  return (
    <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${tone.gradient}`}>
      <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full ${tone.accent}`} />
      <div className="absolute -bottom-10 right-3 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
        {badge}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
        <div className="mb-1 text-4xl drop-shadow-md">{icon || tone.icon || (video.category === 'music' ? '🎵' : '🎬')}</div>
        <div className="line-clamp-2 text-base font-black leading-tight drop-shadow-md">{label}</div>
      </div>
    </div>
  );
}
