# SystemForge

## Overview
SystemForge is a React + Firebase web application that helps users turn goals into daily systems they can follow. It allows users to create goals, break them into repeatable daily actions, track progress, and stay consistent.

## Deployment Status
- **Deployment target**: Static site (`npm run build` → `dist/`)
- **Production build**: Verified working (3062 modules, ~558KB gzip)
- **Market-ready fixes applied**:
  - Terms & Privacy agreement checkbox added to signup form
  - Stripe payment integration added to pricing page (redirectToCheckout)
  - `robots.txt` and `sitemap.xml` added to `client/public/`
  - OG image, og:url, twitter:image, twitter:site, and canonical URL meta tags added to `index.html`

## Stripe Integration
- **Approach**: Client-side only using **Stripe Payment Links** (no backend required, replaces deprecated `redirectToCheckout`)
- **Plans**: Free ($0), Starter ($9/mo), Pro ($19/mo), Elite ($49/mo) — all with monthly + yearly pricing
- **Publishable key**: `VITE_STRIPE_PUBLISHABLE_KEY` (shared env var)
- **Payment Links** — create these in Stripe dashboard (Products → Payment Links) and set as env vars:
  - `VITE_STRIPE_STARTER_MONTHLY_LINK` — Payment Link URL for Starter monthly
  - `VITE_STRIPE_STARTER_YEARLY_LINK` — Payment Link URL for Starter yearly
  - `VITE_STRIPE_PRO_MONTHLY_LINK` — Payment Link URL for Pro monthly
  - `VITE_STRIPE_PRO_YEARLY_LINK` — Payment Link URL for Pro yearly
  - `VITE_STRIPE_ELITE_MONTHLY_LINK` — Payment Link URL for Elite monthly
  - `VITE_STRIPE_ELITE_YEARLY_LINK` — Payment Link URL for Elite yearly
  - `VITE_STRIPE_CUSTOMER_PORTAL_URL` — Stripe Customer Portal URL (Billing → Customer Portal)
- **Success page**: `/checkout/success?plan=starter|pro|elite` — saves plan to Firestore `users/{uid}.plan`
- **Plan stored on**: `User.plan` field (PlanTier: "free" | "starter" | "pro" | "elite")
- **Settings page**: Shows real plan from Firestore + "Manage billing" link to Stripe Customer Portal
- **Stripe lib**: `client/src/lib/stripe.ts`

## Architecture
- **Frontend**: React 18 with TypeScript, Vite as the build tool
- **Routing**: Wouter (client-side routing)
- **State Management**: Zustand + TanStack React Query
- **UI**: shadcn/ui components with Radix UI primitives, Tailwind CSS v3
- **Auth & Backend**: Firebase (Authentication + Firestore)
- **Animations**: Framer Motion

## Project Structure
```
client/
  src/
    pages/         # All route pages (landing, dashboard, goals, systems, etc.)
    components/    # Reusable UI components (auth, app, ui)
    hooks/         # Custom React hooks (use-auth, etc.)
    lib/           # Utilities (firebase, queryClient, cloudinary, utils)
    store/         # Zustand stores
    types/         # TypeScript type definitions
    services/      # Firebase service layer
    constants/     # App constants
vite.config.ts     # Vite configuration (root: client/, serves on port 5000)
package.json       # Dependencies and scripts
```

## Key Configuration
- Vite dev server runs on port 5000, host 0.0.0.0
- Firebase config is stored as `VITE_FIREBASE_*` env vars (see `.replit` userenv section)
- No backend server — all data via Firebase (Firestore + Auth)
- `npm run dev` uses `npx vite` to ensure local node_modules bin is found

## Running the App
- **Dev**: `npm run dev` (starts Vite on port 5000)
- **Build**: `npm run build`
- **Production**: `npm run start`

## Firebase Configuration
Firebase credentials are stored in the `.replit` userenv section and are prefixed with `VITE_FIREBASE_`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## AI Integration (Groq)

AI features use the **Groq API** (`llama-3.3-70b-versatile`) called directly from the client via `fetch` — no backend server.

### Environment variable
- `VITE_GROQ_API_KEY` — Groq API key (stored in `.replit` userenv)

