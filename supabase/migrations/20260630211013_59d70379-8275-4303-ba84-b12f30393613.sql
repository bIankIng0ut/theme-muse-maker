CREATE TABLE public.investigation_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text,
  created_at timestamp with time zone not null default now()
);

CREATE INDEX investigation_rate_limits_user_created_idx
  ON public.investigation_rate_limits (user_id, created_at desc);

GRANT ALL ON public.investigation_rate_limits TO service_role;

ALTER TABLE public.investigation_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon: this table is server-only (service_role).
