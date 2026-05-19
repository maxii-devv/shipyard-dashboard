-- Auto-generated from supabase/schema.sql by scripts/strip-supabase-isms.py
-- RLS policies and auth.* references stripped; everything else is plain Postgres.
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- ============================================================================
-- Shipyard — Content Dashboard Template
-- Consolidated Database Schema
--
-- Run this against a fresh Supabase project:
--   1. Go to your Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. Or use the CLI: npx supabase db push
-- ============================================================================

-- ── Utility functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- IDEAS PIPELINE
-- ============================================================================

-- ── Ideas ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ideas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL CHECK (type IN ('youtube_video', 'reel', 'carousel', 'thread_carousel', 'story', 'post', 'podcast', 'article')),
  format          TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'exploring', 'in_development', 'produced', 'archived')),
  source          TEXT,
  rating          INTEGER,
  linked_video_id UUID,
  topic_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Idea platforms ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idea_platforms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Idea tags ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idea_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idea_tag_links (
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES idea_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

-- ── Idea relations (graph edges) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idea_relations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id_a     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  idea_id_b     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related', 'inspired_by', 'part_of_series', 'follow_up', 'contradicts')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TOPICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS topics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  source_url     TEXT,
  source_name    TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'archived')),
  linked_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  target_posts   INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_topics_updated_at();

-- Add FK from ideas.topic_id now that topics table exists
ALTER TABLE ideas ADD CONSTRAINT ideas_topic_id_fkey
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_topic_id ON ideas(topic_id);

-- ============================================================================
-- VIDEOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin')),
  status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'ready_to_create', 'editing', 'ready', 'published')),
  youtube_url     TEXT,
  published_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,
  sort_order      INTEGER DEFAULT 0,
  target_date     DATE,
  source_idea_id  UUID REFERENCES ideas(id) ON DELETE SET NULL,
  video_file_path TEXT,
  video_file_size BIGINT,
  video_file_name TEXT,
  excalidraw_data JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_source_idea_id ON videos(source_idea_id);

-- Add FK from ideas.linked_video_id now that videos table exists
ALTER TABLE ideas ADD CONSTRAINT ideas_linked_video_id_fkey
  FOREIGN KEY (linked_video_id) REFERENCES videos(id) ON DELETE SET NULL;

-- ── Assets (video sub-components: title, script, description, etc.) ──────────

CREATE TABLE IF NOT EXISTS assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('title', 'intro', 'structure', 'outro', 'script', 'description', 'tags', 'thumbnail')),
  content         TEXT,
  storage_path    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'revision_requested')),
  revision_notes  TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Supporting media (reference files attached to videos) ────────────────────

CREATE TABLE IF NOT EXISTS supporting_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  storage_path TEXT,
  url          TEXT,
  filename     TEXT NOT NULL,
  file_type    TEXT NOT NULL DEFAULT 'image',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supporting_media_video_id_idx ON supporting_media(video_id);

-- ── Video transcriptions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_transcriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id          UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  storage_path      TEXT,
  transcript_text   TEXT,
  transcript_json   JSONB,
  duration_seconds  NUMERIC,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_transcriptions_video_id_idx ON video_transcriptions(video_id);

-- ── Video attachments (presentations, diagrams, images, links) ───────────────

CREATE TABLE IF NOT EXISTS video_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('presentation', 'diagram', 'image', 'link')),
  title        TEXT NOT NULL DEFAULT '',
  url          TEXT,
  storage_path TEXT,
  file_name    TEXT,
  file_size    INTEGER,
  metadata     JSONB DEFAULT '{}',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_attachments_video ON video_attachments(video_id);

-- ============================================================================
-- THUMBNAILS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thumbnails (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path    TEXT,
  url             TEXT,
  tags            TEXT[] DEFAULT '{}',
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  ai_analysis     TEXT,
  ai_analysis_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Video-thumbnail join table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_thumbnails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  thumbnail_id UUID NOT NULL REFERENCES thumbnails(id) ON DELETE CASCADE,
  is_chosen    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, thumbnail_id)
);

CREATE INDEX IF NOT EXISTS idx_video_thumbnails_video_id ON video_thumbnails(video_id);
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_thumbnail_id ON video_thumbnails(thumbnail_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_thumbnails_one_chosen
  ON video_thumbnails(video_id) WHERE is_chosen = TRUE;

-- ── A/B test variants ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_ab_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  variant      CHAR(1) NOT NULL CHECK (variant IN ('A', 'B', 'C')),
  title        TEXT NOT NULL DEFAULT '',
  thumbnail_id UUID REFERENCES thumbnails(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, variant)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_ab_one_active
  ON video_ab_variants(video_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_video_ab_variants_video_id ON video_ab_variants(video_id);

-- ============================================================================
-- SOCIAL POSTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  platform              TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'tiktok')),
  type                  TEXT NOT NULL,
  format                TEXT,
  caption               TEXT,
  hashtags              TEXT[] DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'in_progress', 'ready_to_create', 'ready', 'scheduled', 'published', 'backlog')),
  scheduled_at          TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  body                  TEXT,
  has_lead_magnet       BOOLEAN DEFAULT false,
  lead_magnet_url       TEXT,
  notes                 TEXT,
  script                TEXT,
  sound_song            TEXT,
  text_overlay          TEXT,
  sort_order            INTEGER DEFAULT 0,
  target_date           DATE,
  metricool_post_id     BIGINT,
  metricool_scheduled_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_social_posts_updated_at();

