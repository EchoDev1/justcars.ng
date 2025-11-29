-- ============================================================================
-- JUSTCARS.NG MONETIZATION & TRUST FEATURES MIGRATION
-- Date: 2025-11-28
-- ============================================================================
-- This migration adds:
-- 1. Dealer badge subscription system
-- 2. Featured car listings (promotions)
-- 3. Enhanced buyer verification with payment
-- 4. Escrow transaction system
-- 5. Inspection scheduling and management
-- 6. Terms & Conditions tracking
-- ============================================================================

-- ============================================================================
-- 1. DEALER BADGES TABLE
-- ============================================================================
-- Stores dealer subscription badges (verified, premium, luxury)
CREATE TABLE IF NOT EXISTS dealer_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dealer reference
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Badge details
  badge_type VARCHAR(20) NOT NULL CHECK (badge_type IN ('verified', 'premium', 'luxury')),
  badge_status VARCHAR(20) DEFAULT 'active' CHECK (badge_status IN ('active', 'expired', 'suspended')),

  -- Pricing (in Naira)
  monthly_price NUMERIC(12, 2) NOT NULL,

  -- Subscription dates
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT true,

  -- Payment tracking
  last_payment_date TIMESTAMPTZ,
  last_payment_amount NUMERIC(12, 2),
  last_payment_reference VARCHAR(255),

  -- Admin control
  issued_by_admin BOOLEAN DEFAULT false,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure dealer can only have one active badge
  UNIQUE(dealer_id, badge_status)
);

