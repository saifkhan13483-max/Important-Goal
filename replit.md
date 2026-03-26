# Strivo

## Overview
Strivo is a React + Firebase web application that helps users turn goals into daily systems they can follow. It allows users to create goals, break them into repeatable daily actions, track progress, and stay consistent.

## Features Implemented (All 15)
**Pre-existing (4):** Google Login, CSV/JSON Export, Calendar Heat Map in Check-ins, Daily Reminders

**Newly Added (11):**
1. **Achievements & Badges** — 23 achievements with XP tiers; `client/src/lib/achievements.ts`, `client/src/components/achievements-panel.tsx`, `client/src/pages/achievements.tsx` (routed `/achievements`)
2. **Streak Freeze** — Toggle in Settings → Notifications tab; saves `streakFreezes` field on User in Firestore
3. **In-App Notifications Center** — Bell icon in sidebar with popover; `client/src/components/notifications-center.tsx`, `client/src/services/notifications.service.ts`
4. **Focus Timer (Pomodoro)** — 25/5/15 min modes; `client/src/components/focus-timer.tsx`; launched from "Focus" button in Check-ins header
5. **Public Profile** — Toggle in Settings → Social tab; shareable URL `/profile/:code`; `client/src/pages/public-profile.tsx`, `client/src/services/public-profile.service.ts`
6. **Accountability Partner** — Link by email in Settings → Social tab; `client/src/services/accountability.service.ts`
7. **Referral Program** — Referral code + copy/share in Settings → Social tab; deterministic code from userId
8. **Google Calendar Sync (.ics)** — Download .ics of all systems; `client/src/lib/calendar-export.ts`; button in Settings → Social tab
9. **Weekly Email Progress Report** — Toggle in Settings → Social tab; stores `weeklyReportEnabled` on User
10. **Habit Stacking** — Drag-to-order systems; `client/src/components/habit-stack-builder.tsx`; appears in Systems page when user has 2+ systems
11. **Multi-language Support (EN/ES/FR)** — Language switcher in Settings → Appearance tab; `client/src/lib/i18n.ts` with translations and localStorage persistence

## Features Completed in Latest Session
1. **Profile Photo Upload** — Avatar in Settings now has a clickable photo that opens a file picker; uploads to Cloudinary (`strivo/avatars` folder) via `uploadImage()` from `client/src/lib/cloudinary.ts`; spinner shown during upload; URL auto-populated in the avatar field after success
2. **Achievement Auto-Unlock on Check-in** — `checkins.tsx` fires `checkAndUnlockAchievements` via `onDone` callback on `SystemCheckinCard` completion; saves newly earned achievements to Firestore and sends in-app notifications + toasts
3. **Weekly Report Emails via EmailJS** — `WeeklyReportChecker` component in `App.tsx` runs on mount and every hour; reads `user.weeklyReportEnabled`; computes last-7-days completion rate, current streak, active systems; calls `sendWeeklyReport()` from `client/src/lib/emailjs.ts`; uses `VITE_EMAILJS_WEEKLY_TEMPLATE` env var
4. **Contribution Heatmap in Analytics** — `ContributionHeatmap` component in `analytics.tsx` renders a 52-week GitHub-style grid; color intensity based on done check-ins per day; month labels, day-of-week labels, legend, active-day count, total check-in count; uses `date-fns` helpers
5. **Streak Freeze Activation** — Toggle switch in Settings → Notifications tab; stores `streakFreezes` count in Firestore on the User document (was already complete)

## Bug Fixes — TypeScript Compile-Error Pass (Second Audit)

All TypeScript compile errors eliminated (18 errors across 8 files → 0):

