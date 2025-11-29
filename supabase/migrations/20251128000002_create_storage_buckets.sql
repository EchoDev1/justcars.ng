-- ============================================================================
-- JUSTCARS.NG STORAGE BUCKETS SETUP
-- Date: 2025-11-28
-- ============================================================================
-- This migration creates storage buckets for:
-- 1. Buyer verification documents (ID cards, proof of income)
-- 2. Vehicle inspection photos
-- 3. Vehicle inspection reports (PDF)
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================================

-- Create verification-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false, -- Private bucket (only accessible by owner and admins)
  10485760, -- 10MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create inspection-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  false, -- Private bucket
  5242880, -- 5MB file size limit per photo
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create inspection-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-reports',
  'inspection-reports',
  false, -- Private bucket
  20971520, -- 20MB file size limit for PDF reports
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORAGE POLICIES FOR VERIFICATION DOCUMENTS
-- ============================================================================

-- Allow authenticated buyers to upload their own verification documents
CREATE POLICY "Buyers can upload their own verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow buyers to view their own verification documents
CREATE POLICY "Buyers can view their own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow buyers to update their own verification documents
CREATE POLICY "Buyers can update their own verification documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow buyers to delete their own verification documents
CREATE POLICY "Buyers can delete their own verification documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Allow admins to manage all verification documents
CREATE POLICY "Admins can manage all verification documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- ============================================================================
-- 3. STORAGE POLICIES FOR INSPECTION PHOTOS
-- ============================================================================

-- Allow authenticated users (buyers, dealers, admins) to upload inspection photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Allow buyers to view inspection photos for their inspections
CREATE POLICY "Buyers can view their inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.buyer_id = auth.uid()
    AND (storage.foldername(name))[1] = inspections.id::text
  )
);

-- Allow dealers to view inspection photos for their cars
CREATE POLICY "Dealers can view inspection photos for their cars"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.dealer_id = auth.uid()
    AND (storage.foldername(name))[1] = inspections.id::text
  )
);

-- Allow admins to view all inspection photos
CREATE POLICY "Admins can view all inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Allow admins to manage all inspection photos
CREATE POLICY "Admins can manage all inspection photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- ============================================================================
-- 4. STORAGE POLICIES FOR INSPECTION REPORTS
-- ============================================================================

-- Allow authenticated users to upload inspection reports
CREATE POLICY "Authenticated users can upload inspection reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-reports');

-- Allow buyers to view their inspection reports
CREATE POLICY "Buyers can view their inspection reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-reports'
  AND EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.buyer_id = auth.uid()
    AND (storage.foldername(name))[1] = inspections.id::text
  )
);

-- Allow dealers to view inspection reports for their cars
CREATE POLICY "Dealers can view inspection reports for their cars"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-reports'
  AND EXISTS (
    SELECT 1 FROM inspections
    WHERE inspections.dealer_id = auth.uid()
    AND (storage.foldername(name))[1] = inspections.id::text
  )
);

-- Allow admins to view all inspection reports
CREATE POLICY "Admins can view all inspection reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-reports'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Allow admins to manage all inspection reports
CREATE POLICY "Admins can manage all inspection reports"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'inspection-reports'
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ============================================================================

-- Function to get verification document upload URL
CREATE OR REPLACE FUNCTION get_verification_document_url(buyer_id UUID, file_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'verification-documents/' || buyer_id::text || '/' || file_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get inspection photo upload URL
CREATE OR REPLACE FUNCTION get_inspection_photo_url(inspection_id UUID, file_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'inspection-photos/' || inspection_id::text || '/' || file_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get inspection report upload URL
CREATE OR REPLACE FUNCTION get_inspection_report_url(inspection_id UUID, file_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'inspection-reports/' || inspection_id::text || '/' || file_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Storage buckets created successfully!
--
-- Buckets created:
-- 1. verification-documents (10MB limit, supports images and PDFs)
-- 2. inspection-photos (5MB limit, supports images only)
-- 3. inspection-reports (20MB limit, supports PDFs and documents)
--
-- Access control:
-- - Buyers can only access their own verification documents
-- - Buyers and dealers can access inspection photos/reports for their transactions
-- - Admins have full access to all buckets
--
-- Usage in your application:
--
-- // Upload verification document
-- const filePath = `${buyer.id}/id_document_${Date.now()}.jpg`
-- await supabase.storage
--   .from('verification-documents')
--   .upload(filePath, file)
--
-- // Upload inspection photo
-- const photoPath = `${inspection.id}/photo_${Date.now()}.jpg`
-- await supabase.storage
--   .from('inspection-photos')
--   .upload(photoPath, file)
--
-- // Upload inspection report
-- const reportPath = `${inspection.id}/report_${Date.now()}.pdf`
-- await supabase.storage
--   .from('inspection-reports')
--   .upload(reportPath, file)
