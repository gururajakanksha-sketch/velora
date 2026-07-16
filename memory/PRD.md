# Mission Velora — PRD (v0.2 rebuild)

## Product
**Mission Velora** is an **AI Life Architecture Platform for teenagers (14–19)** — not a career portal, not a productivity tool. It helps young people transform uncertainty into curiosity and curiosity into measurable action.

## MVP Scope (this build)

### Splash → Auth → Onboarding → Main App
1. **Splash quote** (auto-timeout 2.4s) — rotating non-cliché motivational quote on grid-paper background.
2. **Auth** — Emergent-managed Google Sign-In (real OAuth, secure token in `expo-secure-store`).
3. **Future Architect Onboarding** — three interactive activities in one step-based flow:
   - **Dream Résumé:** pick from 30 curated achievements + add any custom ones.
   - **Dream Life Builder:** pick life prompts across 7 groups (cities, environments, work style, travel, balance, impact focus, industries).
   - **Future Board (Pinterest-style):** tap tiles from a curated 36-image library **and/or** paste Pinterest/any image URL — both flows supported per user request.
4. **AI Future Blueprint** — Gemini 3.1 Pro (via Emergent LLM key). Produces a compact JSON blueprint: `one_line_summary`, `themes`, `career_seeds`, `hidden_paths`, recommended IDs across all Explore categories, and 3 seeded Side Quests. Falls back to a deterministic tag-based blueprint if AI fails.

### Main app (bottom tabs, 5)
- **Mission Control (`/(main)`):** blueprint hero card, career seeds, hidden paths, seeded side quests (one-tap add to planner), today teaser.
- **Explore (`/(main)/explore`):** searchable + chip-filtered catalog across Scholarships (15), Universities (10), Hidden Courses (12), MUNs (10), Countries (10). Curated seed data.
- **Planner (`/(main)/planner`):** manual tasks + AI-generated side quests, XP badge, complete/uncomplete/delete.
- **Today (`/(main)/discover`):** daily discovery — user-and-date-deterministic pick of quote, hidden course, scholarship spotlight, university spotlight, country to watch, MUN pick, and a daily challenge with "Add to Planner".
- **Me (`/(main)/profile`):** avatar, level (1 + xp/100), XP earned, saves count, blueprint themes recap, saved collections list, sign out.

### Detail route (`/detail/[kind]/[id]`)
Generic template for any explore item: hero title, meta pills, summary, hidden-program callout, tags, an auto-generated **suggested plan** (per-kind template), sticky **Add to Mission Planner** CTA (creates linked tasks with milestones), and a save bookmark toggle.

## Design
Brand-locked from the logo: **navy `#1E3A8A` on cream grid-paper `#FBF6E0`**, with pink grid lines, yellow paper accents, playful scrapbook tape/star/dot stickers and a mixed serif+italic+sans font stack. `GridPaper` background component. No purple/violet, no emoji icons — Ionicons only. All screens grid-paper themed with rotated scrapbook cards. See `/app/frontend/src/theme.ts`.

## Backend (FastAPI + Mongo + emergentintegrations)
- `GET  /api/quotes` — public quotes for splash.
- `GET  /api/onboarding/library` — public library (achievements, life prompts, board images).
- `POST /api/auth/session` — exchange Emergent session_id → server-issued session_token.
- `GET  /api/auth/me` — current user (Bearer).
- `POST /api/auth/logout` — clear session.
- `POST /api/onboarding/complete` — persists selections + generates blueprint via Gemini.
- `GET  /api/blueprint` — get current blueprint.
- `GET  /api/explore?kind=...&q=&tag=` / `GET /api/explore/{kind}/{id}` — catalog.
- `GET/POST/PATCH/DELETE /api/planner[/id]` — tasks & side quests.
- `GET/POST /api/collections`, `DELETE /api/collections/{save_id}` — saves.
- `GET  /api/discover/today` — deterministic-by-day discovery bundle.

## Deferred (Phase 2, schemas designed but disabled)
Journey (visual timeline), Impact Portfolio, Skill Trees, Digital Ed Hub, notifications, mentors, parent/teacher dashboards.

## Business enhancement
Every recommendation → one-tap "Add to Mission Planner" that generates a **milestone chain of tasks with XP**. This converts vague inspiration into completed applications & measurable engagement — the closest thing to a conversion funnel a teen product can honestly have.
