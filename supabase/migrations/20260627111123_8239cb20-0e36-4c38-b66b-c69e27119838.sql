
-- 1) Drop unused BYO keys column
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS byo_keys;

-- 2) Access key usage log (for IP-abuse detection)
CREATE TABLE IF NOT EXISTS public.access_key_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.access_keys(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  user_agent text,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_key_uses_key_id_used_at_idx
  ON public.access_key_uses (key_id, used_at DESC);

GRANT SELECT ON public.access_key_uses TO authenticated;
GRANT ALL ON public.access_key_uses TO service_role;

ALTER TABLE public.access_key_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read own key uses"
  ON public.access_key_uses
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.access_keys k
    WHERE k.id = access_key_uses.key_id AND k.user_id = auth.uid()
  ));

-- 3) Tighten existing policies: restrict to authenticated role
DROP POLICY IF EXISTS "users manage own access_keys" ON public.access_keys;
CREATE POLICY "users manage own access_keys"
  ON public.access_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own settings" ON public.user_settings;
CREATE POLICY "users manage own settings"
  ON public.user_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owners manage investigations" ON public.investigations;
CREATE POLICY "owners manage investigations"
  ON public.investigations FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owners read agent_steps" ON public.agent_steps;
CREATE POLICY "owners read agent_steps"
  ON public.agent_steps FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investigations i
    WHERE i.id = agent_steps.investigation_id AND i.owner_id = auth.uid()));

DROP POLICY IF EXISTS "owners read findings" ON public.findings;
CREATE POLICY "owners read findings"
  ON public.findings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investigations i
    WHERE i.id = findings.investigation_id AND i.owner_id = auth.uid()));

DROP POLICY IF EXISTS "owners read reports" ON public.reports;
CREATE POLICY "owners read reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investigations i
    WHERE i.id = reports.investigation_id AND i.owner_id = auth.uid()));
