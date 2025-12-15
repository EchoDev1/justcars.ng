-- Inspection Booking System
-- Schedule inspections, assign inspectors, generate reports

-- Drop existing tables if they exist
DROP TABLE IF EXISTS inspection_checklist_items CASCADE;
DROP TABLE IF EXISTS inspection_photos CASCADE;
DROP TABLE IF EXISTS inspections CASCADE;
DROP TABLE IF EXISTS inspectors CASCADE;

-- Inspectors Table
CREATE TABLE inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Inspector details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  avatar_url TEXT,

  -- Certifications
  certification_number VARCHAR(100),
  certification_expiry DATE,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  working_hours JSONB DEFAULT '{"monday": ["09:00", "17:00"], "tuesday": ["09:00", "17:00"], "wednesday": ["09:00", "17:00"], "thursday": ["09:00", "17:00"], "friday": ["09:00", "17:00"], "saturday": ["09:00", "13:00"]}',

  -- Coverage areas (cities)
  coverage_areas TEXT[] DEFAULT ARRAY['Lagos', 'Abuja', 'Port Harcourt'],

  -- Statistics
  total_inspections INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections Table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Car being inspected
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Buyer who requested inspection
  buyer_id UUID NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20) NOT NULL,

  -- Inspector assigned
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,

  -- Scheduling
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(20) NOT NULL, -- e.g., "10:00 AM"
  scheduled_datetime TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Location
  inspection_location TEXT NOT NULL, -- Dealer location or custom address
  city VARCHAR(100) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'rescheduled'
  )),

  -- Pricing
  inspection_fee DECIMAL(10, 2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  paid_at TIMESTAMPTZ,

  -- Results
  overall_condition VARCHAR(50) CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor', 'failed')),
  pass_fail_result VARCHAR(20) CHECK (pass_fail_result IN ('pass', 'fail', 'conditional')),

  -- Summary
  inspector_notes TEXT,
  recommended_repairs TEXT,
  estimated_repair_cost DECIMAL(15, 2),

  -- PDF Report
  report_pdf_url TEXT,
  report_generated_at TIMESTAMPTZ,

  -- Ratings
  buyer_rating INTEGER CHECK (buyer_rating >= 1 AND buyer_rating <= 5),
  buyer_feedback TEXT,

  -- Cancellation
  cancelled_reason TEXT,
  cancelled_by VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Photos Table
CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,

  -- Photo category
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
    'exterior', 'interior', 'engine', 'undercarriage', 'wheels', 'damage', 'document', 'other'
  )),

  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Checklist Items Table (200+ point inspection)
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Checklist item
  category VARCHAR(100) NOT NULL, -- e.g., 'Engine', 'Brakes', 'Suspension'
  item_name VARCHAR(255) NOT NULL, -- e.g., 'Oil level', 'Brake pads wear'
  status VARCHAR(50) NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'not_applicable')),

  -- Notes
  inspector_notes TEXT,

  -- Photos for this item
  photo_urls TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_inspectors_email ON inspectors(email);
CREATE INDEX idx_inspectors_is_active ON inspectors(is_active);
CREATE INDEX idx_inspectors_is_available ON inspectors(is_available);
CREATE INDEX idx_inspections_car_id ON inspections(car_id);
CREATE INDEX idx_inspections_dealer_id ON inspections(dealer_id);
CREATE INDEX idx_inspections_buyer_id ON inspections(buyer_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_scheduled_datetime ON inspections(scheduled_datetime);
CREATE INDEX idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
CREATE INDEX idx_inspection_checklist_inspection_id ON inspection_checklist_items(inspection_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspections_updated_at_trigger
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_updated_at();

CREATE TRIGGER inspectors_updated_at_trigger
  BEFORE UPDATE ON inspectors
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_updated_at();

-- Trigger to update inspector statistics
CREATE OR REPLACE FUNCTION update_inspector_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE inspectors
    SET total_inspections = total_inspections + 1
    WHERE id = NEW.inspector_id;

    -- Update average rating if buyer rated
    IF NEW.buyer_rating IS NOT NULL THEN
      UPDATE inspectors
      SET average_rating = (
        SELECT AVG(buyer_rating)
        FROM inspections
        WHERE inspector_id = NEW.inspector_id
        AND buyer_rating IS NOT NULL
      )
      WHERE id = NEW.inspector_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inspector_stats_trigger
  AFTER UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_inspector_stats();

-- Row Level Security
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active inspectors
CREATE POLICY inspectors_select_policy ON inspectors
  FOR SELECT
  USING (is_active = TRUE);

-- Users can view their own inspections
CREATE POLICY inspections_select_policy ON inspections
  FOR SELECT
  USING (buyer_id = auth.uid() OR dealer_id IN (
    SELECT id FROM dealers WHERE id = auth.uid()
  ) OR inspector_id IN (
    SELECT id FROM inspectors WHERE id = auth.uid()
  ));

-- Authenticated users can create inspections
CREATE POLICY inspections_insert_policy ON inspections
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view photos for their inspections
CREATE POLICY inspection_photos_select_policy ON inspection_photos
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_photos.inspection_id
    AND (inspections.buyer_id = auth.uid() OR inspections.dealer_id = auth.uid() OR inspections.inspector_id = auth.uid())
  ));

-- Same for checklist items
CREATE POLICY inspection_checklist_select_policy ON inspection_checklist_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.id = inspection_checklist_items.inspection_id
    AND (inspections.buyer_id = auth.uid() OR inspections.dealer_id = auth.uid() OR inspections.inspector_id = auth.uid())
  ));

-- Comments
COMMENT ON TABLE inspectors IS 'Certified car inspectors';
COMMENT ON TABLE inspections IS 'Car inspection bookings and reports';
COMMENT ON TABLE inspection_photos IS 'Photos from inspections';
COMMENT ON TABLE inspection_checklist_items IS '200+ point inspection checklist';
