'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { onContentChange } from '@/lib/content-sync';

interface MusicSetting {
  enabled: boolean;
  url?: string;
  volume: number;
}

const GESTURE_EVENTS = ['pointerdown', 'click', 'touchend', 'keydown'] as const;
const MUSIC_DISABLED_KEY = 'engkids.backgroundMusic.disabled';

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [setting, setSetting] = useState<MusicSetting | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userDisabled, setUserDisabled] = useState(false);
  const userToggledRef = useRef(false);

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
    const unsubscribe = onContentChange((kind) => {
      if (kind === 'site-settings' || kind === 'all') loadSetting();
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      active = false;
      unsubscribe();
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

    audio.muted = false;
    audio.play()
      .then(() => {
        setPlaying(true);
        setMuted(false);
      })
      .catch(() => {
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

  const toggle = (event?: React.SyntheticEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
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
        onPointerDownCapture={(event) => event.stopPropagation()}
        aria-label={isOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        title={isOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className={`fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 ${
          isOn
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-700 ring-1 ring-slate-200'
        }`}
      >
        {isOn ? <Volume2 size={22} aria-hidden="true" /> : <VolumeX size={22} aria-hidden="true" />}
      </button>
    </>
  );
}