### Files
- `client/src/services/ai.service.ts` — Core service: `callGroq`, `suggestSystemField`, `generateFullSystem`, `chatWithCoach`, `generateJournalPrompt`, `generateAnalyticsInsights`
- `client/src/hooks/use-ai.ts` — `useAi<T>(fn)` hook that wraps any AI call with `loading`/`error` state
- `client/src/components/ai/ai-system-generator.tsx` — Modal dialog: describe a goal → AI fills all system builder fields
- `client/src/components/ai/ai-chat.tsx` — `<AiChatWidget />` floating bottom-right chat bubble (mounted in `AppLayout`)

### Integration points
- **System Builder** — "Generate System with AI" banner on step 1 opens `AiSystemGenerator`; per-field "AI Suggest" buttons on trigger/action/fallback steps
- **Analytics** — "AI Insights" section (TanStack Query cached 30min) with 3 personalized habit insights
- **AI Coach page** (`/ai-coach`) — Full-page chat with user's system context; accessible via sidebar nav
- **Floating chat widget** — Available on every authenticated page (bottom-right corner)
- **Journal** — `generateJournalPrompt` is called when user requests an AI-generated prompt

### Error handling
All AI calls throw with message `"AI assistant is temporarily unavailable."` on any API failure. Components show toast or inline error — never crash silently.

## Routes
- `/` — Landing page (public)
- `/pricing` — Pricing page (public)
- `/login`, `/signup`, `/forgot-password` — Auth pages (public only)
- `/onboarding` — Onboarding flow
- `/dashboard`, `/goals`, `/systems`, `/templates`, `/checkins`, `/analytics`, `/journal`, `/settings`, `/ai-coach` — Protected app routes

## Phase 4 — Visual Design System (implemented)
All design tokens are defined in `client/src/index.css` and exposed to Tailwind via `tailwind.config.ts`.

### Color Tokens
- **Primary**: `hsl(258, 84%, 62%)` / dark `hsl(258, 84%, 68%)`
- **Success**: `hsl(142, 72%, 40%)` / dark `hsl(142, 72%, 50%)` — done/correct states
- **Warning**: `hsl(38, 92%, 50%)` / dark `hsl(38, 92%, 60%)` — partial/caution states
- **Destructive**: `hsl(0, 84%, 60%)` / dark `hsl(0, 70%, 55%)` — errors/missed
- **Named chart colors**: `chart-cyan`, `chart-green`, `chart-orange`, `chart-pink`, `chart-purple`
- Use `bg-success`, `text-success`, `bg-warning`, `text-warning` etc. via Tailwind

### Typography Scale (Tailwind classes)
- `text-hero` — 56px / 700 / lh 1.1 — Hero H1
- `text-section` — 36px / 600 / lh 1.2 — Section H2
- `text-card-title` — 24px / 600 / lh 1.3 — Card H3
- `text-body-lg` — 18px / 400 / lh 1.6 — Large body
- `text-body` — 16px / 400 / lh 1.6 — Default body
- `text-label` — 14px / 500 / lh 1.4 — Labels
- `text-caption` — 12px / 400 / lh 1.4 — Captions

### Animation System
Key animation classes: `animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-scale-in`, `animate-toast-in`, `animate-pulse-success`, `animate-glow-pulse`, `animate-bar-grow`, `animate-skeleton`, `animate-confetti-fall`.
Timing: `cubic-bezier(0.22, 1, 0.36, 1)` for entrances; `ease-out` for hover; `ease-in` for exits.

### Interactive Utilities
- `.card-interactive` — hover lift (-2px) + shadow increase
- `.btn-scale` — hover scale(1.02) + active scale(0.98)
- `.progress-animated` — smooth width fill transition
- `.touch-target` — 44x44px minimum tap area for non-button elements

### Border Radius
`rounded-xl` = 12px, `rounded-2xl` = 16px, `rounded-3xl` = 24px

## Phase 8 — Future Self Audio (implemented)

A personal audio feature that lets users record or upload a message from their future self, played back as a motivational reminder.

### Feature components
- `client/src/components/future-self-audio.tsx` — all audio components in one file:
  - `FutureSelfAudioSetup` — record/upload UI (used in onboarding + settings)
  - `FutureSelfAudioPlayer` — playback widget with autoplay logic (used in dashboard + recovery)
  - `FutureSelfAudioSettings` — playback preference toggles (used in settings)

