'use client';

import { Story, Video } from '@/types';
import { DecorIcon } from './DecorIcon';

type ArtTone = {
  gradient: string;
  accent: string;
  icon: string;
};

type StoryArtworkData = Pick<Story, 'title_en' | 'level' | 'topics'>;

const DEFAULT_TONE: ArtTone = {
  gradient: 'from-violet-500 via-fuchsia-400 to-orange-300',
  accent: 'bg-white/20',
  icon: 'sparkles',
};

const ART_TONES: Record<string, ArtTone> = {
  animals: { gradient: 'from-amber-400 via-orange-400 to-rose-400', accent: 'bg-yellow-100/25', icon: 'animals' },
  body: { gradient: 'from-rose-400 via-pink-400 to-violet-500', accent: 'bg-white/20', icon: 'body' },
  family: { gradient: 'from-pink-400 via-rose-400 to-orange-300', accent: 'bg-white/20', icon: 'family' },
  food: { gradient: 'from-lime-400 via-emerald-400 to-cyan-400', accent: 'bg-white/25', icon: 'sparkles' },
  music: { gradient: 'from-pink-500 via-purple-500 to-sky-500', accent: 'bg-white/20', icon: 'music' },
  nature: { gradient: 'from-emerald-400 via-teal-400 to-sky-400', accent: 'bg-white/25', icon: 'weather' },
  school: { gradient: 'from-blue-500 via-cyan-400 to-emerald-300', accent: 'bg-white/20', icon: 'story' },
  science: { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', accent: 'bg-white/20', icon: 'sparkles' },
  space: { gradient: 'from-indigo-600 via-violet-600 to-fuchsia-500', accent: 'bg-white/15', icon: 'space' },
  weather: { gradient: 'from-sky-400 via-blue-400 to-indigo-400', accent: 'bg-white/25', icon: 'weather' },
};

const ICONSCOUT_ASSET_KEYS = new Set([
  'animals',
  'body',
  'family',
  'game',
  'music',
  'rocket',
  'space',
  'story',
  'weather',
]);

function normalizeToken(value?: string): string {
  return value?.trim().toLowerCase().replace(/\s+/g, '-') || '';
}

function pickArtKey(topics?: string[], category?: Video['category'], feature?: string): string | undefined {
  if (category === 'music') return 'music';
  const tokens = [feature, ...(topics || [])].map(normalizeToken);
  return tokens.find((token) => ART_TONES[token] || ICONSCOUT_ASSET_KEYS.has(token));
}

function pickTone(topics?: string[], category?: Video['category'], feature?: string): ArtTone {
  if (category === 'music') return ART_TONES.music;
  const found = pickArtKey(topics, category, feature);
  return found && ART_TONES[found] ? ART_TONES[found] : DEFAULT_TONE;
}

function ArtworkMark({ name }: { name: string }) {
  return (
    <DecorIcon
      name={name}
      className="mb-1 h-12 w-12"
      iconClassName="h-9 w-9 text-white drop-shadow-md"
      imageClassName="h-12 w-12 object-contain drop-shadow-md"
    />
  );
}

export function StoryFallbackArtwork({ story }: { story: StoryArtworkData }) {
  const tone = pickTone(story.topics);
  const assetKey = pickArtKey(story.topics) || 'story';
  const topic = story.topics?.[0] || story.level;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${tone.gradient}`}>
      <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full ${tone.accent}`} />
      <div className="absolute -bottom-10 right-2 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
        Story
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/18 p-3 text-white backdrop-blur-sm">
        <ArtworkMark name={assetKey || tone.icon} />
        <div className="line-clamp-2 text-base font-black leading-tight drop-shadow-sm">{story.title_en}</div>
        <div className="mt-1 line-clamp-1 text-xs font-bold text-white/85">{topic}</div>
      </div>
    </div>
  );
}

export function VideoFallbackArtwork({ video, icon }: { video: Video; icon?: string }) {
  const tone = pickTone(video.topics, video.category, video.feature);
  const assetKey = icon || pickArtKey(video.topics, video.category, video.feature) || tone.icon;
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
        <ArtworkMark name={assetKey} />
        <div className="line-clamp-2 text-base font-black leading-tight drop-shadow-md">{label}</div>
      </div>
    </div>
  );
}