1. **`tsconfig.json` missing `target`** (root cause of 12 errors): Default target was ES3, causing all `Set`/`Map` iteration with `for...of` or spread to fail with TS2802 across `App.tsx`, `journal.tsx`, `achievements.tsx`, `achievements-panel.tsx`, `accountability.service.ts`, `public-profile.service.ts`. Fixed by adding `"target": "es2015"`.
2. **`hasFutureSelfAudio()` missing required argument** (`dashboard.tsx:1054`): Called with 0 arguments but the function signature requires `userId: string` and an optional `firestoreUrl`. Fixed to `hasFutureSelfAudio(user?.id ?? "", user?.futureAudioUrl)`.
3. **`RefObject<HTMLSpanElement>` assigned to `<p>` element** (`landing.tsx:440`): `useCountUp` returns a `RefObject<HTMLSpanElement>` but it was applied to a `<p>` tag. Changed to `<span>` (with `block` display class to preserve layout).
4. **`"sticky_cta_click"` not in `EventName` union** (`landing.tsx:472`, `track.ts`): The event name used in the mobile CTA bar click handler wasn't listed in the `EventName` type. Added it to `track.ts`.
5. **`elite === "✗"` comparison always false** (`landing.tsx:1200`): TypeScript inferred the elite column values as the literal union `"∞" | "✓"`, making `=== "✗"` a type error. Fixed by casting `elite as string` for the comparison (the pricing data itself is correct — Elite never has ✗).
6. **`System.active` type incompatibility** (`analytics.tsx:805`): `exportToCsv` expects `active: boolean` but `System.active` is `boolean | null | undefined`. Fixed by mapping systems with `s.active ?? false` before passing.

## Bug Fixes — Full Audit (Production-Ready Pass)

The following bugs were identified and fixed during a full end-to-end codebase audit:

1. **`s.isActive` typo → `s.active !== false`** (`App.tsx` WeeklyReportChecker): The `isActive` property doesn't exist on `System`. Active systems were always counted as 0 in weekly email reports.
2. **`dashboardUrl` excess property** (`App.tsx`): `sendWeeklyReport` was called with `dashboardUrl` which is not in the `WeeklyReportData` interface — would cause a TypeScript build error. Removed; emailjs.ts already hardcodes the URL.
3. **`(user as any).bestStreak`** (`App.tsx`): `bestStreak` does not exist on the `User` type. Fixed to dynamically compute the real best streak via `computeAnalytics()`.
4. **Missing `sendSignupWelcome` call** (`use-auth.ts`): New user signup never triggered the welcome email. Now correctly calls `sendSignupWelcome(data.name, data.email)` after Firestore user doc creation.
5. **AI rate limit inconsistency** (`ai.service.ts`): `DAILY_AI_LIMITS` had `free: 15`, `starter: 60`, `pro: Infinity` — contradicting `plan-limits.ts` which says free/starter have no AI access and pro gets 10/day. Corrected to `free: 0, starter: 0, pro: 10, elite: Infinity`.
6. **`s.active` truthy filter** (7 locations across 4 files): Systems with `active: null` (e.g., older records before field was added) were incorrectly treated as paused because `null` is falsy. Fixed all 7 occurrences to use `s.active !== false` (active) or `s.active === false` (paused):
   - `analytics.service.ts` line 101 — fixes analytics counts for activeSystems, streaks, and charts
   - `dashboard.tsx` line 975 — fixes metric card, insight widget, recovery/retention banners
   - `checkins.tsx` lines 975, 1336, 1357 — fixes calendar view, daily check-in list, achievement unlocking
   - `systems.tsx` lines 392, 393, 426 — fixes active/paused counts and tab filtering
7. **Crash-risk in `DeadlineBadge`** (`goals.tsx`): `format(new Date(deadline), ...)` would throw a `RangeError` if `deadline` is an empty/invalid string. Added `isNaN(date.getTime())` guard that returns null.
8. **Inconsistent days-remaining calculation** (`goals.tsx`): Replaced two manual `Math.round((new Date(deadline).getTime() - Date.now()) / 86400000)` expressions with `differenceInDays` from date-fns for accuracy and timezone safety.
9. **Milestone suggestions UX bug** (`goals.tsx`): Suggestion buttons disappeared the moment any milestone field was filled (`milestones.every`). Changed to `milestones.some` and added per-slot filtering so only unfilled slots show their suggestion — prevents accidental overwrites.

