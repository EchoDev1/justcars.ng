-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS search_alerts CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;

-- Saved Searches Table
-- Allows users to save search criteria and get notified of new matches
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Search filters stored as JSONB
  filters JSONB NOT NULL,
  -- Example filters structure:
  -- {
  --   "make": "Toyota",
  --   "model": "Camry",
  --   "minPrice": 5000000,
  --   "maxPrice": 10000000,
  --   "minYear": 2018,
  --   "maxYear": 2024,
  --   "condition": "foreign-used",
  --   "transmission": "automatic",
  --   "fuelType": "petrol",
  --   "location": "Lagos"
  -- }

  -- Notification preferences
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  notify_push BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Track last notification sent
  last_notification_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search Alerts Table (track notifications sent)
CREATE TABLE search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL,
  car_id UUID NOT NULL,

  -- Notification status
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_search_alerts_search FOREIGN KEY (search_id) REFERENCES saved_searches(id) ON DELETE CASCADE,
  CONSTRAINT fk_search_alerts_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_is_active ON saved_searches(is_active);
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN(filters);
CREATE INDEX idx_search_alerts_search_id ON search_alerts(search_id);
CREATE INDEX idx_search_alerts_car_id ON search_alerts(car_id);
CREATE INDEX idx_search_alerts_created_at ON search_alerts(created_at DESC);

-- Prevent duplicate alerts
CREATE UNIQUE INDEX idx_search_alerts_unique ON search_alerts(search_id, car_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_searches_updated_at_trigger
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- Row Level Security
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_searches
CREATE POLICY saved_searches_select_policy ON saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY saved_searches_insert_policy ON saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY saved_searches_update_policy ON saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY saved_searches_delete_policy ON saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for search_alerts (users can view alerts for their searches)
CREATE POLICY search_alerts_select_policy ON search_alerts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM saved_searches
    WHERE saved_searches.id = search_alerts.search_id
    AND saved_searches.user_id = auth.uid()
  ));

-- Comments
COMMENT ON TABLE saved_searches IS 'User saved search criteria for car alerts';
COMMENT ON TABLE search_alerts IS 'Track which cars have been sent as alerts for saved searches';
