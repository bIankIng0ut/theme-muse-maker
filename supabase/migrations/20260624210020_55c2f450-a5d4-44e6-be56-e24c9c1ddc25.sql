
CREATE TABLE public.investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('auto','username','email','discord_id','roblox_id')),
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','filtering','reporting','done','error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_investigations_owner_created ON public.investigations(owner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_inv" ON public.investigations FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner_insert_inv" ON public.investigations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_update_inv" ON public.investigations FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_delete_inv" ON public.investigations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.owns_investigation(_inv UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.investigations WHERE id = _inv AND owner_id = auth.uid());
$$;

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  platform TEXT,
  url TEXT,
  username TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  raw_data JSONB,
  screenshot_url TEXT,
  is_false_positive BOOLEAN NOT NULL DEFAULT FALSE,
  filter_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_findings_investigation ON public.findings(investigation_id);
CREATE INDEX idx_findings_platform ON public.findings(platform);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_findings" ON public.findings FOR ALL TO authenticated
  USING (public.owns_investigation(investigation_id))
  WITH CHECK (public.owns_investigation(investigation_id));

CREATE TABLE public.agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  note TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_steps_inv ON public.agent_steps(investigation_id, step_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_steps TO authenticated;
GRANT ALL ON public.agent_steps TO service_role;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_steps" ON public.agent_steps FOR ALL TO authenticated
  USING (public.owns_investigation(investigation_id))
  WITH CHECK (public.owns_investigation(investigation_id));

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL UNIQUE REFERENCES public.investigations(id) ON DELETE CASCADE,
  markdown TEXT,
  pdf_url TEXT,
  identity_graph JSONB,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_reports" ON public.reports FOR ALL TO authenticated
  USING (public.owns_investigation(investigation_id))
  WITH CHECK (public.owns_investigation(investigation_id));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_investigations_updated_at BEFORE UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.investigations REPLICA IDENTITY FULL;
ALTER TABLE public.agent_steps REPLICA IDENTITY FULL;
ALTER TABLE public.findings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investigations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.findings;