### Storage
- Audio data: `localStorage` key `sf_future_self_audio` (base64 data-URL, max ~10MB)
- Audio MIME type: `localStorage` key `sf_future_self_audio_type`
- Last played date: `localStorage` key `sf_future_self_last_played`
- User preferences on Firestore `User` doc: `futureAudioPlayOnFirstVisit`, `futureAudioPlayAfterMissed`, `futureAudioAutoplay`, `futureAudioMuted`, `futureAudioLabel`

### User type additions (schema.ts)
`futureAudioPlayOnFirstVisit`, `futureAudioPlayAfterMissed`, `futureAudioAutoplay`, `futureAudioMuted`, `futureAudioLabel`

### Integration points
- **Onboarding**: New step 4 of 5 "Leave a message for your future self" — optional/skippable
- **Settings**: New "Future Self Audio" section (after Daily Reminder) — manage recording + playback prefs
- **Dashboard**: Player surfaces after RecoveryBanner — "missedDay" context if missed yesterday, "firstVisit" context otherwise
- **Recovery flow (checkins.tsx)**: Player shown at top of RecoveryFlowModal when checkinStatus is "skipped"

### Autoplay behavior
- Attempts `HTMLAudioElement.play()` — if blocked by browser, shows a prominent play button
- Shows once per day via `sf_future_self_last_played` localStorage key
- "Skip for today" records today's date to suppress further auto-show that day

## Phase 7 — Product Improvement Pass (implemented)

### Priority 1: Quick Start onboarding (already implemented)
- System builder defaults to 3-step Quick Mode (Identity → Trigger → Action)
- Full 7-step mode available via toggle for advanced users

### Priority 2: Retention Engine
- `User` type now includes `reminderEnabled` and `reminderTime` fields
- Settings page: functional browser Notification API integration replacing the "Coming soon" placeholder
- Requests permission, toggles reminder on/off, sets time — saves to Firestore and localStorage
- `ReminderChecker` component in App.tsx fires browser notifications once per day at the configured time
- Missed-day comeback message shown in notification if `sf_missed_yesterday` localStorage flag is set

### Priority 3: Trigger validation (already implemented)
- `TriggerWarning` component in system builder validates for vague triggers
- Checks: "morning" (bare), "whenever", "when I feel motivated", "someday", "daily" alone, etc.

### Priority 4: Identity reinforcement in daily loop
- `CelebrationRitualModal` now uses a pool of 6 varied identity messages instead of a single static one
- Messages rotate based on streak day: "You showed up as...", "This is a vote for...", "You kept the system alive for X days...", etc.
- Check-in cards now also track missed days via localStorage (`sf_missed_yesterday`) for the retention engine

### Priority 5: Redesigned streak logic
- `AnalyticsData` now includes: `consistencyScores`, `weeklyVotes`, `comebackStreaks`, `resilienceScores`
- `consistencyScore` per system: % of last 30 days completed (0-100)
- `weeklyVotes` per system: count of "done" days in last 7 days (shown as X/7)
- `comebackStreak` per system: consecutive done days since last gap (rewards returning after miss)
- `resilienceScore`: weighted formula (consistency 60% + comeback normalized 40%) — rewards showing up over time, not just unbroken runs
- New "Consistency Metrics" section in Analytics page with progress bars, resilience scores, and explanation
- Check-in cards now show "X/7 this week" and "X% consistent" inline badges per system

### Priority 6: Templates by default
- Systems page empty state now shows a 6-template gallery with category icons and one-click "Use this template" links
- Gallery shows the exact 6 templates named in the spec by ID: t1 (Beginner Workout), t2 (Daily Reader), t3 (Deep Work Starter), t10 (Calm Evening Reset), t11 (Job Search System), t12 (Study Sprint System)
- Separator divides the template gallery from the "build from scratch" option
- Templates link directly to `/systems/new?template=ID` pre-filling the builder
- 3 new templates added to STATIC_TEMPLATES: Calm Evening Reset (t10), Job Search System (t11), Study Sprint System (t12)
- All 3 new categories (`evening-reset`, `job-search`, `study-sprint`) registered in templates.tsx: colors, labels, and beginner flags

