# studygroup.ph

A Philippine student social platform, built with Vite, React, Tailwind CSS v4, and a real
Supabase backend (Postgres + Auth + Realtime).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and create a new project.
2. Go to **Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in the contents of `supabase/schema.sql` from this project and click **Run**.
   This creates the `profiles`, `posts`, `comments`, `post_likes`, `mod_log`, `squads`,
   `squad_members`, `messages`, `notifications`, `vibes`, and `vibe_comments` tables, sets up Row
   Level Security policies, the profile-creation trigger, storage buckets for images and videos,
   seeds three default squads, and turns on Realtime.

   **Already ran an older version of schema.sql before?** You only need the new pieces, not a
   full re-run:
   - `supabase/migration_002_squads_and_messaging.sql` — squads, squad membership, DMs
   - `supabase/migration_003_post_images.sql` — the `image_url` column and a public
     `post-images` storage bucket
   - `supabase/migration_004_notifications.sql` — the `notifications` table and its triggers
   - `supabase/migration_005_email_confirmation.sql` — the trigger that creates a profile row
     automatically on signup (superseded by migration 007 below if you're doing Google sign-in)
   - `supabase/migration_006_gmail_only_signup.sql` — restricts signup to `@gmail.com` addresses
   - `supabase/migration_007_google_oauth.sql` — see step 3
   - `supabase/migration_008_real_vibes.sql` — the `vibes`/`vibe_comments` tables and a
     `vibe-videos` storage bucket for the Vibes Feed
   - `supabase/migration_009_security_hardening.sql` — **run this regardless**, even if you
     ran everything above already. See the Security section below for what it fixes.

## 3. Add "Continue with Google"

Google OAuth verifies the person actually owns the account they sign in with — no confirmation
email, no relying on the domain alone. This is the recommended path for real testers.

1. Run `supabase/migration_007_google_oauth.sql` in the SQL Editor. This adds an `onboarded`
   flag (Google doesn't give us academic tier or school, so first-time Google sign-ins land on
   a short in-app step to fill those in) and updates the signup trigger to still require a
   `gmail.com` address either way.
2. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Create/select a project → **APIs & Services → Credentials**
   - Create an **OAuth 2.0 Client ID** (Application type: Web application)
   - Leave this tab open — you'll paste a redirect URI here in the next step
3. **Supabase Dashboard → Authentication → Providers → Google**:
   - Toggle it on
   - Copy the **Redirect URL** Supabase shows you → paste it into the Google Cloud OAuth
     client's **Authorized redirect URIs** (step 2) → save on the Google side
   - Paste your Google **Client ID** and **Client Secret** into Supabase → Save
4. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL**: your production URL (e.g. `https://studygroup-xyz.vercel.app`)
   - **Redirect URLs**: add both `http://localhost:5173` and your production URL

Email/password signup (from the earlier steps) still works as a fallback and is still
restricted to `@gmail.com` — you don't have to run `migration_006` separately if you're doing
this migration, it's included.

## 4. Configure your local environment

```bash
cp .env.example .env
```

Open `.env` and fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 5. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, sign up with a real email + password, and you're in.

## Accounts

- **"Continue with Google"** (recommended, once step 3 above is set up): one click, Google
  verifies the person owns the account, no password to remember. First-time Google sign-ins hit
  a short onboarding step to pick a school and academic tier, since Google doesn't provide that.
- **Email/password** still works as a fallback: name, email, password, school, and one academic
  tier (JHS / SHS / UNI), all collected up front.
- **One account per email** either way — Supabase Auth won't let two accounts share an email,
  and the app surfaces that as a clear error on signup.
- **Gmail addresses only**: signup rejects anything that isn't `@gmail.com`, enforced both
  client-side and in the database, for both login methods.
- Sessions persist across refreshes (Supabase handles this) and you log out from the avatar menu.

## Mobile / responsive

The layout adapts across three breakpoints:

- **Below `md` (phones)**: the left nav and right directory/moderation panel become slide-in
  drawers (hamburger icon and panel icon in the top bar open them), and a bottom tab bar
  (Home / Vibes / Squads) replaces the top nav's icon row.
- **`md` to `lg` (tablets)**: the left sidebar becomes a static column again; the right panel
  stays a drawer until `lg`.
- **`lg` and up (desktop)**: the original fixed 3-column layout.

The Vibes Feed player and Q&A panel stack vertically below `lg` instead of sitting
side-by-side, and the DM modal sizes itself to the viewport instead of a fixed 380×520 box.

## What's real now (no mock/placeholder logic left)

- **Auth**: real Supabase Auth signup/login/logout/session.
- **Posts**: stored in Postgres, created by the composer, visible to everyone signed in.
- **Post images**: the composer's image icon uploads a real file to Supabase Storage (public
  `post-images` bucket) and attaches it to the post. Reporting a post as severe hides the image
  along with the rest of the post, same as text-only posts.
