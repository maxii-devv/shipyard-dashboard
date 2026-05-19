-- Enable pg_trgm for fuzzy text matching (Section 5)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Stores raw Instagram metrics synced every 6 hours
CREATE TABLE IF NOT EXISTS content_performance (
  id BIGSERIAL PRIMARY KEY,
  instagram_media_id TEXT UNIQUE NOT NULL,
  caption TEXT,
  media_type TEXT,
  permalink TEXT,
  post_timestamp TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(8, 4) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_performance_synced_at ON content_performance (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_performance_post_timestamp ON content_performance (post_timestamp DESC);

-- Stores structured content metadata for created posts
CREATE TABLE IF NOT EXISTS content_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  hook_text TEXT,
  hook_type TEXT,
  cta_keyword TEXT,
  content_type TEXT,
  layout TEXT,
  topic TEXT,
  platform TEXT DEFAULT 'instagram',
  instagram_media_id TEXT REFERENCES content_performance(instagram_media_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_instagram_media_id ON content_posts (instagram_media_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_hook_text_trgm ON content_posts USING gin (hook_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_content_performance_caption_trgm ON content_performance USING gin (caption gin_trgm_ops);
