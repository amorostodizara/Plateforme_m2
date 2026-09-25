CREATE POLICY "fichiers_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fichiers');

CREATE POLICY "fichiers_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fichiers' AND owner = auth.uid());

CREATE POLICY "fichiers_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fichiers' AND owner = auth.uid())
WITH CHECK (bucket_id = 'fichiers' AND owner = auth.uid());

CREATE POLICY "fichiers_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fichiers' AND owner = auth.uid());