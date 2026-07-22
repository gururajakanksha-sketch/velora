# Mission Velora — Product Requirements Document (MVP)

## Vision
Mission Velora is an **AI Life Architecture Platform** for teenagers and young adults (14–19). It doesn't tell users who to become — it continuously widens their awareness, helps them discover opportunities they'd never find on their own (hidden careers, hidden university courses, scholarships, MUNs, countries), and turns curiosity into concrete daily action. Every recommendation answers: *why does this fit me · how do I start today · what's the next milestone · where can I learn more*.

## Design language
Grid-paper cream base (`#FBF6E0`) with warm scrapbook accents (yellow paper, pink grid, blue/pink stars & ribbons) and a navy ink family lifted straight from the Mission Velora logo mascot. Mixed fun-serif + sans typography. No AI-slop purple/blue gradients. No emojis (Ionicons only). See `/app/design_guidelines.json` and `/app/frontend/src/theme.ts`.

## MVP scope (shipped this iteration)
1. **Splash + rotating quote** — 2.6s opener with grid paper, brand mark, mascot stickers, tap-to-continue.
2. **Auth** — Emergent-managed Google OAuth (mobile via `expo-web-browser` + `expo-secure-store`, web via redirect). Backend exchange at `/api/auth/session` (session_id → 7-day token in Mongo TTL index).
3. **Onboarding (Future Architect)** — 3 activities in a single flow:
   - **Dream Résumé** — pick from 30 seed achievements + add custom ones
   - **Dream Life Builder** — chip clouds across cities, environments, work style, movement, pace, impact, industries
   - **Future Board** — Pinterest-style pin board: paste a Pinterest image URL **or** pick from our 36-image curated library
4. **AI Future Blueprint** — Gemini 3.1 Pro (via `emergentintegrations`) analyses selected tags + prompts and returns a JSON blueprint (themes, one-liner, career seeds, hidden interdisciplinary paths, recommended IDs across scholarships/universities/hidden courses/countries/MUNs, and 3 side quests). Deterministic fallback if the AI fails so the app never dead-ends.
5. **Mission Control** — Dashboard with greeting, Blueprint summary, career seeds, hidden paths, side quests (one-tap "Add to Planner"), Today teaser, and the **"Fresh from the world"** horizontal news feed (new careers, career news, industry facts — 18 curated cards).
6. **Explore** — Categories: Scholarships (15), Universities (10), Hidden Courses (12), MUNs (10), Countries (10). Search + tag filter.
7. **Detail screen** — Single dynamic route `/detail/[kind]/[id]` with save-to-Collections + **Add-to-Planner** (auto-generates the right task titles per kind: "Apply", "Research", "Register", etc.).
8. **Mission Planner** — CRUD tasks & AI-generated Side Quests; status toggle; XP shown.
9. **Daily Discovery** — Deterministic-by-day rotating picks (hidden course, scholarship, university, country, MUN + a challenge).
10. **Profile** — Name/email, blueprint themes, saved collections, XP, sign-out.

## Backend (FastAPI + Motor + emergentintegrations)
All routes under `/api`. Auth-gated endpoints require `Authorization: Bearer <session_token>`.

- `GET  /api/` health
- `GET  /api/quotes` — 12 inspiring quotes
- `GET  /api/onboarding/library` — 30 achievements + 37 life prompts + 36 board images
- `GET  /api/news[?kind=]` — new careers, news, facts (18 items)
- `GET  /api/explore?kind=...&q=&tag=`
- `GET  /api/explore/{kind}/{id}`
- `POST /api/auth/session` (accepts `session_id` **or** `session_token`)
- `GET  /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/onboarding/complete` → AI Blueprint (Gemini `gemini-3.1-pro-preview`, fallback safe)
- `GET  /api/blueprint`
- `GET/POST/PATCH/DELETE /api/planner[/{id}]`
- `GET/POST/DELETE /api/collections[/{id}]`
- `GET  /api/discover/today`

MongoDB indexes: `users.email`, `users.user_id`, `user_sessions.session_token`, `user_sessions.expires_at` (TTL).

## Test results
32/32 backend tests passing (see `/app/test_reports/iteration_1.json`). Gemini AI path verified live. Frontend splash & auth screens screenshot-verified. Google OAuth cannot be automated headlessly — needs a real Google account for the full E2E on device / browser preview.

## Not in MVP (deferred, schemas ready)
Journey timeline, Impact Portfolio, Skill Trees, XP achievement gallery, Digital Ed / Online Safety Hub, Universal Search, offline caching, dark mode toggle, notifications, drag-to-reorder Mission Control cards.

## Business enhancement
Every card in the app (career seed, hidden path, scholarship, university, MUN, country, side quest) has a **one-tap "Add to Planner"**. This is the growth loop — the Planner becomes the personal launchpad users return to daily, and every returned session generates fresh Blueprint signals for the next AI pass. The "Fresh from the world" horizontal news strip on Mission Control adds a habitual "why-open-the-app-today" trigger without notifications.
