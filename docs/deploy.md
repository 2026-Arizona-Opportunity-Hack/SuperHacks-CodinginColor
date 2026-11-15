# Deploying (Vercel + Supabase, free tiers, ~10 minutes)

## 1. Database: Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier; region close to Arizona, e.g. *West US*).
2. **Connect** → **Transaction pooler** → copy the URI and put your database password in it:
   `postgresql://postgres.<ref>:<password>@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
3. That's it. The app creates its tables from `db/schema.sql` on first start (every statement is `IF NOT EXISTS`).

## 2. App: Vercel

```bash
npx vercel link                       # create/link a project
npx vercel env add DATABASE_URL production
npx vercel env add OPENAI_API_KEY production     # optional
npx vercel env add OPENAI_BASE_URL production    # optional, e.g. https://ai.ohack.dev/v1
npx vercel env add AI_MODEL production           # optional
npx vercel env add SOLANA_SECRET_KEY production  # optional
npx vercel env add SEED_DEMO_DATA production     # "false" for a real install, "true" for a demo
npx vercel env add SHOW_DEMO_ACCOUNTS production # "false" for a real install
npx vercel deploy --prod
```

Or import the GitHub repo in the Vercel dashboard and add the same variables under *Settings → Environment Variables*.

## 3. First admin (real install)

With `SEED_DEMO_DATA=false` the database starts empty. Create the first admin once:

1. Sign up at `/signup` as a teacher with CIC's email.
2. In Supabase → SQL editor: `UPDATE users SET role = 'admin', organization = 'Coding in Color' WHERE email = 'you@codingincolor.org';`
3. Sign out and in again. From then on, admins manage roles in **Admin → Staff & roles**.

The starter "Python Foundations" curriculum is only seeded with the demo data. For a clean install, either
keep `SEED_DEMO_DATA=true` once and delete the demo classes, or create modules in the editor.

## Costs

| Service | Free tier covers |
|---|---|
| Vercel Hobby | This app's traffic for several hundred students |
| Supabase Free | 500 MB database (years of progress data for CIC's size) |
| Pyodide CDN | Free (jsDelivr) |
| AI | Pay-per-use. Hints cost a fraction of a cent each; OpenAI and Microsoft offer nonprofit credits. Optional. |
| Solana | Devnet is free; mainnet anchoring costs ~$0.001 per certificate. Optional. |
