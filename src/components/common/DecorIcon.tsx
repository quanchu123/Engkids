'use client';

import { useState } from 'react';
import {
  BookOpen,
  Clapperboard,
  CloudSun,
  Gamepad2,
  Heart,
  Home,
  LucideIcon,
  Mic2,
  Music,
  Puzzle,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Volume2,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  animals: Heart,
  body: UserRound,
  family: Home,
  game: Gamepad2,
  games: Gamepad2,
  music: Music,
  progress: Star,
  puzzle: Puzzle,
  rocket: Rocket,
  space: Rocket,
  story: BookOpen,
  stories: BookOpen,
  video: Clapperboard,
  videos: Clapperboard,
  weather: CloudSun,
  trophy: Trophy,
  mic: Mic2,
  sparkles: Sparkles,
  volume: Volume2,
};

export function DecorIcon({
  name,
  className = '',
  iconClassName = '',
  imageClassName = '',
  strokeWidth = 2.6,
}: {
  name: string;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  strokeWidth?: number;
}) {
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = ICONS[name] || Sparkles;

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {!imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/iconscout/${name}.png`}
          alt=""
          className={`${imageReady ? 'block' : 'hidden'} ${imageClassName || iconClassName}`}
          onLoad={() => setImageReady(true)}
          onError={() => setImageFailed(true)}
        />
      )}
      {(!imageReady || imageFailed) && <Icon className={iconClassName} strokeWidth={strokeWidth} aria-hidden="true" />}
    </span>
  );
}
