-- Add hashtag column to challenges table
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS hashtag TEXT;

-- Update existing challenges to have hashtag based on their title
UPDATE challenges 
SET hashtag = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]', '', 'g'))
WHERE hashtag IS NULL;