- **Comments**: stored per post, added live.
- **Likes**: tracked per user in a `post_likes` table — you can't double-like, and unliking
  actually removes your row.
- **Reporting → quarantine**: reporting a post as "Explicit/Sexual Content" or "Graphic
  Violence/Gore" sets `quarantined = true` on that row in the database (so it's gone for
  everyone, not just your browser) and writes a timestamped entry to the `mod_log` table, shown
  live in the Moderation Activity Center.
- **Vibes Feed**: "Post a Reel" uploads a real video file to Supabase Storage (public
  `vibe-videos` bucket, 50MB cap) and creates a real row in the `vibes` table. The Q&A thread is
  backed by `vibe_comments` — real, persisted questions, not mock Q&A pairs. Reporting a clip as
  severe quarantines it in the database the same way a post does. The old "auto-caption
  transcript" feature was removed rather than kept as a placeholder — there's no real
  transcription pipeline behind it.
- **Student profiles sidebar**: shows real signed-up accounts (excluding yourself), not a
  seeded list. Empty until other people sign up.
- **Study Squads**: real squads stored in `squads`/`squad_members`. You can create a squad,
  join, leave, and see live member counts. Opening a squad shows a real feed filtered to that
  squad, with its own composer that posts directly into it. The left sidebar's "Your squads"
  list reflects squads you've actually joined.
- **Send DM / Message Mentor**: real one-on-one messaging backed by a `messages` table, with a
  live-updating chat window. "Send DM" is disabled on minor profiles; "Message Mentor" opens a
  chat with whichever account has been flagged `is_mentor = true` (see setup note below).
- **Notifications**: a bell icon in the top bar with an unread badge. You get a notification
  when someone likes or comments on your post, or sends you a DM — created by database triggers
  (`notify_on_like`, `notify_on_comment`, `notify_on_message`), so they fire regardless of which
  client performed the action. Clicking a message notification opens that chat directly; "Mark
  all read" clears the badge.
- **Realtime**: the feed, squads, and moderation log update live via Supabase Realtime — open
  the app in two tabs (or two accounts) and post/like/comment/join in one to see it in the other
  without refreshing.
- **JHS view-only restriction**: still enforced client-side (composer disabled) — for a
  stricter version, add a Postgres policy that rejects inserts from `JHS` tier profiles.

### Setting up a mentor account

The "Message Mentor" button needs a real account flagged as the mentor:
1. Sign up a normal account through the app for whoever will be the mentor (e.g. a teacher/admin).
2. In the Supabase SQL Editor, run:
   ```sql
   update profiles set is_mentor = true where email = 'mentor@example.com';
   ```
Until this is done, clicking "Message Mentor" shows a toast saying no mentor is set up yet.

## What's still mock/local (by design, for this prototype)

- Nothing left in this category — Vibes was the last piece still using mock/seed data. Every
  feature listed above is backed by real Supabase tables now.

