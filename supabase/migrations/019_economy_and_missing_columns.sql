-- Add columns the app code already expects but that were never created on some
-- deployed databases (migration 011 was not applied there), plus per-account
-- economy / shop / pet state so coins, owned items, equipped avatar, streak
-- freezes, the daily wheel date and the mythical pet sync to Supabase per
-- user_profile (previously these lived only in browser localStorage).
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS daily_quest_state JSONB DEFAULT '{
    "date": "",
    "steps": {
      "story": { "type": "story", "target": 1, "completed": 0, "done": false },
      "media": { "type": "media", "target": 1, "completed": 0, "done": false },
      "game": { "type": "game", "target": 1, "completed": 0, "done": false },
      "saveWord": { "type": "saveWord", "target": 3, "completed": 0, "done": false }
    },
    "completed": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spin_date DATE,
  ADD COLUMN IF NOT EXISTS owned_avatar_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS equipped_avatar JSONB,
  ADD COLUMN IF NOT EXISTS pet JSONB;