-- Add badge_type column to dealers table for quick reference
ALTER TABLE dealers
ADD COLUMN IF NOT EXISTS badge_type VARCHAR(20) DEFAULT 'none'
CHECK (badge_type IN ('none', 'verified', 'premium', 'luxury'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dealer_badges_dealer ON dealer_badges(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_badges_type ON dealer_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_dealer_badges_status ON dealer_badges(badge_status);
CREATE INDEX IF NOT EXISTS idx_dealer_badges_end_date ON dealer_badges(end_date);
CREATE INDEX IF NOT EXISTS idx_dealers_badge_type ON dealers(badge_type);

-- ============================================================================
-- 2. FEATURED LISTINGS TABLE
-- ============================================================================
-- Stores paid featured car listings for visibility boost
CREATE TABLE IF NOT EXISTS featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Car and dealer reference
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Feature type
  feature_type VARCHAR(20) NOT NULL CHECK (feature_type IN ('single', 'monthly')),

  -- Pricing
  price_paid NUMERIC(12, 2) NOT NULL,

  -- Feature duration
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused')),

  -- Priority (higher number = higher visibility)
  priority_level INTEGER DEFAULT 1,

  -- Performance metrics
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,

  -- Payment details
  payment_reference VARCHAR(255),
  payment_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_featured_listings_car ON featured_listings(car_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_dealer ON featured_listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_end_date ON featured_listings(end_date);
CREATE INDEX IF NOT EXISTS idx_featured_listings_priority ON featured_listings(priority_level DESC);

-- ============================================================================
-- 3. BUYER VERIFICATION ENHANCEMENTS
-- ============================================================================

-- Add verification fields to buyers table
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_tier VARCHAR(20) DEFAULT 'basic'
  CHECK (verification_tier IN ('basic', 'premium')),
ADD COLUMN IF NOT EXISTS budget_range VARCHAR(50),
ADD COLUMN IF NOT EXISTS lead_score VARCHAR(20) DEFAULT 'low'
  CHECK (lead_score IN ('low', 'medium', 'serious')),
ADD COLUMN IF NOT EXISTS verification_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_payment_reference VARCHAR(255);

-- Create verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Buyer reference
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,

  -- Document details
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('national_id', 'drivers_license', 'international_passport', 'voters_card', 'proof_of_income', 'other')),
  document_url TEXT NOT NULL,
  document_number VARCHAR(100),

  -- Verification status
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_buyers_verification_status ON buyers(verification_status);
CREATE INDEX IF NOT EXISTS idx_buyers_lead_score ON buyers(lead_score);
CREATE INDEX IF NOT EXISTS idx_verification_docs_buyer ON verification_documents(buyer_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON verification_documents(verification_status);

-- ============================================================================
-- 4. ESCROW TRANSACTION SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction parties
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE SET NULL,

  -- Transaction details
  car_price NUMERIC(15, 2) NOT NULL,
  escrow_fee NUMERIC(15, 2) NOT NULL, -- 1.5% of car price
  total_amount NUMERIC(15, 2) NOT NULL, -- car_price + escrow_fee

  -- Status workflow
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Buyer initiated
    'funded',            -- Money received in escrow
    'inspection_scheduled', -- Inspection arranged
    'inspection_completed', -- Inspection done
    'approved',          -- Buyer approved purchase
    'rejected',          -- Buyer rejected
    'released',          -- Money released to dealer
    'refunded',          -- Money refunded to buyer
    'disputed',          -- Dispute raised
    'cancelled'          -- Cancelled
  )),

  -- Payment details
  payment_method VARCHAR(50) CHECK (payment_method IN ('bank_transfer', 'paystack', 'flutterwave', 'monnify')),
  payment_reference VARCHAR(255),
  payment_date TIMESTAMPTZ,

  -- Escrow account details
  escrow_account_number VARCHAR(20),
  escrow_bank_name VARCHAR(100),

  -- Inspection reference
  inspection_id UUID, -- Will reference inspections table

  -- Approval/Rejection
  buyer_decision VARCHAR(20) CHECK (buyer_decision IN ('pending', 'approved', 'rejected')),
  buyer_decision_date TIMESTAMPTZ,
  buyer_decision_notes TEXT,

  -- Release details
  release_date TIMESTAMPTZ,
  released_amount NUMERIC(15, 2),
  dealer_payment_reference VARCHAR(255),

  -- Refund details
  refund_date TIMESTAMPTZ,
  refund_amount NUMERIC(15, 2),
  refund_reference VARCHAR(255),
  refund_reason TEXT,

  -- Admin oversight
  admin_notes TEXT,
  flagged_by_admin BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_dealer ON escrow_transactions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_car ON escrow_transactions(car_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_created ON escrow_transactions(created_at DESC);

-- ============================================================================
-- 5. INSPECTION SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related transaction
  escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE CASCADE,

  -- Car and parties
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,

  -- Inspection details
  inspection_type VARCHAR(30) CHECK (inspection_type IN ('buyer_self', 'platform_outlet', 'third_party')),
  inspection_location TEXT,

  -- Scheduling
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  -- Inspector (if platform inspection)
  inspector_name VARCHAR(255),
  inspector_phone VARCHAR(20),
  inspector_email VARCHAR(255),

  -- Inspection checklist (JSONB for flexibility)
  checklist JSONB DEFAULT '{
    "engine": {"status": "pending", "notes": ""},
    "transmission": {"status": "pending", "notes": ""},
    "body_condition": {"status": "pending", "notes": ""},
    "mileage_verification": {"status": "pending", "notes": ""},
    "obd_scan": {"status": "pending", "notes": ""},
    "tyres": {"status": "pending", "notes": ""},
    "ac_system": {"status": "pending", "notes": ""},
    "documents": {"status": "pending", "notes": ""}
  }'::jsonb,

  -- Results
  overall_result VARCHAR(20) CHECK (overall_result IN ('pending', 'passed', 'failed', 'conditional')),
  inspector_notes TEXT,
  inspector_recommendation TEXT,

  -- Photos/Videos
  inspection_photos JSONB DEFAULT '[]'::jsonb,
  inspection_videos JSONB DEFAULT '[]'::jsonb,

  -- Report
  report_url TEXT,
  report_generated_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspections_escrow ON inspections(escrow_transaction_id);
CREATE INDEX IF NOT EXISTS idx_inspections_car ON inspections(car_id);
CREATE INDEX IF NOT EXISTS idx_inspections_buyer ON inspections(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_dealer ON inspections(dealer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_scheduled ON inspections(scheduled_date);

-- Link inspection to escrow transaction
ALTER TABLE escrow_transactions
ADD CONSTRAINT fk_escrow_inspection
FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL;

-- ============================================================================
-- 6. TERMS & CONDITIONS ACCEPTANCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User details
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('buyer', 'dealer', 'admin')),

  -- Terms version
  terms_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',

  -- Acceptance details
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Type of acceptance
  acceptance_type VARCHAR(30) CHECK (acceptance_type IN ('registration', 'escrow', 'verification', 'general')),

  UNIQUE(user_id, terms_version, acceptance_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms_acceptances(user_type);
CREATE INDEX IF NOT EXISTS idx_terms_version ON terms_acceptances(terms_version);

-- ============================================================================
-- 7. PAYMENT TRANSACTIONS LOG
-- ============================================================================
-- Universal payment log for all payment types
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction details
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'badge_subscription',
    'featured_listing',
    'buyer_verification',
    'escrow_funding',
    'escrow_release',
    'escrow_refund'
  )),

  -- Payer details
  payer_id UUID NOT NULL,
  payer_type VARCHAR(20) NOT NULL CHECK (payer_type IN ('buyer', 'dealer')),

  -- Amount
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',

  -- Payment gateway
  payment_gateway VARCHAR(30) CHECK (payment_gateway IN ('paystack', 'flutterwave', 'monnify', 'bank_transfer')),
  payment_reference VARCHAR(255) UNIQUE,
  gateway_reference VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),

  -- Related entity
  related_entity_type VARCHAR(30),
  related_entity_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payment_transactions(payer_id, payer_type);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payment_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payment_transactions(created_at DESC);

-- ============================================================================
-- 8. UPDATE EXISTING CARS TABLE
-- ============================================================================
-- Update luxury threshold to ₦150M
-- Add column to track if car is in escrow
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS in_escrow BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cars_in_escrow ON cars(in_escrow) WHERE in_escrow = true;

-- ============================================================================
-- 9. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================
-- The update_updated_at_column function already exists, just attach triggers

CREATE TRIGGER update_dealer_badges_updated_at
  BEFORE UPDATE ON dealer_badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_listings_updated_at
  BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_docs_updated_at
  BEFORE UPDATE ON verification_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_transactions_updated_at
  BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- ============================================================================

-- Function to calculate escrow fee (1.5%)
CREATE OR REPLACE FUNCTION calculate_escrow_fee(car_price NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(car_price * 0.015, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update dealer badge_type when badge changes
CREATE OR REPLACE FUNCTION sync_dealer_badge_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Update dealer's badge_type to match their active badge
  IF NEW.badge_status = 'active' THEN
    UPDATE dealers
    SET badge_type = NEW.badge_type
    WHERE id = NEW.dealer_id;
  ELSIF NEW.badge_status IN ('expired', 'suspended') THEN
    -- Check if dealer has any other active badges
    IF NOT EXISTS (
      SELECT 1 FROM dealer_badges
      WHERE dealer_id = NEW.dealer_id
      AND badge_status = 'active'
      AND id != NEW.id
    ) THEN
      UPDATE dealers
      SET badge_type = 'none'
      WHERE id = NEW.dealer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_dealer_badge_after_update
  AFTER INSERT OR UPDATE ON dealer_badges
  FOR EACH ROW
  EXECUTE FUNCTION sync_dealer_badge_type();

-- Function to update buyer lead score based on verification and activity
CREATE OR REPLACE FUNCTION update_buyer_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate lead score based on verification and budget
  IF NEW.verification_status = 'verified' AND NEW.verification_paid = true THEN
    -- Check if they have budget range and interactions
    IF NEW.budget_range IS NOT NULL AND NEW.budget_range != '' THEN
      NEW.lead_score = 'serious';
    ELSE
      NEW.lead_score = 'medium';
    END IF;
  ELSIF NEW.verification_status = 'pending' THEN
    NEW.lead_score = 'medium';
  ELSE
    NEW.lead_score = 'low';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_buyer_score_trigger
  BEFORE INSERT OR UPDATE ON buyers
  FOR EACH ROW
  EXECUTE FUNCTION update_buyer_lead_score();

-- ============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE dealer_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Dealer Badges Policies
CREATE POLICY "Public can view dealer badges"
  ON dealer_badges FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage all badges"
  ON dealer_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Featured Listings Policies
CREATE POLICY "Public can view active featured listings"
  ON featured_listings FOR SELECT
  TO public
  USING (status = 'active' AND end_date > NOW());

CREATE POLICY "Dealers can view their featured listings"
  ON featured_listings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Admins can manage featured listings"
  ON featured_listings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Verification Documents Policies
CREATE POLICY "Buyers can manage their verification docs"
  ON verification_documents FOR ALL
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Admins can view all verification docs"
  ON verification_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Escrow Transactions Policies
CREATE POLICY "Buyers can view their escrow transactions"
  ON escrow_transactions FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Dealers can view their escrow transactions"
  ON escrow_transactions FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Admins can manage all escrow transactions"
  ON escrow_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Inspections Policies
CREATE POLICY "Buyers can view their inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Dealers can view their inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Admins can manage all inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Payment Transactions Policies
CREATE POLICY "Users can view their payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid());

CREATE POLICY "Admins can view all payment transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Terms Acceptances Policies
CREATE POLICY "Users can view their own terms acceptances"
  ON terms_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own terms acceptances"
  ON terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 12. HELPFUL VIEWS
-- ============================================================================

-- View for active dealer badges
CREATE OR REPLACE VIEW active_dealer_badges AS
SELECT
  d.id as dealer_id,
  d.name as dealer_name,
  d.badge_type,
  db.badge_status,
  db.start_date,
  db.end_date,
  db.auto_renew,
  db.monthly_price
FROM dealers d
LEFT JOIN dealer_badges db ON d.id = db.dealer_id
WHERE db.badge_status = 'active' AND db.end_date > NOW();

-- View for active featured listings
CREATE OR REPLACE VIEW active_featured_listings AS
SELECT
  fl.*,
  c.make,
  c.model,
  c.year,
  c.price,
  d.name as dealer_name,
  d.badge_type as dealer_badge
FROM featured_listings fl
JOIN cars c ON fl.car_id = c.id
JOIN dealers d ON fl.dealer_id = d.id
WHERE fl.status = 'active' AND fl.end_date > NOW()
ORDER BY fl.priority_level DESC, fl.created_at DESC;

-- View for verified buyers with high lead scores
CREATE OR REPLACE VIEW serious_buyers AS
SELECT
  b.*,
  COUNT(DISTINCT bsc.id) as saved_cars_count,
  COUNT(DISTINCT c.id) as active_chats_count
FROM buyers b
LEFT JOIN buyer_saved_cars bsc ON b.id = bsc.buyer_id
LEFT JOIN conversations c ON b.id = c.buyer_id AND c.status = 'active'
WHERE b.verification_status = 'verified' AND b.lead_score = 'serious'
GROUP BY b.id;

-- View for escrow transactions dashboard
CREATE OR REPLACE VIEW escrow_dashboard AS
SELECT
  et.*,
  b.full_name as buyer_name,
  b.email as buyer_email,
  b.phone as buyer_phone,
  d.name as dealer_name,
  d.email as dealer_email,
  d.phone as dealer_phone,
  c.make || ' ' || c.model || ' ' || c.year as car_details,
  i.overall_result as inspection_result,
  i.completed_date as inspection_completed
FROM escrow_transactions et
JOIN buyers b ON et.buyer_id = b.id
JOIN dealers d ON et.dealer_id = d.id
LEFT JOIN cars c ON et.car_id = c.id
LEFT JOIN inspections i ON et.inspection_id = i.id
ORDER BY et.created_at DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Migration completed successfully!
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Create storage buckets for verification documents and inspection photos
-- 3. Set up payment gateway webhooks (Paystack, Flutterwave)
-- 4. Configure email notifications for escrow status changes
-- 5. Create admin dashboard to manage badges and escrow transactions