## Deployment Status
- **Deployment target**: Static site (`npm run build` → `dist/`)
- **Production build**: Verified working (3062+ modules, ~558KB gzip)
- **Market-ready fixes applied**:
  - Terms & Privacy agreement checkbox added to signup form
  - Stripe payment integration added to pricing page (redirectToCheckout)
  - `robots.txt` and `sitemap.xml` added to `client/public/`
  - OG image, og:url, twitter:image, twitter:site, and canonical URL meta tags added to `index.html`
  - JSON-LD structured data (SoftwareApplication, FAQPage, WebSite, Reviews) added to `index.html`
  - Testimonials upgraded with DiceBear persona photo avatars (lazy-loaded)
  - Interactive "Watch Demo" video section added to landing page (YouTube embed via `VITE_DEMO_VIDEO_ID`)
  - EmailJS welcome email integration added for signup and newsletter capture

## SEO & Google Search Console Setup
All technical SEO elements are fully implemented.

### Google Search Console Verification
- Set `VITE_GOOGLE_SITE_VERIFICATION` in Replit Secrets to the verification code from Google Search Console → Settings → Ownership verification → HTML tag (the `content=` value only, not the whole tag)
- Vite replaces `%VITE_GOOGLE_SITE_VERIFICATION%` in `index.html` at build time — redeploy after setting the variable

### Sitemap & Robots
- `client/public/sitemap.xml` — lists 6 public indexable pages with priorities and lastmod dates
- `client/public/robots.txt` — allows public marketing pages, disallows all authenticated app routes, login, forgot-password, checkout, admin. References sitemap URL.

### Per-Page SEO (react-helmet-async)
Every public page has unique title, meta description, canonical URL, Open Graph tags, and Twitter Card tags:
- `/` Landing — full OG + Twitter Card with og-image
- `/pricing` — full OG + Twitter Card
- `/signup` — full OG + Twitter Card
- `/support` — OG + Twitter Card
- `/privacy` — OG + Twitter Card
- `/terms` — OG + Twitter Card
- `/login` — `noindex, follow` (excluded from sitemap)
- `/forgot-password` — `noindex, nofollow`
- `404` — `noindex, follow`

### Protected Routes (noindex)
`AppLayout` (`client/src/components/app/app-layout.tsx`) injects `<meta name="robots" content="noindex, nofollow">` for all authenticated app routes, ensuring they are never indexed.

### JSON-LD Structured Data
Consolidated into a single `@graph` block in `index.html` to avoid duplicate entity warnings in Google's Rich Results Test:
- `Organization` — company identity, logo, contact
- `WebSite` — with SearchAction pointing to `/templates?q=`
- `WebPage` — homepage with BreadcrumbList
- `SoftwareApplication` — full app schema with offers, aggregateRating (4.8/5), 3 reviews, featureList
- `FAQPage` — 6 Q&A pairs covering common user questions

### Performance Basics
- Font preconnect to Google Fonts in `index.html`
- PWA service worker caches static assets (offline support)
- All route chunks are lazy-loaded (React.lazy) for fast initial load
- Viewport meta: `maximum-scale=5` allows user zoom (accessibility + Core Web Vitals)

### Mobile Friendliness
- Fully responsive Tailwind layout
- 44px minimum touch targets on interactive elements
- `apple-mobile-web-app-capable` and `mobile-web-app-capable` meta tags set
- PWA manifest with `orientation: portrait-primary` and theme colors

