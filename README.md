# সংযোগ Shongjog — a multi-user link-in-bio platform

A Linktree-style web app: anyone can register, claim a username, add their
Facebook / Instagram / WhatsApp / Discord / X / LinkedIn / email + custom
links, and share one public page at `yoursite.com/username`.

Built with **Next.js 15 (App Router)** and **Supabase** (auth + Postgres + storage).

---

## Setup (about 15 minutes)

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and run it. This creates the `profiles` and `links`
   tables, security policies, the signup trigger, and an avatar bucket.
3. Recommended while developing: **Authentication → Providers → Email →
   turn OFF "Confirm email"** so you can test signup without a mail inbox.
   Turn it back on before going public.

### 2. Configure the app
```bash
cp .env.local.example .env.local
```
Fill in the two values from **Project Settings → API** in your Supabase
dashboard (Project URL and the `anon` public key).

### 3. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 — sign up, claim a username, add links, then
visit `http://localhost:3000/yourusername` in a private window to see the
public page exactly as a visitor would.

### 4. Deploy (free)
Push the repo to GitHub, import it on [vercel.com](https://vercel.com), and
add the same two environment variables in the Vercel project settings.
Done — every user's page is live at `your-app.vercel.app/username`.

---

## How it works

| Piece | Where | What it does |
|---|---|---|
| Signup / login | `app/login/page.tsx` | Email+password auth; username stored in user metadata |
| Auto profile creation | `supabase/schema.sql` trigger | Every new auth user gets a `profiles` row |
| Public page | `app/[username]/page.tsx` | Server component; fetches profile + links by username |
| Editor | `app/dashboard/page.tsx` | Add / delete / reorder links, edit name & bio |
| Security | Row Level Security policies | Anyone can *read* profiles/links; only owners can *write* |
| Session handling | `middleware.ts` | Refreshes auth cookies, guards `/dashboard` |

Social platforms (Facebook, Instagram, WhatsApp, Discord, X, LinkedIn, email)
render as an icon row under the name — just like Linktree — while "custom"
links render as full-width buttons.

## Ideas to extend it (rough difficulty)

- **Avatar upload** — the `avatars` storage bucket is already created; add a
  file input in the dashboard that uploads to `avatars/{userId}/...` and
  saves the public URL to `profiles.avatar_url`. (easy)
- **Click analytics** — add a `clicks` table, insert a row via a route
  handler that redirects (`/r/{linkId}`), chart counts in the dashboard. (medium)
- **Themes** — add a `theme` column to `profiles`, define a few CSS variable
  sets, let users pick. (easy)
- **Spotify/YouTube embeds** — detect those URLs and render an `<iframe>`
  embed card instead of a plain button. (medium)
- **Google/Facebook OAuth login** — enable providers in Supabase Auth,
  call `signInWithOAuth`. (easy)
- **Custom domain + username routes at the root** — already done: pages are
  at `/{username}`.

## Notes

- Username rules: 3–30 chars, lowercase letters, digits, underscore
  (enforced both in the form and by a database CHECK constraint).
- Reserved words: if you add more top-level routes later (e.g. `/about`),
  Next.js static routes take precedence over `[username]`, but you should
  also block those names at signup.
