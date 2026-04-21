# LinkedIn Post Creator — AI & Web3

A small, fully automated pipeline that publishes two LinkedIn-ready posts every Wednesday at 9:00 AM IST: one on Artificial Intelligence and one on Web3.

- A **GitHub Actions cron** fetches a curated set of RSS feeds, picks the most recent 72 hours of articles, asks OpenAI `gpt-4o-mini` to draft two posts that follow strict formatting rules, and writes the result into Supabase.
- A **Vite + React static site** (deployed to GitHub Pages) reads from Supabase using a public anon key and displays the latest posts, plus an archive of past weeks.

```
LinkedinPostCreator/
├─ .github/workflows/
│  ├─ generate-posts.yml   # weekly cron + manual trigger
│  └─ deploy-web.yml       # builds & publishes the web app to GitHub Pages
├─ scripts/                # Node 20, ESM generator
│  ├─ generate.mjs
│  ├─ feeds.json           # exact RSS allowlist
│  └─ lib/{feeds,prompt,openai,supabase}.mjs
├─ supabase/schema.sql     # one-time table + RLS setup
└─ web/                    # Vite + React + TypeScript app
```

## How it works

```
GitHub Actions (cron: Wed 03:30 UTC = 09:00 IST)
        │
        ▼
scripts/generate.mjs
  ├─ collectArticles()   ← rss-parser, 72h window, 7d fallback
  ├─ generatePosts()     ← OpenAI JSON mode, sanitize, validate, retry x2
  └─ upsertPosts()       ← Supabase service role
                                │
                                ▼
                         Supabase `posts` table
                                │
                                ▼
                  Vite/React app (GitHub Pages)
```

## One-time setup

### 1. Supabase

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. From **Project settings → API**, copy:
   - `Project URL` → use as `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon public` key → use as `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (keep secret) → use as `SUPABASE_SERVICE_ROLE_KEY`

### 2. OpenAI

Create an API key at [platform.openai.com](https://platform.openai.com). The default model is `gpt-4o-mini`; override with the `OPENAI_MODEL` env var if desired.

### 3. GitHub repository configuration

In **Settings → Secrets and variables → Actions**, add:

| Type     | Name                          | Used by                |
| -------- | ----------------------------- | ---------------------- |
| Secret   | `OPENAI_API_KEY`              | generator              |
| Secret   | `SUPABASE_URL`                | generator              |
| Secret   | `SUPABASE_SERVICE_ROLE_KEY`   | generator              |
| Secret   | `VITE_SUPABASE_ANON_KEY`      | web build              |
| Variable | `VITE_SUPABASE_URL`           | web build (non-secret) |

The anon key is safe to ship to the browser — RLS only allows `select` on the `posts` table. The service-role key must stay in Actions secrets.

### 4. Enable GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

If your repo is named something other than `LinkedinPostCreator`, update `base` in [`web/vite.config.ts`](web/vite.config.ts) accordingly.

### 5. First run

Trigger the generator manually once to seed the database:

**Actions → Generate weekly LinkedIn posts → Run workflow.**

Then push to `main` (or trigger `Deploy web app to GitHub Pages` manually) to publish the site at `https://<user>.github.io/LinkedinPostCreator/`.

## Local development

### Generator

```bash
cd scripts
npm install
export OPENAI_API_KEY=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
node generate.mjs
```

### Web app

```bash
cd web
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

## Content rules enforced by the generator

The system prompt and a post-processing sanitizer together enforce:

- Plain text only — no markdown markers (`*_#>` / backticks / link syntax) and no emoji.
- Roughly 80–150 words per post (validated; up to 2 regeneration retries on failure).
- Short paragraphs, max 5 lines each.
- Structure: hook → insight → why it matters → optional close.
- Casual, insightful, slightly opinionated tone.
- Distinct angle / opener / closing question across the AI and Web3 posts.
- No invented facts beyond what appears in the supplied article snippets.

## Allowed RSS sources

Defined in [`scripts/feeds.json`](scripts/feeds.json). The generator never reads from anything outside this list.

**AI:** MIT Technology Review, VentureBeat, Wired, TLDR AI, The Rundown AI, OpenAI Blog.
**Web3:** CoinDesk, Cointelegraph, The Block, Decrypt, The Defiant, Blockworks.

## Cron schedule

`.github/workflows/generate-posts.yml` uses `cron: "30 3 * * 3"`. GitHub Actions cron is always UTC, and `03:30 UTC` on Wednesday is `09:00 IST` on Wednesday (UTC+5:30). The job also exports `TZ=Asia/Kolkata` so the `post_date` column matches IST.

## Idempotency

`posts.post_date` is `unique`. The generator does an `upsert` on it, so re-running the workflow on the same day overwrites cleanly rather than creating duplicates.