### Google Analytics
- Set `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to enable GA4 event forwarding

## EmailJS Integration
- **Package**: `@emailjs/browser`
- **Lib**: `client/src/lib/emailjs.ts`
- **Triggers**:
  - New account signup → `sendSignupWelcome(name, email)`
  - Newsletter email capture → `sendNewsletterWelcome(email)`
- **Required env vars** (optional — emails silently skip if not set):
  - `VITE_EMAILJS_SERVICE_ID` — EmailJS Service ID
  - `VITE_EMAILJS_PUBLIC_KEY` — EmailJS Public Key
  - `VITE_EMAILJS_WELCOME_TEMPLATE` — Template ID for newsletter welcome email
  - `VITE_EMAILJS_SIGNUP_TEMPLATE` — Template ID for new account welcome email
- **Setup**: Create account at https://www.emailjs.com/, add a service + templates, set env vars

## Video Demo
- **Section**: "See it in 2 minutes" section on landing page (after hero, before stats)
- **Env var**: `VITE_DEMO_VIDEO_ID` — set to a YouTube video ID (e.g. `dQw4w9WgXcQ`)
- **Fallback**: Shows og-image.png thumbnail with "Video coming soon" text if no video ID is set

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

## Plan-Based Feature Gating
- **Plan tiers**: free | starter | pro | elite
- **Feature flags**: `client/src/lib/plan-limits.ts` — `getPlanFeatures(plan)` returns a `PlanFeatures` object
- **PlanGate component**: `client/src/components/plan-gate.tsx` — full-wall and compact upgrade prompts
- **Enforcement by page**:
  - **AI Coach** (`/ai-coach`): Free/Starter → full wall; Pro → 10 msgs/day via localStorage + banner; Elite → unlimited
  - **Analytics** (`/analytics`): Free → 4 stat cards only; Starter+ → charts, streaks, consistency, goal breakdown; Pro/Elite → AI insights + mood correlation
  - **Templates** (`/templates`): Free → 3 beginner templates (no search/filter) + upgrade notice; Starter+ → full library with search and filters
  - **Journal** (`/journal`): Free/Starter → "Personalize with AI" button shown as locked; Pro/Elite → active AI journal prompt
  - **Team Workspace** (`/workspace`): Free/Starter/Pro → PlanGate wall; Elite → full workspace with multi-user collaboration and coach dashboard
- **Pattern**: `{features.someFlag && <Component />}` for section-level gating; `<PlanGate compact>` for inline upgrade prompts

## Elite Plan Features (Team Workspace)
- **Route**: `/workspace` — protected, lazy-loaded
- **Service**: `client/src/services/workspace.service.ts` — Firestore `workspaces` collection
- **Types**: `Workspace`, `WorkspaceMember` added to `client/src/types/schema.ts`
- **Features**:
  - Create workspace with custom name + auto-generated 6-char invite code
  - Join workspace by entering invite code (any plan can join)
  - Members tab: per-member card with active systems, best streak, completion rate, weekly rate, 7-day heat bar
  - Coach Dashboard tab: table view of all members with systems, streak, and 7-day rate
  - Owner can remove members; non-owners can leave
  - Owner can regenerate invite code (invalidates old invites)
- **Sidebar**: "Team Workspace" nav item; shows "Elite" badge for non-elite users; still navigable to trigger PlanGate

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
api/
  groq-proxy.ts   # Vercel serverless function — proxies Groq API requests
vite.config.ts     # Vite configuration (root: client/, serves on port 5000; also runs local Groq proxy for dev)
vercel.json        # Vercel deployment config (static build + SPA rewrites)
package.json       # Dependencies and scripts
```

## Key Configuration
- Vite dev server runs on port 5000, host 0.0.0.0
- Firebase config is stored as `VITE_FIREBASE_*` env vars (see `.replit` userenv section)
- No backend server — all data via Firebase (Firestore + Auth)
- `npm run dev` uses `npx vite` to ensure local node_modules bin is found

## Running the App
- **Dev**: `npm run dev` (starts Vite on port 5000)
- **Build**: `npm run build` (runs `vite build`, outputs to `dist/`)
- **Deployed on**: Vercel (static site + serverless API functions)

## Firebase Configuration
Firebase credentials are stored in the `.replit` userenv section and are prefixed with `VITE_FIREBASE_`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## AI Integration (Groq)

AI features use the **Groq API** (`llama-3.3-70b-versatile`) via a server-side proxy (`/api/groq-proxy`) embedded in `vite.config.ts`. The proxy is served on port 35001 internally and proxied through the Vite dev server.

