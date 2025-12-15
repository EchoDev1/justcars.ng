-- Social Proof & Reviews System
-- Buyer reviews of dealers, car reviews, photo reviews, rating system

-- Drop existing tables if they exist
DROP TABLE IF EXISTS review_votes CASCADE;
DROP TABLE IF EXISTS review_photos CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- Reviews Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Review type: 'dealer' or 'car'
  review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('dealer', 'car')),

  -- References
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,

  -- Rating (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Review content
  title VARCHAR(255) NOT NULL,
  review_text TEXT NOT NULL,

  -- Verified purchase
  is_verified_buyer BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Purchase details
  purchase_date DATE,
  purchase_price DECIMAL(15, 2),

  -- Moderation
  is_approved BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,

  -- Helpfulness tracking
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Response from dealer
  dealer_response TEXT,
  dealer_response_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either dealer_id or car_id is set (not both)
  CONSTRAINT check_review_target CHECK (
    (review_type = 'dealer' AND dealer_id IS NOT NULL AND car_id IS NULL) OR
    (review_type = 'car' AND car_id IS NOT NULL AND dealer_id IS NOT NULL)
  )
);

-- Review Photos Table
CREATE TABLE review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 0,

  -- Photo type: 'delivery', 'condition', 'feature', 'issue'
  photo_type VARCHAR(20) DEFAULT 'delivery',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Votes Table (track helpful/not helpful)
CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Vote: 'helpful' or 'not_helpful'
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One vote per user per review
  CONSTRAINT unique_review_vote UNIQUE (review_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_reviews_dealer_id ON reviews(dealer_id);
CREATE INDEX idx_reviews_car_id ON reviews(car_id);
CREATE INDEX idx_reviews_buyer_id ON reviews(buyer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_is_verified_buyer ON reviews(is_verified_buyer);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);
CREATE INDEX idx_review_photos_review_id ON review_photos(review_id);
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at_trigger
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Trigger to update helpful counts when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
    ELSIF NEW.vote_type = 'not_helpful' THEN
      UPDATE reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
    ELSIF OLD.vote_type = 'not_helpful' THEN
      UPDATE reviews SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = OLD.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
    ELSIF OLD.vote_type = 'not_helpful' THEN
      UPDATE reviews SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = OLD.review_id;
    END IF;
    IF NEW.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
    ELSIF NEW.vote_type = 'not_helpful' THEN
      UPDATE reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_votes_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY reviews_select_policy ON reviews
  FOR SELECT
  USING (is_approved = TRUE OR buyer_id = auth.uid());

-- Only verified buyers can create reviews
CREATE POLICY reviews_insert_policy ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own pending reviews
CREATE POLICY reviews_update_policy ON reviews
  FOR UPDATE
  USING (auth.uid() = buyer_id AND is_approved = FALSE);

-- Buyers can delete their own pending reviews
CREATE POLICY reviews_delete_policy ON reviews
  FOR DELETE
  USING (auth.uid() = buyer_id AND is_approved = FALSE);

-- Review photos policies
CREATE POLICY review_photos_select_policy ON review_photos
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reviews
    WHERE reviews.id = review_photos.review_id
    AND (reviews.is_approved = TRUE OR reviews.buyer_id = auth.uid())
  ));

CREATE POLICY review_photos_insert_policy ON review_photos
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reviews
    WHERE reviews.id = review_photos.review_id
    AND reviews.buyer_id = auth.uid()
  ));

-- Review votes policies
CREATE POLICY review_votes_select_policy ON review_votes
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY review_votes_insert_policy ON review_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_votes_update_policy ON review_votes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY review_votes_delete_policy ON review_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE reviews IS 'Buyer reviews for dealers and cars';
COMMENT ON TABLE review_photos IS 'Photos attached to reviews (delivery pics, condition, etc)';
COMMENT ON TABLE review_votes IS 'User votes on review helpfulness';
