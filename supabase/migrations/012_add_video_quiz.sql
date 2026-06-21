-- Add quiz column to videos table.
-- Stores an array of multiple-choice questions shown beside the video player.
-- Shape (per item):
--   { "id": string, "question": string, "questionVi"?: string,
--     "options": string[], "correctIndex": number,
--     "explanation"?: string, "timeCode"?: number }

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS quiz JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN videos.quiz IS 'Array of multiple-choice quiz questions displayed next to the video player.';
