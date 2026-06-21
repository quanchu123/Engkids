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
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
