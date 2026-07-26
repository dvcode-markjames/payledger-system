# PayLedger

A mobile-friendly ledger for a GCash / Maya agent shop: track daily cash in / cash
out, auto-calculate commissions, edit float balances, and keep a searchable,
exportable transaction history. Built with Next.js, Supabase, and deployed on
Vercel.

## Features

- **Dashboard** — today's GCash and Maya cash in / cash out totals and commission,
  styled as a receipt stub. Automatically resets at midnight **Asia/Manila**
  (computed from timestamps, so no data is ever deleted).
- **Log** — add a transaction for either platform. Balance is editable at any
  time. Commission is calculated live as you type, using your own settings
  (nothing is hard-coded).
- **Settings** — edit GCash and Maya-to-Maya commission brackets, Maya's fixed
  per-transaction fee, and your own added commission for Load / Bank Transfer.
- **History** — search, filter by platform/type/date, export to Excel (.xlsx),
  or print.
- Protected by a login screen (Supabase Auth) since this handles real money data.
- Responsive: works as a bottom-nav mobile app or a side-rail desktop app.

## Commission logic

GCash cash in/out and Maya-to-Maya cash in/out use **tiered, block-based**
commission, matching the brackets you set in Settings (default: ₱1–100 = ₱5,
₱101–500 = ₱10, ₱501–1000 = ₱15).

For amounts over the top bracket, the amount is split into full "blocks" (the
top bracket's max, e.g. 1000) plus a remainder, and each part is charged
separately:

- ₱1230 cash in → one block of ₱1000 (₱15) + remainder ₱230 (₱10) = **₱25**
- ₱1125 cash out → one block of ₱1000 (₱15) + remainder ₱125 (₱10) = **₱25**,
  customer receives ₱1125 − ₱25 = **₱1100**

Maya Load and Bank Transfer use **Maya's own fixed fee** (default ₱10) plus
**your own added commission**, both editable in Settings.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the
   `balances`, `app_settings`, and `transactions` tables with sensible
   defaults and row-level security.
3. Go to **Authentication → Users → Add user** and create a login (email +
   password) for yourself. This is the account you'll use to sign in to the
   app — there's no public sign-up form by design.
4. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 2. Run locally

```bash
npm install
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

Visit `http://localhost:3000` and sign in with the user you created in Supabase.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 4. Deploy on Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add the two environment variables from `.env.local` in the Vercel project
   settings (**Settings → Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Vercel will build and give you a live URL — open it on your phone
   and add it to your home screen for an app-like feel.

## Project structure

```
app/
  page.tsx           Dashboard
  log/page.tsx        Add transaction
  history/page.tsx     Search / filter / export / print
  settings/page.tsx    Commission tiers & fees
  login/page.tsx       Sign in
lib/
  commission.ts        Tiered commission math
  manilaDate.ts        Asia/Manila day-boundary helpers
  settings.ts          Read/write app_settings
  supabase/            Browser + server Supabase clients
supabase/schema.sql     Database schema, defaults, RLS policies
```

## Notes

- Balances update on every transaction: Cash In **subtracts** from the platform
  balance (we send GCash/Maya to the customer), Cash Out / Load / Bank Transfer
  **add** to it (we receive GCash/Maya from the customer) — matching
  how the balance is tracked day to day. You can also edit a balance directly
  at any time from the Log page.
- All commission brackets and fees are stored in the database (`app_settings`
  table), not hard-coded, so you can change them any time from Settings.
