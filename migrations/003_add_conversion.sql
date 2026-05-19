-- Conversion tracking on content_posts
-- drove_sales: NULL = not reviewed, FALSE = reviewed (no sales), TRUE = reviewed (drove sales/DMs/inquiries)
-- conversion_notes: free-text texture on what actually happened
-- reviewed_at: when the user last touched this row's conversion state

ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS drove_sales BOOLEAN;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS conversion_notes TEXT;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_content_posts_drove_sales ON content_posts(drove_sales);
