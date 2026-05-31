'use client';

import { useEffect, useRef, useState } from 'react';

interface MusicSetting {
  enabled: boolean;
  url?: string;
  volume: number;
}

/**
 * Home-page background music. Loops a track set by the admin. Because browsers
 * block autoplay with sound until the user interacts with the page, we attempt
 * to autoplay and, if blocked, show a small floating button to start it.
 */
export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [setting, setSetting] = useState<MusicSetting | null>(null);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  // Load the current music setting.
  useEffect(() => {
    let active = true;
    fetch('/api/settings/background-music')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (active && res?.music?.enabled && res.music.url) {
          setSetting({ enabled: true, url: res.music.url, volume: res.music.volume ?? 0.4 });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Try to autoplay once we have a track; fall back to a tap-to-play button.
  useEffect(() => {
    if (!setting?.url) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = setting.volume;
    audio.loop = true;

    const tryPlay = () => {
      audio
        .play()
        .then(() => {
          setPlaying(true);
          setNeedsTap(false);
        })
        .catch(() => {
          setNeedsTap(true);
        });
    };

    tryPlay();

    // If autoplay was blocked, start on the first user interaction.
    const onInteract = () => {
      if (audio.paused) tryPlay();
    };
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('keydown', onInteract, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, [setting]);

  if (!setting?.url) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => { setPlaying(true); setNeedsTap(false); }).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={setting.url} preload="auto" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        title={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg transition-all hover:scale-110 ${
          playing
            ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white'
            : 'bg-white text-violet-600 ring-2 ring-violet-300'
        } ${needsTap && !playing ? 'animate-pulse' : ''}`}
      >
        {playing ? '🔊' : '🎵'}
      </button>
    </>
  );
}