## Project structure

```
supabase/
  schema.sql                   run once in the Supabase SQL Editor for a fresh project
  migration_002_squads_and_messaging.sql   run this if you already ran an older schema.sql
src/
  App.jsx                     auth gate + data fetching + realtime subscriptions
  main.jsx                    React root
  index.css                   Tailwind v4 import + Academic Yellow theme tokens
  lib/
    supabaseClient.js          Supabase client, reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
    postsApi.js                 fetch/create posts, comments, likes, quarantine, mod log
    squadsApi.js                 fetch/join/leave/create squads
    vibesApi.js                   fetch/create/quarantine vibes, real Q&amp;A comments
    storageApi.js                 image and video upload helpers (Supabase Storage)
    usersApi.js                  real profiles directory + mentor lookup
    messagesApi.js               DM thread fetch/send
    format.js                    timeAgo / timestamp formatting helpers
  hooks/useAuth.js             signup / login / logout against Supabase Auth + profiles table
  data/mockData.js             tier metadata, Vibes seed clips, report reasons
  components/
    AuthScreen.jsx              login / signup screen, Google OAuth button
    OnboardingScreen.jsx         first-time Google sign-in: pick tier and school
    TopNav.jsx                   fixed top bar: logo, search, tabs, theme toggle, logout menu
    LeftSidebar.jsx              pinned nav + your real joined squads
    RightSidebar.jsx             real student profiles, system warnings, moderation log, DMs
    FeedView.jsx                 center feed workspace (Home / My Major / squad detail)
    SquadsView.jsx                squad list, join/leave/create, squad detail feed
    PostCard.jsx                  post card, composer, comments, likes, share-to-clipboard
    VibesView.jsx                 real video upload/playback, live Q&amp;A, keyboard nav
    DMModal.jsx                   real-time direct message thread
    Shared.jsx                    Avatar, TierBadge, Toast, ReportMenu
```

## Security

Run `supabase/migration_009_security_hardening.sql` (included in `schema.sql` for fresh
installs) — it fixes four real issues found in review:

1. **Posts/vibes "quarantine" access was too broad.** The old RLS policy checked *who* was
   making a request, not *what* they were changing — any signed-in user could rewrite someone
   else's post content, not just flip the quarantine flag. Fixed with a single narrow database
   function (`report_and_quarantine`) that only ever does that one thing, called via RPC instead
   of a direct client `UPDATE`.
2. **The moderation log could be forged.** Any signed-in user could `INSERT` arbitrary fake
   entries into `mod_log` directly. Fixed the same way — only the RPC above can write to it now,
   and only alongside an actual quarantine.
3. **Email addresses were readable by any signed-in user** via the API, even though the UI never
   showed them. Fixed by revoking column-level access; your own email now comes from the Auth
   session, not the `profiles` table.
4. **Storage buckets had no server-side file-size/type limits** — the 8MB/50MB checks only
   existed in the browser and could be bypassed by calling the Storage API directly. Fixed by
   setting limits on the buckets themselves.

`vercel.json` also adds baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`) to the deployed site.

**Known limitation, not fixed by this migration:** there's no rate limiting on posting,
commenting, liking, or messaging — a signed-in user could still spam actions quickly by scripting
requests. Supabase's own Auth rate limits (Dashboard → Authentication → Rate Limits) cover
signup/login abuse, but per-action throttling on the app's own tables would need an Edge Function
or similar server-side layer — a bigger addition than a SQL migration. Worth building if this
opens up beyond a small trusted group.

## Deploying

Once this works locally, deploying to Vercel is the same as before — connect the repo, framework
preset **Vite**, build command `npm run build`, output directory `dist`. The one extra step: add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **Environment Variables** in the Vercel
project settings (Project → Settings → Environment Variables) before deploying, since those are
no longer optional now that the app depends on them.