-- ── Social media files ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_media_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  storage_path TEXT,
  url          TEXT,
  filename     TEXT NOT NULL,
  file_type    TEXT NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'video', 'audio', 'pdf', 'other')),
  order_index  INT DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL DEFAULT 'Untitled',
  slug         TEXT UNIQUE,
  content      JSONB,
  excerpt      TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author       TEXT NOT NULL DEFAULT 'unknown',
  cover_url    TEXT,
  tags         TEXT[] DEFAULT '{}',
  word_count   INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE PROCEDURE update_blog_posts_updated_at();

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC NULLS LAST);

-- ============================================================================
-- FORMATS (content format templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formats (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  platform      TEXT NOT NULL,
  content_type  TEXT NOT NULL,
  reference_url TEXT,
  notes         TEXT,
  thumbnail_url TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS formats_platform_idx ON formats(platform);
CREATE INDEX IF NOT EXISTS formats_content_type_idx ON formats(content_type);

-- ============================================================================
-- CONTENT SOURCES (reference/remix links attached to any content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id   UUID NOT NULL,
  url          TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'web',
  title        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_sources_content ON content_sources(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_created ON content_sources(created_at DESC);

-- ============================================================================
-- CONTENT PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_preferences (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform     TEXT NOT NULL CHECK (platform IN ('global', 'instagram', 'youtube', 'linkedin', 'blog', 'twitter', 'tiktok')),
  content_type TEXT NOT NULL CHECK (content_type IN ('general', 'reels', 'carousels', 'captions', 'titles', 'scripts', 'thumbnails', 'descriptions', 'posts', 'articles', 'anti')),
  preference   TEXT NOT NULL,
  source       TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'audit')),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_platform_type ON content_preferences(platform, content_type);

CREATE TRIGGER set_preferences_updated_at
  BEFORE UPDATE ON content_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPETITORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  niche           TEXT,
  brand           TEXT,
  location        TEXT,
  background      TEXT,
  is_friend       BOOLEAN DEFAULT false,
  business_notes  JSONB DEFAULT '{}',
  content_style   TEXT,
  notable         TEXT,
  links           JSONB DEFAULT '[]',
  avatar_url      TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_slug ON competitors(slug);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(active) WHERE active = true;

-- ── Competitor social accounts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitor_socials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'skool')),
  handle          TEXT NOT NULL,
  profile_url     TEXT,
  follower_count  INTEGER,
  bio             TEXT,
  profile_pic_url TEXT,
  extra_metrics   JSONB DEFAULT '{}',
  last_checked_at TIMESTAMPTZ,
  data_source     TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competitor_id, platform, handle)
);

CREATE INDEX IF NOT EXISTS idx_competitor_socials_competitor ON competitor_socials(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_socials_platform ON competitor_socials(platform);

-- ── Competitor social snapshots (daily follower/bio history) ─────────────────

CREATE TABLE IF NOT EXISTS competitor_social_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_id       UUID NOT NULL REFERENCES competitor_socials(id) ON DELETE CASCADE,
  follower_count  INTEGER,
  bio             TEXT,
  profile_pic_url TEXT,
  extra_metrics   JSONB DEFAULT '{}',
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(social_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_social_id ON competitor_social_snapshots(social_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON competitor_social_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_social_date ON competitor_social_snapshots(social_id, snapshot_date DESC);

-- ── Competitor posts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitor_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  social_id       UUID REFERENCES competitor_socials(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'skool')),
  external_id     TEXT,
  title           TEXT,
  url             TEXT,
  content_preview TEXT,
  content_type    TEXT,
  published_at    TIMESTAMPTZ,
  metrics         JSONB DEFAULT '{}',
  thumbnail_url   TEXT,
  discovered_via  TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_posts_competitor ON competitor_posts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_posts_platform ON competitor_posts(platform);
CREATE INDEX IF NOT EXISTS idx_competitor_posts_published ON competitor_posts(published_at DESC);

-- ── Competitor alerts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitor_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  social_id       UUID REFERENCES competitor_socials(id) ON DELETE SET NULL,
  alert_type      TEXT NOT NULL CHECK (alert_type IN ('bio_changed', 'follower_spike', 'follower_drop', 'new_post', 'profile_pic_changed', 'handle_changed')),
  title           TEXT NOT NULL,
  details         JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_competitor ON competitor_alerts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON competitor_alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created ON competitor_alerts(created_at DESC);

-- ── Competitor RLS ───────────────────────────────────────────────────────────

-- ── Competitor updated-at triggers ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_competitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

CREATE OR REPLACE FUNCTION update_competitor_socials_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitor_socials_updated_at
  BEFORE UPDATE ON competitor_socials
  FOR EACH ROW EXECUTE FUNCTION update_competitor_socials_updated_at();

CREATE OR REPLACE FUNCTION update_competitor_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competitor_posts_updated_at
  BEFORE UPDATE ON competitor_posts
  FOR EACH ROW EXECUTE FUNCTION update_competitor_posts_updated_at();

-- ============================================================================
-- AUTH & TOKENS
-- ============================================================================

-- ── Google OAuth tokens ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS google_tokens (
  service       TEXT PRIMARY KEY DEFAULT 'youtube',
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  scope         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── LinkedIn OAuth tokens ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS linkedin_tokens (
  service       TEXT PRIMARY KEY DEFAULT 'linkedin',
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  linkedin_sub  TEXT,
  display_name  TEXT,
  scope         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AGENT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name       TEXT NOT NULL,
  agent_role       TEXT NOT NULL,
  action_type      TEXT NOT NULL,
  task_description TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  metadata         JSONB,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_logs_agent_name_idx ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS agent_logs_created_at_idx ON agent_logs(created_at DESC);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_user_settings_timestamp();

-- ============================================================================
-- ============================================================================
-- NEWS SOURCES
-- ============================================================================
-- News sources are stored as JSON in user_settings (key = 'news_sources').
-- No separate table needed — sources are discovered via AI during onboarding
-- or added manually by the user.
