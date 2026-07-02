## Phase 5 Scope

Four workstreams, in this order (later steps depend on earlier ones):

1. Real OSINT adapters (replace placeholder handlers)
2. Live investigation UX (streaming steps + progressive graph)
3. Paddle billing for Pro / Ultra
4. Notifications + shareable report links

---

### 1. Real OSINT adapters

Goal: `search_username`, `scrape_url`, `lookup_roblox`, `lookup_discord`, `roblox_to_discord`, `check_breach`, and `hash_avatar` all do real HTTP work, respect Worker limits, and write proper `findings` rows.

- **`search_username`** — dispatch all 60 entries from `src/lib/sites.ts` in parallel with `Promise.allSettled`, per-site `AbortController` with an 8s timeout, follow up to 2 redirects, treat a hit as `status===200 && !errorMatch && bodyMatches`. Concurrency capped at 12 in-flight via a tiny semaphore to keep the Worker under CPU budget. Each hit writes one `findings` row (`platform`, `url`, `username`, `confidence`).
- **`scrape_url`** — real `fetch` with UA `Vantage/1.0 (+https://vantage.osint)`, 8s timeout, 512KB body cap, strip scripts/styles, extract `<title>`, `<meta name="description">`, `og:*`, `twitter:*`, first `<h1>`, first 20 `<a href>`, and the largest `<img>` for avatar candidates. Returns normalized JSON, no HTML.
- **`lookup_roblox`** — real calls to `users.roblox.com/v1/users/{id}`, `users.roblox.com/v1/usernames/users` (POST), and `thumbnails.roblox.com/v1/users/avatar-headshot` for avatar URL. Store avatar URL so `correlate` can hash it.
- **`lookup_discord`** — Discord doesn't expose profiles unauth'd. Use Discord's public widget lookups where possible (guild presence only), plus known-username scrape via public `dsc.gg` / `discord.id` mirrors. Where nothing is available, mark `status: "no_public_data"` and write a `note` finding — no fake hits.
- **`roblox_to_discord`** — parse the real Roblox profile "About" text for `discord.gg/…`, `Discord: name#0000`, and the new `@handle` format via regex list defined in one place.
- **`check_breach`** — keep the current gravatar + MX + disposable domain checks (already real). Add HIBP-style k-anonymity call only if `HIBP_API_KEY` is present as a runtime secret (skip cleanly otherwise; do not prompt the user).
- **`hash_avatar`** — fetch bytes with 3s timeout, 2MB cap, SHA-256 already implemented. Add a coarse 8x8 aHash (average-hash) via `crypto.subtle` + manual downscale in pure JS, so cross-platform avatar matches don't need pixel-identical bytes. No `sharp`, no `canvas` — those don't run in Workers.
- All adapters share a new `httpJson` / `httpText` helper in `src/lib/agent/http.server.ts` (timeout, UA, size cap, retry-once on 429/503 with jitter).

Findings written by adapters flow through the existing runner unchanged.

---

### 2. Live investigation UX

Goal: the investigate page shows steps as they happen instead of poll-refreshing every 2s.

- Enable Supabase Realtime on `agent_steps`, `findings`, `investigations`, `reports` (single migration adds all four to `supabase_realtime` publication). RLS already scopes each table to the owner, so subscribers only get their own rows.
- Rewrite `src/routes/_authenticated/investigate.$id.tsx` to keep the existing initial `useQuery` fetch, then subscribe (in `useEffect`, teardown in cleanup) to:
  - `agent_steps` INSERTs → append to the timeline
  - `findings` INSERTs → append + light-up in the graph
  - `investigations` UPDATE on status → drive the progress bar
