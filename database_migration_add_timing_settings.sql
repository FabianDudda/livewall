-- Add timing settings columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_display_duration INTEGER DEFAULT 10;
ALTER TABLE events ADD COLUMN IF NOT EXISTS auto_refresh_interval INTEGER DEFAULT 30;

-- Set default values for existing events
UPDATE events 
SET 
  image_display_duration = 10,
  auto_refresh_interval = 30
WHERE 
  image_display_duration IS NULL 
  OR auto_refresh_interval IS NULL;