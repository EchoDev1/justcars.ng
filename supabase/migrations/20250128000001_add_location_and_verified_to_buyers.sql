-- Add missing columns to buyers table
-- This migration adds the location and verified columns that are referenced in the buyer registration code

ALTER TABLE public.buyers
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Create index for location for faster queries
CREATE INDEX IF NOT EXISTS idx_buyers_location ON public.buyers(location);

-- Create index for verified buyers
CREATE INDEX IF NOT EXISTS idx_buyers_verified ON public.buyers(verified) WHERE verified = true;
