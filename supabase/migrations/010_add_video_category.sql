-- Add category column to videos table to distinguish Music vs Video

-- Add category column with check constraint
ALTER TABLE videos 
ADD COLUMN category TEXT CHECK (category IN ('video', 'music')) DEFAULT 'video';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- Update existing videos to default category
UPDATE videos SET category = 'video' WHERE category IS NULL;

-- Make category NOT NULL after setting defaults
ALTER TABLE videos 
ALTER COLUMN category SET NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN videos.category IS 'Type of content: video (educational lessons) or music (songs for learning)';
