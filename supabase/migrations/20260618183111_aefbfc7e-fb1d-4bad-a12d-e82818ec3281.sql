
CREATE POLICY "public read presentations" ON storage.objects FOR SELECT USING (bucket_id = 'presentations');
CREATE POLICY "public insert presentations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'presentations');
CREATE POLICY "public update presentations" ON storage.objects FOR UPDATE USING (bucket_id = 'presentations') WITH CHECK (bucket_id = 'presentations');
CREATE POLICY "public delete presentations" ON storage.objects FOR DELETE USING (bucket_id = 'presentations');
