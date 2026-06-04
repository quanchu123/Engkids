'use client';

import { useEffect, useRef, useState } from 'react';

interface MusicSetting {
  enabled: boolean;
  url?: string;
  volume: number;
}

// Events the browser accepts as a "user gesture" to unlock audio.
const GESTURE_EVENTS = ['pointerdown', 'click', 'touchend', 'keydown'] as const;
const MUSIC_DISABLED_KEY = 'engkids.backgroundMusic.disabled';

/**
 * Home-page background music. Loops a track set by the admin.
 *
 * Browsers block autoplay WITH SOUND until the user interacts with the page.
 * Strategy to play as early as possible:
 *   1. Try to play unmuted (works if the browser already trusts this site).
 *   2. If blocked, start MUTED (autoplay muted is always allowed) so the track
 *      is already running, then unmute on the very first user gesture anywhere
 *      on the page — the user does not need to find the music button.
 */
export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [setting, setSetting] = useState<MusicSetting | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userDisabled, setUserDisabled] = useState(false);
  const userToggledRef = useRef(false);

  // Load the current music setting.
  useEffect(() => {
    let active = true;
    setUserDisabled(window.localStorage.getItem(MUSIC_DISABLED_KEY) === 'true');
    const loadSetting = () => fetch('/api/settings/background-music', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!active) return;
        if (res?.music?.enabled && res.music.url) {
          setSetting({ enabled: true, url: res.music.url, volume: res.music.volume ?? 0.4 });
        } else {
          setSetting(null);
          audioRef.current?.pause();
          setPlaying(false);
          setMuted(false);
        }
      })
      .catch(() => {});
    const handleFocus = () => {
      loadSetting();
    };
    loadSetting();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!setting?.url) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = setting.volume;
    audio.loop = true;

    let unlocked = false;
    const removeUnlockListeners = () => {
      GESTURE_EVENTS.forEach((ev) => window.removeEventListener(ev, unlock));
    };

    // Unmute + play at the first real user gesture.
    const unlock = () => {
      if (unlocked || userToggledRef.current) return;
      unlocked = true;
      audio.muted = false;
      setMuted(false);
      audio.play().then(() => {
        if (!userToggledRef.current) setPlaying(true);
      }).catch(() => {});
      removeUnlockListeners();
    };

    if (userDisabled) {
      userToggledRef.current = true;
      audio.pause();
      audio.muted = false;
      setMuted(false);
      setPlaying(false);
      return removeUnlockListeners;
    }

    // 1. Try unmuted autoplay.
    audio.muted = false;
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setMuted(false);
      })
      .catch(() => {
        // 2. Blocked — fall back to muted autoplay, unmute on first gesture.
        audio.muted = true;
        setMuted(true);
        audio.play().then(() => setPlaying(true)).catch(() => {});
        GESTURE_EVENTS.forEach((ev) =>
          window.addEventListener(ev, unlock, { once: false, passive: true }),
        );
      });

    return () => {
      removeUnlockListeners();
      audio.pause();
    };
  }, [setting, userDisabled]);

  if (!setting?.url) return null;

  const toggle = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    userToggledRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    
    if (audio.paused || audio.muted || userDisabled) {
      window.localStorage.removeItem(MUSIC_DISABLED_KEY);
      setUserDisabled(false);
      audio.muted = false;
      setMuted(false);
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      window.localStorage.setItem(MUSIC_DISABLED_KEY, 'true');
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setMuted(false);
      setUserDisabled(true);
    }
  };

  const isOn = playing && !muted;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={setting.url} preload="auto" />
      <button
        onClickCapture={toggle}
        onPointerDownCapture={(e) => e.stopPropagation()}
        aria-label={isOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        title={isOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg transition-all hover:scale-110 ${
          isOn
            ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white'
            : 'bg-white text-violet-600 ring-2 ring-violet-300 animate-pulse'
        }`}
      >
        {isOn ? '🔊' : '🎵'}
      </button>
    </>
  );
}