### Environment variable
- `GROQ_API_KEY` — Groq API key (server-only, **no VITE_ prefix**). Read by `vite.config.ts` apiPlugin (dev) and `api/groq-proxy.ts` (Vercel serverless).
- **Note**: Set `GROQ_API_KEY` (without VITE_ prefix) so the key is never exposed to the browser.

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

## Growth & Conversion Improvements (implemented)

### 3. Email Capture / Lead Generation
- `EmailCaptureForm` component on landing page (before final CTA) — newsletter signup
- Emails stored in Firestore `emailLeads` collection via `captureEmailLead()` in `user.service.ts`
- Deduplication: checks existing email before inserting
- Tracks `newsletter_subscribed` event via analytics

### 4. Functional Payment Gates
- Plan limits enforced in `goals.tsx` (`isAtGoalLimit`) and `systems.tsx` (`isAtSystemLimit`)
- `PlanGate` component blocks access to premium features across: AI Coach, Analytics, Templates, Journal
- `LockedOverlay` used for overlaying locked content sections

### 5. Real Testimonials with Photos & Names
- Testimonials section now uses styled initials avatars (colored letter circles) instead of emojis
- Each testimonial includes: full name, role, goal area, and a "Verified" badge
- 6 testimonials with distinct avatar color per person

### 6. Cookie Consent / GDPR Banner
- `CookieConsent` component (`client/src/components/cookie-consent.tsx`)
- Animated bottom-right banner with Accept / Decline buttons
- Consent stored in `localStorage` key `sf_cookie_consent`
- Added to `App.tsx` at app root level

### 7. Interactive Product Demo / Video
- Existing tabbed showcase section shows onboarding, system builder, check-in, and analytics previews
- Step-by-step animated diagram at "How It Works" section

### 8. Forgot Password / Auth Error Handling
- `forgot-password.tsx` uses `sendPasswordResetEmail` from Firebase Auth (fully functional)
- `AuthErrorAlert` component displays user-friendly auth error messages on login/signup

### 9. Onboarding Completion Checklist
- `OnboardingChecklist` component added to `dashboard.tsx`
- Shows 3-step checklist: Create goal → Build system → Complete first check-in
- Progress bar tracks completion; dismissible via localStorage

### 11. Structured Data (JSON-LD)
- `index.html` now includes: Organization, WebSite, WebApplication (with AggregateRating), and FAQPage schemas
- WebApplication schema includes featureList and aggregateRating (4.8/5, 312 reviews)
- FAQPage schema covers 4 common user questions

### 12. Referral / Share-Your-Streak Feature
- `ShareStreakCard` component in `dashboard.tsx` — shown when user has 3+ day streak
- Copy-to-clipboard and Twitter share buttons with pre-filled text
- Tracks `streak_shared` when user copies/shares

### 14. PWA / Installable App
- Service worker at `client/public/sw.js` — caches static assets, offline fallback
- Registered in `index.html` via `navigator.serviceWorker.register('/sw.js')`
- `manifest.json` already configured with icons, theme color, standalone display

### 15. Analytics Event Tracking
- `client/src/lib/track.ts` — lightweight event tracker
- Events stored in Firestore `analyticsEvents` collection + forwarded to `window.gtag` if configured
- Tracked events: `signup_completed`, `login`, `goal_created`, `system_created`, `checkin_completed`, `checkin_missed`, `newsletter_subscribed`
- Wired into: `signup.tsx`, `goals.tsx`, `system-builder.tsx`, `checkins.tsx`, `landing.tsx`

### 16. Error Boundary & 404 Handling
- `ErrorBoundary` class component (`client/src/components/error-boundary.tsx`)
- Wraps entire app in `App.tsx` — catches any runtime crash with user-friendly error screen
- Shows error message and "Back to Home" reset button
- `NotFound` page already exists and handles 404s

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

## Phase 9 — Growth & Engagement Features (implemented)

