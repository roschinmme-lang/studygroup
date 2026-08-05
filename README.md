# studygroup.ph

A Philippine student social platform, built with Vite, React, Tailwind CSS v4, and a real
Supabase backend (Postgres + Auth + Realtime).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and create a new project.
2. Once it's ready, go to **Authentication → Providers → Email** and turn **off** "Confirm email".
   This lets signup log people in immediately, which is what this app expects. (Turn it back on
   later if you want real email verification before going live.)
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in the contents of `supabase/schema.sql` from this project and click **Run**.
   This creates the `profiles`, `posts`, `comments`, `post_likes`, `mod_log`, `squads`,
   `squad_members`, and `messages` tables, sets up Row Level Security policies, seeds three
   default squads, and turns on Realtime.

   **Already ran the old version of schema.sql before?** You only need the new tables, not a
   full re-run. Open **SQL Editor → New query** and run `supabase/migration_002_squads_and_messaging.sql`
   instead — it's safe to run even if some of it already exists.

   **Adding post images to an existing project?** Also run `supabase/migration_003_post_images.sql`
   — it adds the `image_url` column and a public `post-images` storage bucket with upload policies.

   **Adding notifications to an existing project?** Also run `supabase/migration_004_notifications.sql`
   — it adds a `notifications` table plus database triggers that fire automatically on likes,
   comments, and messages.

## 3. Configure your local environment

```bash
cp .env.example .env
```

Open `.env` and fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, sign up with a real email + password, and you're in.

## Accounts

- Every visitor signs up for a real account through Supabase Auth: name, email, password, school,
  and one academic tier (JHS / SHS / UNI).
- **One account per email** is enforced two ways: Supabase Auth won't let two accounts share an
  email, and the app surfaces that as a clear error on signup.
- Sessions persist across refreshes (Supabase handles this) and you log out from the avatar menu.

## Mobile / responsive

The layout adapts across three breakpoints:

- **Below `md` (phones)**: the left nav and right directory/moderation panel become slide-in
  drawers (hamburger icon and panel icon in the top bar open them), and a bottom tab bar
  (Home / Vibes / Squads) replaces the top nav's icon row.
- **`md` to `lg` (tablets)**: the left sidebar becomes a static column again; the right panel
  stays a drawer until `lg`.
- **`lg` and up (desktop)**: the original fixed 3-column layout.

The Vibes Feed player and transcript panel stack vertically below `lg` instead of sitting
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

- **Vibes Feed** clips are static seed data (`src/data/mockData.js`), not stored in the database.
  Reporting a clip as severe still writes a real `mod_log` entry, but the clip itself just
  disappears from your local session rather than being deleted from a real videos table.

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
    usersApi.js                  real profiles directory + mentor lookup
    messagesApi.js               DM thread fetch/send
    format.js                    timeAgo / timestamp formatting helpers
  hooks/useAuth.js             signup / login / logout against Supabase Auth + profiles table
  data/mockData.js             tier metadata, Vibes seed clips, report reasons
  components/
    AuthScreen.jsx              login / signup screen
    TopNav.jsx                   fixed top bar: logo, search, tabs, theme toggle, logout menu
    LeftSidebar.jsx              pinned nav + your real joined squads
    RightSidebar.jsx             real student profiles, system warnings, moderation log, DMs
    FeedView.jsx                 center feed workspace (Home / My Major / squad detail)
    SquadsView.jsx                squad list, join/leave/create, squad detail feed
    PostCard.jsx                  post card, composer, comments, likes, share-to-clipboard
    VibesView.jsx                 9:16 mock video player, transcript, Q&A, keyboard nav
    DMModal.jsx                   real-time direct message thread
    Shared.jsx                    Avatar, TierBadge, Toast, ReportMenu
```

## Deploying

Once this works locally, deploying to Vercel is the same as before — connect the repo, framework
preset **Vite**, build command `npm run build`, output directory `dist`. The one extra step: add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **Environment Variables** in the Vercel
project settings (Project → Settings → Environment Variables) before deploying, since those are
no longer optional now that the app depends on them.
