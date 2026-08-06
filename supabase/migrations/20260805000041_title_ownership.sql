CREATE TABLE IF NOT EXISTS public.title_master (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ACHIEVEMENT', 'MISSION', 'PVP_SEASON', 'GVG_SEASON', 'EVENT', 'DISTRIBUTION')),
  source_key TEXT,
  season_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_titles (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES public.title_master(id) ON DELETE RESTRICT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);

INSERT INTO public.title_master (id, name, source_type, source_key)
VALUES ('title_none', 'No Title', 'DISTRIBUTION', 'DEFAULT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_titles (user_id, title_id)
SELECT id, 'title_none' FROM public.users
ON CONFLICT DO NOTHING;

ALTER TABLE public.title_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read active title master" ON public.title_master
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Read own titles" ON public.user_titles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
