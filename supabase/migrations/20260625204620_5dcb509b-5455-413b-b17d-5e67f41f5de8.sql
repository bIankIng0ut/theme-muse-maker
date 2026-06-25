
-- Extend user_settings with Discord verification fields
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS discord_id text,
  ADD COLUMN IF NOT EXISTS discord_username text,
  ADD COLUMN IF NOT EXISTS discord_verified_at timestamptz;

-- Access keys table
CREATE TABLE IF NOT EXISTS public.access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  label text,
  tier text NOT NULL DEFAULT 'free',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_keys_user_idx ON public.access_keys(user_id);
CREATE INDEX IF NOT EXISTS access_keys_hash_idx ON public.access_keys(key_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_keys TO authenticated;
GRANT ALL ON public.access_keys TO service_role;

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own access_keys"
  ON public.access_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