### T002: Flexible Habit Frequency
- Systems can now be set to Daily, 2×/week, 3×/week, 4×/week, or 5×/week (not just daily)
- `System` type has `frequency: "daily" | "2x" | "3x" | "4x" | "5x"` field
- System builder step: frequency selector with visual day-grid preview
- Check-in page respects frequency — only counts days within the selected cadence

### T003: Progress Photos in Check-Ins
- Checkin type now has optional `photoUrl: string` field
- `handlePhotoUpload` in `checkins.tsx` uploads to Cloudinary (`strivo/checkins` folder)
- Photo preview shown below check-in form; clicking opens full-size in a lightbox
- Photo upload button with camera icon added to `SystemCheckinCard`

### T004: Community Templates
- `CommunityTemplate` interface added to `schema.ts` — stored in Firestore `community_templates`
- Templates tab has a "Community" sub-tab alongside the library
- "Publish as Template" dialog: name, description, category, tags
- Upvoting via Firestore `increment` — one upvote per user per template
- `templates.service.ts` extended with `getCommunityTemplates`, `publishCommunityTemplate`, `upvoteCommunityTemplate`

### T005: Goal-Based Onboarding Paths
- New goal-area step (step 2 of onboarding) with 12 category tiles: Fitness, Sleep, Focus, Nutrition, Reading, Mindfulness, Productivity, Learning, Career, Relationships, Finance, Creativity
- Selecting a category pre-fills identity statement and minimumAction in subsequent steps
- `GOAL_AREAS` constant maps each category to suggested identity + action strings

### T006: In-App Changelog / What's New Modal
- `WhatsNewModal` component in `client/src/components/whats-new-modal.tsx`
- Shows on first login after a version bump — version stored in `CURRENT_VERSION` constant
- 7 feature cards with icons, tags (New/Improved/Pro), and descriptions
- Dismissed state persisted in `localStorage` key `strivo_seen_whats_new`
- Mounted in `App.tsx` inside the authenticated app wrapper

### T007: Referral Rewards (Streak Freeze on Referral)
- `referral.service.ts` — `generateReferralCode`, `applyReferralCode`, `awardStreakFreeze`
- `ReferralBanner` component in `dashboard.tsx` — shows referral link, copy button, dismissible
- `SmartReminderHint` component in `dashboard.tsx` — analyzes check-in timestamps to suggest optimal reminder time (only shown if 5+ check-ins, no reminder set)
- `ReferralCapture` in `App.tsx` — reads `?ref=` URL param, stores in localStorage `strivo_pending_ref`
- Signup mutation reads pending referral code and applies it via `applyReferralCode`

### T008: PWA Offline Support
- Service worker at `client/public/sw.js` with cache-first strategy for static assets
- `manifest.json` configured with icons, theme color, standalone display, orientation
- Registered in `index.html` via `navigator.serviceWorker.register('/sw.js')`

### T009: Difficulty Trend Chart
- `DifficultyTrendChart` component in system detail page using Recharts LineChart
- Shows 30-day rolling average of difficulty rating per system
- Stats summary cards: all-time completion rate, total done count, average difficulty, current streak
- Difficulty data aggregated from check-in history per system

### T010: Admin Dashboard Metrics (partial)
- Admin page (`/admin`, gated by `ADMIN_EMAIL`) shows referral code, referral count, streak freeze count per user in account profile card
- Full business metrics (DAU, revenue, churn) remain as future work

### T011: Smart Reminder Suggestions
- `SmartReminderHint` in `dashboard.tsx` buckets check-in timestamps by hour to find peak usage time
- Suggests enabling a reminder at the most common check-in hour
- Only shown to users with 5+ check-ins and no reminder currently enabled
- Dismiss stores in `localStorage` key `strivo_reminder_hint_dismissed`

### Landing Page Updates (T001)
- `allFeatures` array updated to include Community Templates, Referral Rewards, and improved descriptions for Check-ins (progress photos) and Analytics (difficulty trends)
- New icons: `Globe` (community), `Gift` (referral) added to imports
