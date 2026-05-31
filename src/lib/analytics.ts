export type AnalyticsEventName =
  | 'story_opened'
  | 'word_saved'
  | 'video_started'
  | 'quest_completed'
  | 'game_finished';

export interface AnalyticsEventMap {
  story_opened: { storyId: string };
  word_saved: { word: string; sourceId?: string };
  video_started: { videoId: string; category?: string };
  quest_completed: { date: string };
  game_finished: { gameType: string; storyId: string; score: number; totalQuestions: number };
}

type AnalyticsPayload<T extends AnalyticsEventName> = AnalyticsEventMap[T];

export function trackEvent<T extends AnalyticsEventName>(
  event: T,
  payload: AnalyticsPayload<T>,
): void {
  if (typeof window === 'undefined') {
    console.info('[analytics]', event, payload);
    return;
  }

  const detail = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('engkids:analytics', { detail }));

  if (process.env.NODE_ENV !== 'production') {
    console.info('[analytics]', event, payload);
  }
}
