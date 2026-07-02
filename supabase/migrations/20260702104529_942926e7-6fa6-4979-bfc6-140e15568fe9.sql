
-- 1. user_settings additions for Paddle billing
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_source text NOT NULL DEFAULT 'free'
    CHECK (plan_source IN ('free','discord','paddle')),
  ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz;

-- 2. report_shares: public share links for reports
CREATE TABLE IF NOT EXISTS public.report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_shares_owner ON public.report_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_investigation ON public.report_shares(investigation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_shares TO authenticated;
GRANT ALL ON public.report_shares TO service_role;

ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shares"
  ON public.report_shares FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Security-definer lookup so anon visitors never read the shares table directly.
CREATE OR REPLACE FUNCTION public.get_shared_report(_token_hash text)
RETURNS TABLE (
  investigation_target text,
  investigation_target_type text,
  investigation_created_at timestamptz,
  report_markdown text,
  report_summary text,
  report_identity_graph jsonb,
  finding_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
BEGIN
  SELECT rs.id, rs.investigation_id INTO s
  FROM public.report_shares rs
  WHERE rs.token_hash = _token_hash
    AND rs.revoked_at IS NULL
    AND rs.expires_at > now()
  LIMIT 1;

  IF s.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.report_shares SET view_count = view_count + 1 WHERE id = s.id;

  RETURN QUERY
  SELECT
    i.target,
    i.target_type,
    i.created_at,
    r.markdown,
    r.summary,
    r.identity_graph,
    (SELECT count(*) FROM public.findings f WHERE f.investigation_id = i.id)
  FROM public.investigations i
  LEFT JOIN public.reports r ON r.investigation_id = i.id
  WHERE i.id = s.investigation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_report(text) TO anon, authenticated;

-- 3. Share rate limiting
CREATE TABLE IF NOT EXISTS public.share_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_rate_owner_time ON public.share_rate_limits(owner_id, created_at);

GRANT SELECT, INSERT ON public.share_rate_limits TO authenticated;
GRANT ALL ON public.share_rate_limits TO service_role;

ALTER TABLE public.share_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners see their own rate rows"
  ON public.share_rate_limits FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners insert their own rate rows"
  ON public.share_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 4. Realtime publication (idempotent-safe: catch if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.investigations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_steps;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.findings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