- Keep `tickInvestigation` polling but drop the interval from 2s to 5s — realtime is now the primary channel; polling is just the fallback that advances phases.
- `IdentityGraph.tsx` gets an `animateAdd` prop: nodes/edges added after mount fade + spring in (Framer Motion, already installed via shadcn's tooltip stack — no new dep).
- Per-step timing: computed client-side from `created_at` deltas between consecutive `agent_steps` rows; render a small `142ms` chip beside the tool name. Retry button on `status === "error"` steps calls a new `retryStep({ stepId })` server fn that re-runs just that tool.

---

### 3. Paddle billing (Pro / Ultra)

Goal: users pay via Paddle → webhook flips `user_settings.plan`; Discord role sync stays as the secondary path.

- Run `payments--recommend_payment_provider` first (product classification), then `payments--enable_paddle_payments`. The user will fill out the Paddle onboarding form.
- After enable, use `batch_create_product` (surfaced post-enable) to create two products:
  - **Vantage Pro** — monthly, unlimited investigations, keys don't expire.
  - **Vantage Ultra** — monthly, everything in Pro + priority runner + higher rate-limit ceiling.
- Rewrite `src/routes/_authenticated/billing.tsx`: real "Upgrade to Pro" / "Upgrade to Ultra" buttons that call `createCheckoutSession({ productId })` server fn using the Paddle SDK helper Lovable surfaces post-enable. Current plan + renewal date + "Manage subscription" (Paddle customer portal link) shown when active.
- New `src/routes/api/public/paddle/webhook.ts` — verifies Paddle webhook signature, on `subscription.activated` / `subscription.updated` sets `user_settings.plan` to `pro`/`ultra` and stores `paddle_customer_id` + `paddle_subscription_id`; on `subscription.canceled` / `subscription.past_due` after grace period, downgrades to `free`. Migration adds those two columns to `user_settings`.
- Precedence rule when both Discord role and Paddle say different things: **Paddle wins** (they paid). Discord sync is now a bonus perk for guild members without a subscription — capped at `pro`.

---

### 4. Notifications + shareable report links

- **Discord DM notification** on completion: reuse the stored `discord_id` + a new `DISCORD_BOT_TOKEN` runtime secret (asked for via `add_secret` after the user confirms). Runner posts a DM at the moment status flips to `done` or `error`. Silently skips if the user has DMs from server members disabled — no retry storm.
- **Email notification**: skip for now (needs a mail provider; not in scope this phase — call it out so the user can add it in Phase 6).
- **Shareable report links**:
  - New table `report_shares(id, investigation_id, token_hash, expires_at, created_by, revoked_at)` — `token` is a 32-byte CSPRNG value, only `sha256(token)` stored.
  - New public route `src/routes/r.$token.tsx` (SSR, no auth) — loader calls a public server fn `getSharedReport({ token })` that hashes, looks up an un-revoked, un-expired share, joins to `reports`, and returns markdown + minimal target metadata (no owner ID, no raw findings JSON).
  - Report page gets **Share** button → creates a share (default 7-day TTL, "Copy link" toast) and **Revoke** in a share-management dialog listing active links.
  - Rate-limit share creation to 20 / user / day using the same pattern as `investigation_rate_limits`.

---

## Technical section

### Database migrations

- Add `paddle_customer_id`, `paddle_subscription_id`, `plan_source` (`'free' | 'discord' | 'paddle'`) to `user_settings`.
- Create `report_shares` with RLS (`owner = auth.uid()` for SELECT/INSERT/UPDATE, no anon), plus `GRANT SELECT, INSERT, UPDATE ON public.report_shares TO authenticated; GRANT ALL ... TO service_role;`. Public lookup goes through a `SECURITY DEFINER` function `public.get_shared_report(_token_hash text)` so anon never touches the table directly.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_steps, public.findings, public.investigations, public.reports;`

### Files

New:
- `src/lib/agent/http.server.ts`
- `src/lib/agent/hash.server.ts` (aHash + sha256)
- `src/lib/shares.functions.ts`
- `src/lib/billing.functions.ts`
- `src/routes/api/public/paddle/webhook.ts`
- `src/routes/r.$token.tsx`
- `supabase/migrations/<ts>_phase_5_billing_and_shares.sql`
- `supabase/migrations/<ts>_phase_5_realtime.sql`

Edited:
- `src/lib/agent/registry.server.ts` — real adapter bodies for the tools listed above.
- `src/lib/agent/runner.server.ts` — DM-notify on terminal status; drop `EVIDENCE_MAX` to 15 (adapter scrapes are heavier now).
- `src/routes/_authenticated/investigate.$id.tsx` — realtime subscriptions + animated graph.
- `src/routes/_authenticated/report.$id.tsx` — Share + Revoke UI.
- `src/routes/_authenticated/billing.tsx` — Paddle checkout + portal.
- `src/components/vantage/IdentityGraph.tsx` — `animateAdd` mode.

### Secrets (requested via add_secret only after user confirms)

- `DISCORD_BOT_TOKEN` (for DM notifications)
- `PADDLE_WEBHOOK_SECRET` (auto-populated by `enable_paddle_payments` post-enable flow; requested if missing)
- `HIBP_API_KEY` (optional; adapter no-ops if unset)

### Order of execution

1. Migrations (realtime publication + `user_settings` columns + `report_shares`).
2. `http.server.ts` + `hash.server.ts` helpers.
3. Real adapters in `registry.server.ts` (biggest chunk of code).
4. Realtime wiring in `investigate.$id.tsx` + graph animation.
5. Enable Paddle (`recommend_payment_provider` → `enable_paddle_payments` → product batch) → wire `billing.tsx` + webhook.
6. Share links: table already exists from step 1; add `shares.functions.ts`, `r.$token.tsx`, UI in `report.$id.tsx`.
7. Discord DM on terminal status.
8. Smoke test: launch an investigation, watch steps stream in live, complete a Paddle sandbox checkout, receive a DM, generate a share link, open it in a private window.

### Out of scope (call out for later)

- Email notifications (no mail provider connected).
- Stripe alternative (user chose Paddle).
- Custom domain for share links (`vntg.link/…` etc.) — can add after DNS is set up.
