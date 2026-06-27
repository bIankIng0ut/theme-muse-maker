## Goals

1. Investigations never get stuck — progress always advances to `done` or `error`.
2. Every user (Free / Pro / Ultra) uses the built-in AI — nobody brings their own API key.
3. Tighten RLS, add a 3-IPs-in-1h auto-ban for access keys, and remove the dead BYO-key surface.

Out of scope for this plan: payments wiring, email delivery, the runner's actual OSINT adapters (those are placeholders today and stay placeholders here).

---

## 1. Why investigations get stuck at 14%

The launch endpoint kicks the runner like this:

```ts
void runInvestigation(row.id, userId).catch(...)
return { id: row.id, status: row.status }
```

On Cloudflare Workers (our SSR runtime), any async work still running when the HTTP response is sent gets **cancelled**. The runner manages to write status `running` (which maps to ~15% in the UI, hence "14%") and then dies before the next phase. The DB row sits in `running` forever, the progress bar parks at 14%, and nothing recovers it.

### Fix: resume-on-poll runner

Split `runInvestigation` into discrete steps and drive them from the client's existing poll loop on the investigate page. Each poll tick calls a `tickInvestigation` server fn that:

1. Loads the investigation + last step index.
2. Executes the **next** phase only (triage → search → scrape → dorks → filter → report).
3. Writes the new `agent_steps` row, updates `status`, returns.

The whole HTTP request for a tick is short (a few seconds), so the Worker never times out. If a tick crashes, the next poll retries from the same phase. A row that has been `running` for >2 min with no new step gets force-failed by the next tick so progress bars don't hang.

`investigate.$id.tsx` already polls; it just calls `tickInvestigation` alongside `getInvestigation` until status is `done` or `error`. The progress-bar logic stays as-is — it'll now actually move because steps land in real time.

The current `createInvestigation` keeps inserting the row + first `queued` step, but stops calling `runInvestigation` directly. The client triggers the first tick immediately on mount.

---

## 2. Everyone uses the built-in AI

Today `src/lib/agent/llm.server.ts` reads `byo_keys` from `user_settings`, prefers OpenRouter/OpenAI/Anthropic/Gemini, and only falls back to Lovable AI for Pro/Ultra (Free is blocked). Per your answer, this becomes:

- `callLlm` always calls the **Lovable AI Gateway** with a single model for everyone (`google/gemini-2.5-flash`, good cost/quality balance for OSINT triage and reporting).
- All BYO-key code paths are deleted.
- The `byo_keys` column on `user_settings` is dropped in a migration; the Settings page no longer shows BYO inputs.
- Plan tier still gates **quotas** (already in `consumeQuotaOrThrow`) and **key expiration** (already in `access-keys.functions.ts`), just not model quality.

`LOVABLE_API_KEY` is provisioned by Lovable, so no user action is needed.

---

## 3. Real RLS / security hardening

I went table by table. Findings worth fixing:

- **`access_keys`**: keys are SHA-256 hashed (fine for high-entropy random keys — bcrypt is overkill here, but we'll add a per-row salt so two identical keys can't collide across rebuilds).
- **3-IPs-in-1h auto-ban** (what you asked for last turn but isn't built yet):
  - Add `access_key_uses` table: `key_id`, `ip_hash`, `user_agent`, `used_at`. RLS: owner-only SELECT.
  - On every `loginWithAccessKey`, insert a row with the SHA-256 of the IP (from `getRequestIP`) — never the raw IP.
  - If the same `key_id` has ≥3 distinct `ip_hash` values in the last 60 minutes, set `revoked_at = now()` and return a clear "key auto-blocked — open a ticket in the Vantage OSINT server" error.
- **`user_settings`**: re-check policies are strict `auth.uid() = user_id` for SELECT/UPDATE/INSERT (audit + tighten if not). No anon access.
- **`investigations` / `findings` / `reports` / `agent_steps`**: confirm every policy scopes to `owner_id = auth.uid()` (or the parent investigation's owner via security-definer function). No `service_role` writes from client. No anon SELECT.
- **Discord OAuth state** in `/api/public/discord/start.ts`: state is a random nonce in base64 — fine, but we'll add an HMAC signature using a generated `DISCORD_OAUTH_STATE_SECRET` so the callback can verify state wasn't forged.
- **Input validation**: already Zod-validated everywhere that matters; no change.

Things I'm explicitly **not** doing because they aren't real issues, contrary to the audit you pasted:

- "Remove `VITE_SUPABASE_*` from `.env`" — these are the *publishable* (anon) key and project URL. They're meant to ship to the browser, protected by RLS. Removing them breaks the app. Lovable Cloud manages them; users don't have a Supabase dashboard.
- "Use bcrypt/Argon2 for access keys" — bcrypt is for *low-entropy* user passwords. Our keys are 24 bytes of CSPRNG; SHA-256 with a salt is correct and ~10⁴× faster on login.
- "Rate limit via Redis" — there's no Redis here, and the platform has no standard rate-limit primitive. The 3-IPs-in-1h ban above is the abuse control we actually agreed on.

---

## Technical changes

**Database migration**
- `ALTER TABLE user_settings DROP COLUMN byo_keys`.
- `CREATE TABLE access_key_uses (id, key_id → access_keys, ip_hash text, user_agent text, used_at timestamptz)` with grants + RLS (owner-only SELECT via security-definer joining `access_keys.user_id = auth.uid()`).
- Audit + tighten policies on `user_settings`, `investigations`, `findings`, `reports`, `agent_steps` if anything is looser than owner-scoped.
- `ALTER TABLE access_keys ADD COLUMN salt text` (optional per-row salt for new keys).

**Code**
- `src/lib/agent/runner.server.ts`: split into `tickInvestigation(id)` that runs one phase per call, plus a `forceFailIfStale(id)` helper. Keep `writeStep` / `setStatus`.
- `src/lib/investigations.functions.ts`: `createInvestigation` stops calling `runInvestigation`; add `tickInvestigation` server fn that wraps the runner step.
- `src/lib/agent/llm.server.ts`: collapse to Lovable AI Gateway only.
- `src/lib/access-keys.functions.ts`: in `loginWithAccessKey`, hash request IP, insert into `access_key_uses`, check distinct-IP count in last hour, auto-revoke and clear error.
- `src/routes/api/public/discord/start.ts` + `callback.ts`: HMAC-signed state with `DISCORD_OAUTH_STATE_SECRET` (generated, not user-provided).
- `src/routes/_authenticated/settings.tsx`: remove BYO-key fields.
- `src/routes/_authenticated/investigate.$id.tsx`: in the existing poll loop, also call `tickInvestigation` while status is not terminal.

**Secrets**
- Generate `DISCORD_OAUTH_STATE_SECRET` (no user action).
- `LOVABLE_API_KEY` already present.

---

## Order of operations

1. DB migration (drop `byo_keys`, create `access_key_uses`, tighten RLS).
2. Rewrite `llm.server.ts` + delete BYO UI in Settings.
3. Split runner into tick-based phases + wire `tickInvestigation` into the investigate page poll.
4. Add IP logging + auto-ban in `loginWithAccessKey`.
5. Sign Discord OAuth state.
6. Manual smoke test: launch an investigation, watch progress climb 15% → 30% → 60% → 80% → 100% across poll ticks.
