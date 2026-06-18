
-- media_items
CREATE TABLE public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  cover_url text,
  video_url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO anon, authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read media" ON public.media_items FOR SELECT USING (true);
CREATE POLICY "public write media" ON public.media_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update media" ON public.media_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete media" ON public.media_items FOR DELETE USING (true);

-- scenes
CREATE TABLE public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assignments jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO anon, authenticated;
GRANT ALL ON public.scenes TO service_role;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read scenes" ON public.scenes FOR SELECT USING (true);
CREATE POLICY "public write scenes" ON public.scenes FOR INSERT WITH CHECK (true);
CREATE POLICY "public update scenes" ON public.scenes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete scenes" ON public.scenes FOR DELETE USING (true);

-- displays (id is text — "left", "center", "right", or any custom)
CREATE TABLE public.displays (
  id text PRIMARY KEY,
  current_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.displays TO anon, authenticated;
GRANT ALL ON public.displays TO service_role;
ALTER TABLE public.displays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read displays" ON public.displays FOR SELECT USING (true);
CREATE POLICY "public write displays" ON public.displays FOR INSERT WITH CHECK (true);
CREATE POLICY "public update displays" ON public.displays FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete displays" ON public.displays FOR DELETE USING (true);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.displays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_items;

-- seed default displays
INSERT INTO public.displays (id) VALUES ('left'), ('center'), ('right')
ON CONFLICT (id) DO NOTHING;
