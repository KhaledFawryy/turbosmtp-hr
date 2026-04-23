# ⚡ turboSMTP HR Portal
**Internal HR system for the First Line Support team**

Built with Next.js 14 · Supabase · Vercel

---

## What this does
- Each of the 9 support agents logs in with their own email + password
- **Agents** see their own leave balance, submit requests, view the calendar and schedule
- **Dina Ramadan (Lead/Admin)** sees everything, approves/rejects requests, manages schedule
- When a request is approved → Microsoft Teams webhook fires automatically
- Real-time updates — approve a request and everyone's screen updates instantly

---

## 🚀 Deploy in 4 steps

### Step 1 — Supabase setup (10 min)

1. Go to [supabase.com](https://supabase.com) → **New project** → name it `turbosmtp-hr`
2. Wait for it to provision (~2 min)
3. Go to **SQL Editor** → **New Query** → paste the contents of:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
   → click **Run**
4. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (**never expose this publicly**)

---

### Step 2 — Create the 9 agents (5 min)

Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`, then run:

```bash
npm install
node scripts/seed-users.js
```

This creates all 9 agents in Supabase Auth with:
- Their `@turbosmtp.com` emails
- Default password: `TurboHR@2025!`
- Dina Ramadan marked as admin

> **Important**: Ask everyone to change their password after first login via Supabase Auth or add a password-change page.

---

### Step 3 — Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # only for seed script, never in browser
TEAMS_WEBHOOK_URL=https://company.webhook.office.com/webhookb2/...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**How to get the Teams webhook URL:**
1. Open Microsoft Teams
2. Go to the channel you want alerts in (e.g. `#hr-support-alerts`)
3. Click `···` → **Connectors** → **Incoming Webhook** → **Configure**
4. Give it a name (`turboSMTP HR`) → copy the URL

---

### Step 4 — Deploy to Vercel (2 min)

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel

# Option B: GitHub (recommended for team)
# 1. Push this folder to a GitHub repo
# 2. Go to vercel.com → New Project → Import repo
# 3. Add all env vars in Vercel → Settings → Environment Variables
# 4. Deploy
```

Done. You get a live HTTPS URL like `https://turbosmtp-hr.vercel.app`.

---

## 🔑 Access credentials (after seeding)

| Name | Email | Default Password | Role |
|------|-------|-----------------|------|
| Abdullah El Quady | abdullah.elquady@turbosmtp.com | TurboHR@2025! | Agent |
| Merna Badr        | merna.badr@turbosmtp.com       | TurboHR@2025! | Agent |
| Mai Seif          | mai.seif@turbosmtp.com         | TurboHR@2025! | Agent |
| Noha Ibrahim      | noha.ibrahim@turbosmtp.com     | TurboHR@2025! | Agent |
| Fatma Samir       | fatma.samir@turbosmtp.com      | TurboHR@2025! | Agent |
| Kholoud Tarek     | kholoud.tarek@turbosmtp.com    | TurboHR@2025! | Agent |
| Amira Sadek       | amira.sadek@turbosmtp.com      | TurboHR@2025! | Agent |
| Dina Qoutb        | dina.qoutb@turbosmtp.com       | TurboHR@2025! | Agent |
| Nermine Hermel    | nermine.hermel@turbosmtp.com   | TurboHR@2025! | Agent |
| **Khaled Mohamed** | khaled.mohamed@turbosmtp.com  | TurboHR@2025! | **Admin** |
| **Ahmed Hussien**  | ahmed.hussien@turbosmtp.com   | TurboHR@2025! | **Admin** |

---

## 🗂 Project structure

```
turbosmtp-hr/
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Redirects to /dashboard
│   ├── globals.css
│   ├── login/
│   │   └── page.js            # Login page (public)
│   ├── dashboard/
│   │   ├── layout.js          # Auth guard
│   │   └── page.js            # Server component — fetches data
│   └── api/
│       ├── approve/route.js   # Approve/reject + Teams webhook
│       ├── notify/route.js    # Submit leave request
│       └── signout/route.js   # Sign out
├── components/
│   └── HRShell.js             # Full client-side HR dashboard
├── lib/
│   └── supabase/
│       ├── client.js          # Browser Supabase client
│       └── server.js          # Server Supabase client
├── middleware.js               # Session guard (redirects unauthenticated)
├── scripts/
│   └── seed-users.js          # Creates all 9 agents in Supabase
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # All tables, RLS, triggers
│       └── 002_seed.sql             # Optional manual seed notes
├── .env.local                 # Your secrets (never commit)
├── .env.example               # Template (safe to commit)
└── README.md
```

---

## 🔐 Security model

| Feature | How |
|---------|-----|
| Authentication | Supabase Auth (JWT, httpOnly cookies) |
| Session persistence | Middleware refreshes tokens on every request |
| Agent data isolation | Row Level Security — agents can only read/write their own rows |
| Admin operations | RLS policies check `is_admin = true` before allowing updates |
| Teams webhook secret | Stored server-side only in env var, never in browser bundle |
| Service role key | Only used in seed script, never shipped to client |

---

## 🔧 Customisation

**Add a new agent**: Run `node scripts/seed-users.js` again after adding them to the `AGENTS` array, or create manually in Supabase → Auth → Users.

**Change leave quotas**: Update the defaults in `001_initial_schema.sql` (columns `annual_total`, `sick_total`, `public_total`) or update individual rows in `leave_balances` table.

**Add password reset**: Supabase Auth supports magic links and password reset out of the box. Add a "Forgot password?" link on the login page that calls `supabase.auth.resetPasswordForEmail(email)`.

**Custom domain**: In Vercel → Settings → Domains → Add `hr.turbosmtp.com` (or whatever you own). Update `NEXT_PUBLIC_APP_URL` env var.

---

## 💰 Cost

| Service | Free tier | Paid starts at |
|---------|-----------|---------------|
| Supabase | 500MB DB, 50k MAU | $25/month |
| Vercel | Unlimited hobby projects | $20/month (team features) |
| Teams webhooks | Free | Free |

For a 9-person team, **this runs completely free forever**.
