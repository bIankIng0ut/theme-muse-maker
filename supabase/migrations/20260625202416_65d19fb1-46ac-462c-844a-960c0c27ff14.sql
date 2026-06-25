
CREATE TABLE public.investigations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'auto',
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage investigations" ON public.investigations
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  platform TEXT,
  url TEXT,
  username TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  raw_data JSONB,
  screenshot_url TEXT,
  is_false_positive BOOLEAN NOT NULL DEFAULT false,
  filter_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read findings" ON public.findings
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_id AND i.owner_id = auth.uid()));

CREATE TABLE public.agent_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  note TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_steps TO authenticated;
GRANT ALL ON public.agent_steps TO service_role;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read agent_steps" ON public.agent_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_id AND i.owner_id = auth.uid()));

CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID NOT NULL UNIQUE REFERENCES public.investigations(id) ON DELETE CASCADE,
  markdown TEXT NOT NULL,
  summary TEXT,
  identity_graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read reports" ON public.reports
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_id AND i.owner_id = auth.uid()));

CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  byo_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  nightly_count INT NOT NULL DEFAULT 0,
  nightly_window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_investigations_updated BEFORE UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
