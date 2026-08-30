-- SportSphere: team logo storage bucket and RLS

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY team_logos_select_public ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'team-logos');

CREATE POLICY team_logos_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY team_logos_update_own ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY team_logos_delete_own ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
