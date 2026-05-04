-- Create storage bucket for batch label photos
INSERT INTO storage.buckets (id, name, public) VALUES ('batch-labels', 'batch-labels', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for batch labels
CREATE POLICY "Batch label images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'batch-labels');

CREATE POLICY "Authenticated users can upload batch labels"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'batch-labels');

CREATE POLICY "Authenticated users can update batch labels"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'batch-labels');

CREATE POLICY "Authenticated users can delete batch labels"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'batch-labels');