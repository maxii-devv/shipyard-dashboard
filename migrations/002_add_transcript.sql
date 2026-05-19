-- Add transcript storage to content_performance
ALTER TABLE content_performance ADD COLUMN IF NOT EXISTS transcript TEXT;
