# Engage — MVP

**Two Perspectives. One Resolution.**

A web app where two people independently submit their perspectives on a shared topic, and AI synthesizes an impartial analysis with recommendations.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Framer Motion
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL + Realtime)
- **AI**: Anthropic Claude Sonnet
- **Hosting**: Vercel

## Quick Start (< 15 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** → name it `engage` → choose a region close to you → create
3. Wait for the project to finish setting up (~1 minute)

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase/migration.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run** — you should see "Success" for each statement

### 3. Get Your Supabase Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these three values:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" — click "Reveal")

### 4. Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account if needed, add billing
3. Go to **API Keys** → create a new key
4. Copy the key (starts with `sk-ant-`)

### 5. Deploy to Vercel

#### Option A: One-click deploy (easiest)

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

4. Click **Deploy** — done!

#### Option B: Local development first

```bash
# Clone and install
git clone <your-repo-url>
cd engage-mvp
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run locally
npm run dev
# Open http://localhost:3000
```

### 6. Enable Supabase Realtime

This should already work from the migration, but verify:

1. In Supabase dashboard → **Database** → **Replication**
2. Ensure `sessions` and `analyses` tables are listed under the `supabase_realtime` publication
3. If not, run in SQL editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
```

## How It Works

### User Flow

1. **Creator** visits the app → enters their name and topic → gets a unique session URL
2. **Creator** shares the URL with their partner (via native share sheet, copy/paste, text, etc.)
3. **Partner** opens the link → sees the topic and who invited them → enters their name → writes their perspective
4. **Creator** also writes their perspective on the same session
5. Neither person can see the other's input (privacy is enforced server-side)
6. When both inputs are locked in → AI analysis triggers automatically
7. Both people see the same analysis with animated reveal:
   - **Headline**: One-sentence summary
   - **Common Ground**: What they actually agree on
   - **Where You Diverge**: Real vs. perceived disagreements
   - **Recommendation**: AI-suggested path forward
   - **Reasoning**: How it arrived at the recommendation
   - **The Tradeoff**: What each person would compromise on

### Technical Architecture

```
[Creator] → Home Page → Create Session (API) → Session Page (input + share)
                                                        ↕ (polling + realtime)
[Partner] → Shared URL → Session Page (invite → input)
                                     ↕
                              Both locked in?
                                     ↓ yes
                           AI Analysis (Claude Sonnet)
                                     ↓
                            Results saved to DB
                                     ↓
                         Both see animated reveal
```

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/sessions` | POST | Create new session |
| `/api/sessions/[slug]` | GET | Get session data + inputs + analysis |
| `/api/sessions/[slug]/input` | POST | Submit perspective |
| `/api/sessions/[slug]/analyze` | POST | Trigger AI analysis |

### Database Schema

- **sessions**: id, slug, topic, creator_name, partner_name, status, timestamps
- **inputs**: id, session_id, role (creator/partner), content, timestamps
- **analyses**: id, session_id, content (JSON), raw_text, timestamps

## Costs

| Service | Free Tier | Estimated MVP Cost |
|---|---|---|
| Vercel | Hobby plan (free) | $0/mo |
| Supabase | Free tier (500MB, 50K rows) | $0/mo |
| Anthropic | Pay-per-use | ~$0.08/session (Sonnet) |

At 100 sessions/month during beta: **~$8/month total**.

## MVP Session Types

Currently only **Decide** sessions are implemented (as specified in Phase 0). The AI prompt is optimized for joint decision-making scenarios.

Future session types (Resolve, Plan, Debate) use the same infrastructure with different AI prompts and output structures.

## Customization

### Changing the AI model

Edit `src/lib/ai.ts` — change the `model` parameter in the Anthropic API call.

### Modifying the analysis output

Edit the `DECIDE_SYSTEM_PROMPT` in `src/lib/ai.ts`. The JSON output structure is defined there.

### Adjusting the reveal animation

Edit the timing in `src/app/session/[slug]/page.tsx` — look for the `useEffect` with `revealStage` timers.

## What's Next (Phase 1)

- [ ] User accounts (Supabase Auth)
- [ ] Resolve and Plan session types
- [ ] Hot Takes (rapid-fire mini-sessions)
- [ ] Push notifications
- [ ] React Native mobile app
- [ ] Results sharing cards

---

Built with 💜 for [Engage](https://engage.app)