### Priority 7: Remove fake proof
- Removed the `testimonials` array (fake user quotes) from landing.tsx — it was dead code but is now fully cleaned up
- The existing "Built honestly, from scratch" section with "No fake social proof" card remains

## Phase 6 — Behavioral Prompts & Engagement (implemented)
All 7 behavioral prompt features are fully implemented across the app.

### Identity Affirmation (Prompt 1)
- Shown in Dashboard and Check-in Today tab after the user's identity statement is set
- Also appears inside the Celebration Ritual modal and SystemCheckinCard after marking done

### Goal Wizard — Structure Preview (Prompt 2)
- 5-step Goal Wizard (goal → trigger → minimum action → backup plan → **preview**)
- Step 5 renders a read-only "Structure Preview" card showing all fields before saving
- `ExampleHint` component on steps 1–3 shows `CATEGORY_EXAMPLES` suggestions per category

### Hype Drop Warning (Prompt 3)
- **Dashboard**: `HypeDropWarning` component shows contextual consistency alerts (days 1–7, days 8–21 "Hype Drop Zone", days 22–65, streak break) with fallbackPlan / minimumAction from the top system. Dismissible per-stage via localStorage.
- **Check-in page (Today tab)**: `CheckinConsistencyBanner` component renders the same stage-aware messages after the identity banner. Computed from `analytics.streaks` + yesterday's checkins.

### Chain Calendar (Prompt 4)
- **System Detail page**: `ChainCalendar` shows "🔗 Your chain: X days. Don't break it!" when active; "⛓️ Chain broken at X days" when broken. Uses `lastStreak` computation.
- **Check-in Calendar tab**: Global chain computed from all checkins across all systems. Shows active/broken banner at top. Calendar cells in the current unbroken chain highlighted with `ring-1 ring-primary/60`.

### Celebration Ritual (Prompt 5)
- `CelebrationRitualModal` with confetti overlay triggered on perfect-day completion
- Includes streak display, identity affirmation replay, mood emoji picker, and gratitude note

### Recovery Flow (Prompt 6)
- Triggered when a missed day is detected on next sign-in
- Guides user through: what happened → what helped → minimum action for tomorrow
- Stores `tomorrowIntention` in the checkin Firestore document

### Goal Health Check (Prompt 7)
- `TomorrowIntentionCard` on Dashboard surfaces yesterday's stored `tomorrowIntention` from the recovery flow, reminding users of their pre-committed next action

## Phase 5 — Accessibility & Usability (implemented)
All changes follow WCAG 2.1 AA guidelines.

### Skip Navigation
- Skip-to-content link on both `AppLayout` (app) and landing page
- Targets `id="main-content"` on `<main>` (app) and `<section>` (landing)

### Landmark Regions
- `<header aria-label="Application header">` — app shell header
- `<Sidebar role="navigation" aria-label="Application navigation">` — sidebar
- `<main aria-label="Main content" id="main-content" tabIndex={-1}>` — main area
- `<nav aria-label="Main navigation">` — landing page nav

### Live Regions & Loading States
- Global `<div role="status" aria-live="polite">` in AppLayout for async announcements
- Dashboard, analytics, checkins: `aria-busy="true"` + `<span role="status">` sr-only messages
- System builder wizard: `<div role="status" aria-live="polite">` announces each step change
- Toast: Radix UI ToastProvider provides built-in `aria-live` region

### Focus Management
- Global `:focus-visible` ring: `2px solid hsl(var(--ring))` with `outline-offset: 2px`
- Modal focus trapping: Radix UI Dialog primitives handle this automatically
- Wizard step dots: `aria-current="step"`, `disabled` on future steps
- `<main tabIndex={-1}>` enables skip-link focus transfer to content

### Touch Targets
- All `button` / `[role="button"]` (without `data-touch-target="compact"`): min 44x44px
- `.touch-target` utility class for non-button interactive elements

### Form Labels
- Goals page: shadcn/ui `<FormLabel>` via react-hook-form
- Onboarding: `<Label htmlFor>` on all inputs
- System builder step 0: `htmlFor`, `id`, `aria-describedby`, `aria-required`
- Journal textarea: sr-only `<label htmlFor>` + `aria-label`

### Motion Accessibility
- `@media (prefers-reduced-motion: reduce)` collapses all animation/transition to `0.01ms`
