-- Add gradient settings columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS upload_header_gradient TEXT DEFAULT 'from-gray-50 to-white';
ALTER TABLE events ADD COLUMN IF NOT EXISTS livewall_background_gradient TEXT DEFAULT 'from-purple-900 via-blue-900 to-indigo-900';

-- Set default values for existing events
UPDATE events 
SET 
  upload_header_gradient = 'from-gray-50 to-white',
  livewall_background_gradient = 'from-purple-900 via-blue-900 to-indigo-900'
WHERE 
  upload_header_gradient IS NULL 
  OR livewall_background_gradient IS NULL;