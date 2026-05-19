-- Daily snapshot of per-post metrics so we can chart growth over time.
-- One row per (instagram_media_id, captured_date). Same-day re-syncs overwrite
-- the day's row so we keep the latest number for that day.

CREATE TABLE IF NOT EXISTS content_performance_snapshots (
  id BIGSERIAL PRIMARY KEY,
  instagram_media_id TEXT NOT NULL,
  captured_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(8, 4) DEFAULT 0,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instagram_media_id, captured_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_media ON content_performance_snapshots(instagram_media_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON content_performance_snapshots(captured_date DESC);
