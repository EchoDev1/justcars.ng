-- Blog & Content Marketing System
-- Car buying guides, maintenance tips, market trends, dealer stories

-- Drop existing tables if they exist
DROP TABLE IF EXISTS blog_comments CASCADE;
DROP TABLE IF EXISTS blog_post_tags CASCADE;
DROP TABLE IF EXISTS blog_tags CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS blog_categories CASCADE;

-- Blog Categories
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Tags
CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Post details
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,

  -- Featured image
  featured_image_url TEXT,
  featured_image_alt TEXT,

  -- Category
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,

  -- Author
  author_id UUID NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(100),
  author_avatar_url TEXT,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Analytics
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- Reading time (in minutes)
  reading_time INTEGER,

  -- Content type
  content_type VARCHAR(50) DEFAULT 'article' CHECK (content_type IN ('article', 'guide', 'news', 'video', 'infographic')),

  -- Featured/Trending
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,

  -- Video URL (if content_type is video)
  video_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Post Tags (Many-to-Many)
CREATE TABLE blog_post_tags (
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  blog_tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blog_post_id, blog_tag_id)
);

-- Blog Comments
CREATE TABLE blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- Commenter details
  user_id UUID,
  commenter_name VARCHAR(255) NOT NULL,
  commenter_email VARCHAR(255) NOT NULL,
  commenter_avatar_url TEXT,

  -- Comment content
  comment_text TEXT NOT NULL,

  -- Moderation
  is_approved BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,

  -- Reply to another comment
  parent_comment_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_views_count ON blog_posts(views_count DESC);
CREATE INDEX idx_blog_posts_is_featured ON blog_posts(is_featured);
CREATE INDEX idx_blog_posts_is_trending ON blog_posts(is_trending);
CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX idx_blog_comments_post_id ON blog_comments(blog_post_id);
CREATE INDEX idx_blog_comments_is_approved ON blog_comments(is_approved);
CREATE INDEX idx_blog_post_tags_post_id ON blog_post_tags(blog_post_id);
CREATE INDEX idx_blog_post_tags_tag_id ON blog_post_tags(blog_tag_id);

-- Full-text search index
CREATE INDEX idx_blog_posts_search ON blog_posts USING GIN(to_tsvector('english', title || ' ' || excerpt || ' ' || content));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Trigger to calculate reading time (approx 200 words per minute)
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reading_time = CEILING(
    (LENGTH(NEW.content) - LENGTH(REPLACE(NEW.content, ' ', ''))) / 200.0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_reading_time_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reading_time();

-- Row Level Security
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY blog_posts_select_policy ON blog_posts
  FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

-- Anyone can view active categories
CREATE POLICY blog_categories_select_policy ON blog_categories
  FOR SELECT
  USING (is_active = TRUE);

-- Anyone can view tags
CREATE POLICY blog_tags_select_policy ON blog_tags
  FOR SELECT
  USING (true);

-- Anyone can view post tags
CREATE POLICY blog_post_tags_select_policy ON blog_post_tags
  FOR SELECT
  USING (true);

-- Anyone can view approved comments
CREATE POLICY blog_comments_select_policy ON blog_comments
  FOR SELECT
  USING (is_approved = TRUE OR user_id = auth.uid());

-- Authenticated users can create comments
CREATE POLICY blog_comments_insert_policy ON blog_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert sample categories
INSERT INTO blog_categories (name, slug, description, display_order) VALUES
  ('Car Buying Guides', 'car-buying-guides', 'Expert guides to help you make the right car purchase', 1),
  ('Maintenance Tips', 'maintenance-tips', 'Keep your car running smoothly with our maintenance advice', 2),
  ('Market Trends', 'market-trends', 'Latest trends in the Nigerian automotive market', 3),
  ('Dealer Success Stories', 'dealer-success-stories', 'Inspiring stories from successful car dealers', 4),
  ('Industry News', 'industry-news', 'Latest news from the automotive industry', 5);

-- Insert sample tags
INSERT INTO blog_tags (name, slug) VALUES
  ('First-Time Buyers', 'first-time-buyers'),
  ('Used Cars', 'used-cars'),
  ('Electric Vehicles', 'electric-vehicles'),
  ('Financing', 'financing'),
  ('Insurance', 'insurance'),
  ('Safety', 'safety'),
  ('Luxury Cars', 'luxury-cars'),
  ('SUVs', 'suvs'),
  ('Sedans', 'sedans'),
  ('Maintenance', 'maintenance');

-- Comments
COMMENT ON TABLE blog_posts IS 'Blog posts for content marketing and SEO';
COMMENT ON TABLE blog_categories IS 'Blog post categories';
COMMENT ON TABLE blog_tags IS 'Blog post tags for filtering';
COMMENT ON TABLE blog_comments IS 'Comments on blog posts';
