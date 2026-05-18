<div align="center">

# Strivo

### Turn Goals into Daily Systems You Actually Follow

**[Live App](https://www.strivo.life) · [Pricing](https://www.strivo.life/pricing) · [Sign Up](https://www.strivo.life/signup)**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

</div>

---

## Overview

Strivo is a React + Firebase SaaS application that helps users convert vague ambitions into repeatable daily systems. Users define identity statements, triggers, minimum actions, reward loops, and fallback plans — then track their consistency through check-ins, streaks, analytics, and AI coaching. Four plan tiers (Free → Starter → Pro → Elite) gate access to advanced features including AI insights, the full analytics suite, and a team workspace.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Plan Tiers & Feature Gating](#plan-tiers--feature-gating)
- [AI Integration](#ai-integration)
- [SEO & Performance](#seo--performance)
- [Deployment](#deployment)
- [Firebase Setup](#firebase-setup)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| **Goal Management** | Full CRUD for goals with categories, priorities, deadlines, and progress tracking |
| **System Builder** | 7-step guided builder — Identity → Outcome → Trigger → Action → Reward → Fallback → Review |
| **Daily Check-ins** | Today view + 30-day history; done / partial / missed; mood & difficulty ratings; streak badges |
| **Analytics** | Completion charts, streak history, heatmap, consistency scores, goal breakdown, AI insights |
| **AI Coach** | Full-page chat powered by Gemini (gemini-2.0-flash) with user system context |
| **Journal** | Guided daily / weekly reflections with AI prompt generation |
| **Templates Library** | 9+ pre-built habit templates with search, filters, preview, and one-click import |
| **Achievements & Badges** | 23 achievements across XP tiers; auto-unlocked on check-in completion |
| **Team Workspace** | Elite-only multi-user workspace with coach dashboard and per-member analytics |
| **Focus Timer** | Pomodoro timer (25 / 5 / 15 min) launched from the check-ins page |
| **Habit Stacking** | Drag-to-reorder systems into a priority stack when 2+ systems are active |
| **Public Profile** | Shareable profile page at `/profile/:code` with an opt-in toggle |
| **Accountability Partner** | Link to another user by email for mutual visibility |
| **Streak Freeze** | Protect streaks from missed days via a configurable freeze count |
| **In-App Notifications** | Bell icon with popover; achievement unlocks and system events push notifications |
| **Future Self Audio** | Record or upload a motivational message; plays back on first visit or after a missed day |
| **Profile Photo Upload** | Cloudinary-backed avatar upload in Settings |
| **Weekly Email Reports** | EmailJS-powered weekly progress digest (opt-in) |
| **Google Calendar Export** | Download an `.ics` file of all active systems |
| **Referral Program** | Deterministic referral code per user with copy/share buttons |
| **Dark Mode** | System-preference aware with localStorage persistence |
| **PWA / Installable** | Service worker, offline fallback, and `manifest.json` for add-to-home-screen |
| **SEO Ready** | Per-page meta tags, Open Graph, Twitter Card, JSON-LD structured data, sitemap, robots.txt |
| **Cookie Consent** | GDPR-compliant animated banner with Accept / Decline; stored in localStorage |
| **Error Boundary** | React error boundary catches unexpected crashes with a friendly fallback UI |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS v3, shadcn/ui (Radix UI), Framer Motion |
| **Routing** | wouter |
| **State Management** | TanStack React Query v5, Zustand |
| **Forms** | React Hook Form + Zod |
| **Authentication** | Firebase Authentication (Email/Password + Google) |
| **Database** | Firebase Firestore |
| **AI** | Google Gemini API — `gemini-2.0-flash` via a Vercel serverless proxy |
| **Emails** | EmailJS (welcome emails, weekly reports) |
| **Media Uploads** | Cloudinary (unsigned upload preset) |
| **Payments** | Stripe Payment Links + Customer Portal (no server secret required) |
| **Deployment** | Vercel (static SPA + `/api/ai-proxy` serverless function) |

---

## Project Structure

```
strivo/
├── api/
│   └── ai-proxy.ts                # Vercel serverless function — proxies Gemini API requests
│
├── public/
│   ├── favicon.ico
│   ├── favicon.png
│   ├── og-image.png               # Open Graph share image
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker — static asset caching + offline fallback
│   ├── robots.txt                 # Search engine crawl rules
│   ├── sitemap.xml                # Public page URLs for indexing
│   └── google-site-verification.html
│
├── src/
│   ├── App.tsx                    # Root router — public + protected branches, global providers
│   ├── main.tsx                   # Entry point, wrapped in ErrorBoundary
│   ├── index.css                  # Global styles, Tailwind directives, CSS design tokens
│   │
│   ├── components/
│   │   ├── app/                   # App shell — layout, navigation, providers
│   │   │   ├── app-layout.tsx     # Authenticated layout wrapper with sidebar
│   │   │   ├── app-sidebar.tsx    # Main navigation sidebar
│   │   │   ├── animated-page.tsx  # Page transition wrapper (Framer Motion)
│   │   │   ├── empty-state.tsx    # Reusable empty state component
│   │   │   ├── error-boundary.tsx # React error boundary (crash fallback)
│   │   │   ├── hero-animation.tsx # Landing page animated hero graphic
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── notifications-center.tsx # Bell icon + notification popover
│   │   │   ├── page-header.tsx    # Page title + breadcrumb component
│   │   │   ├── site-logo.tsx      # Brand logo with light/dark variants
│   │   │   ├── theme-provider.tsx # Dark mode context + localStorage sync
│   │   │   └── whats-new-modal.tsx# Release notes modal
│   │   │
│   │   ├── features/              # Product feature components
│   │   │   ├── achievements-panel.tsx  # Achievements grid with progress and XP
│   │   │   ├── focus-timer.tsx         # Pomodoro timer modal
│   │   │   ├── future-self-audio.tsx   # Record / playback motivational audio
│   │   │   ├── habit-stack-builder.tsx # Drag-to-reorder system stack
│   │   │   └── plan-gate.tsx           # Upgrade wall / inline upgrade prompt
│   │   │
│   │   ├── ai/                    # AI-powered components
│   │   │   ├── ai-chat.tsx        # Floating chat widget (all authenticated pages)
│   │   │   └── ai-system-generator.tsx # Modal: describe a goal → AI fills system fields
│   │   │
│   │   ├── auth/                  # Authentication guards and helpers
│   │   │   ├── auth-error-alert.tsx
│   │   │   └── protected-route.tsx
│   │   │
│   │   └── ui/                    # shadcn/ui primitive component library
│   │
│   ├── pages/                     # Route-level page components
│   │   ├── landing.tsx            # Public marketing landing page
│   │   ├── pricing.tsx            # Pricing page with Stripe checkout
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   ├── onboarding.tsx         # Multi-step onboarding wizard
│   │   ├── dashboard.tsx          # Home dashboard — greeting, progress, streaks
│   │   ├── goals.tsx              # Goal list with CRUD and filters
│   │   ├── goal-detail.tsx        # Goal detail with milestones and linked systems
│   │   ├── systems.tsx            # System list — active, paused, archived tabs
│   │   ├── system-builder.tsx     # 7-step system creation wizard
│   │   ├── system-detail.tsx      # System detail with history and analytics
│   │   ├── checkins.tsx           # Daily check-in flow and history
│   │   ├── analytics.tsx          # Charts, streaks, heatmap, AI insights
│   │   ├── journal.tsx            # Reflection journal with AI prompts
│   │   ├── templates.tsx          # Pre-built habit templates library
│   │   ├── ai-coach.tsx           # Full-page AI chat with system context
│   │   ├── achievements.tsx       # Achievement gallery
│   │   ├── workspace.tsx          # Elite team workspace
│   │   ├── settings.tsx           # Profile, theme, reminders, integrations
│   │   ├── weekly-review.tsx      # Guided weekly review flow
│   │   ├── public-profile.tsx     # Shareable public profile (/profile/:code)
│   │   ├── checkout-success.tsx   # Post-payment success page
│   │   ├── admin.tsx              # Internal admin panel
│   │   ├── privacy.tsx
│   │   ├── terms.tsx
│   │   ├── support.tsx
│   │   └── not-found.tsx          # 404 page
│   │
│   ├── services/                  # Firebase service layer (all Firestore operations)
│   │   ├── ai.service.ts
│   │   ├── analytics.service.ts
│   │   ├── accountability.service.ts
│   │   ├── audio.service.ts
│   │   ├── auth.service.ts
│   │   ├── checkins.service.ts
│   │   ├── goals.service.ts
│   │   ├── journal.service.ts
│   │   ├── notifications.service.ts
│   │   ├── public-profile.service.ts
│   │   ├── referral.service.ts
│   │   ├── systems.service.ts
│   │   ├── templates.service.ts
│   │   ├── user.service.ts
│   │   └── workspace.service.ts
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-ai.ts              # Wraps any AI call with loading/error state
│   │   ├── use-auth.ts            # Firebase auth state + Firestore user doc
│   │   ├── use-count-up.ts        # Animated number counter
│   │   ├── use-mobile.tsx         # Mobile breakpoint detection
│   │   └── use-toast.ts
│   │
│   ├── lib/                       # Core utilities and third-party integrations
│   │   ├── achievements.ts        # 23 achievement definitions and unlock logic
│   │   ├── calendar-export.ts     # .ics file generation for Google Calendar
│   │   ├── cloudinary.ts          # Cloudinary image upload helper
│   │   ├── emailjs.ts             # EmailJS welcome + weekly report senders
│   │   ├── firebase.ts            # Firebase app initialisation
│   │   ├── i18n.ts                # EN / ES / FR translations + localStorage sync
│   │   ├── plan-limits.ts         # getPlanFeatures() — feature flags per plan tier
│   │   ├── queryClient.ts         # TanStack React Query client setup
│   │   ├── stripe.ts              # Stripe Payment Links redirect helpers
│   │   ├── track.ts               # Lightweight analytics event tracker
│   │   └── utils.ts               # cn() and general utilities
│   │
│   ├── store/
│   │   └── auth.store.ts          # Zustand global auth store
│   │
│   ├── types/
│   │   └── schema.ts              # All TypeScript interfaces (User, Goal, System, etc.)
│   │
│   └── constants/
│       └── index.ts               # App-wide constants (categories, options, labels)
│
├── firestore.rules                # Firestore security rules
├── vercel.json                    # Vercel deploy config — SPA rewrites + API route
├── vite.config.ts                 # Vite — port 5000, path aliases, dev Gemini proxy
├── tailwind.config.ts             # Tailwind configuration + design tokens
├── tsconfig.json                  # TypeScript configuration
├── components.json                # shadcn/ui configuration
└── .env.example                   # Environment variables template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with Firestore and Authentication enabled
- A [Google Gemini](https://aistudio.google.com/apikey) API key (free tier available)
- Optional: [Cloudinary](https://cloudinary.com/) account for profile photo uploads
- Optional: [EmailJS](https://www.emailjs.com/) account for transactional emails
- Optional: [Stripe](https://stripe.com/) account for payment processing

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on **port 5000**. The `/api/ai-proxy` endpoint is handled by a Vite middleware plugin in development and by `api/ai-proxy.ts` as a Vercel serverless function in production.

### Build

```bash
npm run build
```

Output is written to `dist/`.

---

## Environment Variables

Copy `.env.example` to `.env` (local) or add values via Replit Secrets / Vercel Project Settings.

```env
# Firebase — VITE_ prefix makes these available in the client bundle
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Google Gemini — server-side ONLY, never prefix with VITE_
GEMINI_API_KEY=

# Cloudinary — unsigned upload, no server secret required (optional)
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

# Stripe — Payment Links (optional)
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_STARTER_MONTHLY_LINK=
VITE_STRIPE_STARTER_YEARLY_LINK=
VITE_STRIPE_PRO_MONTHLY_LINK=
VITE_STRIPE_PRO_YEARLY_LINK=
VITE_STRIPE_ELITE_MONTHLY_LINK=
VITE_STRIPE_ELITE_YEARLY_LINK=
VITE_STRIPE_CUSTOMER_PORTAL_URL=

# EmailJS — transactional emails (optional)
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_PUBLIC_KEY=
VITE_EMAILJS_WELCOME_TEMPLATE=
VITE_EMAILJS_SIGNUP_TEMPLATE=
VITE_EMAILJS_WEEKLY_TEMPLATE=

# SEO (optional)
VITE_GOOGLE_SITE_VERIFICATION=
VITE_GA_MEASUREMENT_ID=

# Demo video — YouTube video ID shown on landing page (optional)
VITE_DEMO_VIDEO_ID=
```

> **Important:** `GEMINI_API_KEY` is a server-only secret. `VITE_*` variables are embedded into the client bundle at build time — never store secrets in them.

---

## Architecture

```
Browser
  │
  ├── /api/ai-proxy (POST)
  │     ├── [dev]  Vite middleware plugin in vite.config.ts
  │     └── [prod] Vercel serverless function → api/ai-proxy.ts → Gemini API
  │
  └── All other routes → React SPA (wouter client-side routing)
        ├── Firebase Auth  — email/password + Google sign-in, persistent sessions
        ├── Firestore      — goals, systems, check-ins, journal, users, workspaces
        ├── Cloudinary     — profile photo uploads (unsigned preset, no server secret)
        ├── Stripe         — Payment Links redirect + Customer Portal
        └── EmailJS        — welcome emails + weekly progress reports (client-side)
```

**Key decisions:**
- **No separate Express server** — all server logic lives in either the Vite middleware (dev) or Vercel serverless functions (prod)
- **Stripe Payment Links** — no webhook server required; plan is written to Firestore from the `/checkout/success` page after redirect
- **EmailJS client-side** — email sending requires no backend; public key is safe to expose
- **Cloudinary unsigned preset** — images upload directly from the browser; no server upload secret needed
- **Protected routes fully isolated** — `AppLayout` injects `noindex, nofollow` meta for all authenticated routes so they are never indexed

---

## Plan Tiers & Feature Gating

| Feature | Free | Starter | Pro | Elite |
|---|:---:|:---:|:---:|:---:|
| Goals | 3 | 10 | Unlimited | Unlimited |
| Active Systems | 3 | 10 | Unlimited | Unlimited |
| Templates | 3 beginner | Full library | Full library | Full library |
| Analytics | Basic stats | Full charts | Full + AI insights | Full + AI insights |
| AI Coach | — | — | 10 msgs/day | Unlimited |
| AI Journal Prompts | — | — | ✓ | ✓ |
| Team Workspace | — | — | — | ✓ |

Feature flags are centralised in `src/lib/plan-limits.ts` via `getPlanFeatures(plan)`. The `<PlanGate>` component (`src/components/features/plan-gate.tsx`) renders either a full upgrade wall or a compact inline prompt depending on context.

---

## AI Integration

AI features use **Google Gemini** (`gemini-2.0-flash`) routed through a server-side proxy so the API key is never exposed to the browser.

| File | Purpose |
|---|---|
| `api/ai-proxy.ts` | Vercel serverless function — receives requests from the client and forwards them to Gemini |
| `src/services/ai.service.ts` | `callGroq`, `suggestSystemField`, `generateFullSystem`, `chatWithCoach`, `generateJournalPrompt`, `generateAnalyticsInsights` |
| `src/hooks/use-ai.ts` | `useAi<T>(fn)` — wraps any AI call with `loading` / `error` state |
| `src/components/ai/ai-system-generator.tsx` | Modal: describe a goal → AI fills all system builder fields |
| `src/components/ai/ai-chat.tsx` | Floating chat widget mounted on every authenticated page |

All AI calls throw with message `"AI assistant is temporarily unavailable."` on any API failure. Components surface a toast or inline error — never a silent failure.

---

## SEO & Performance

| Item | Implementation |
|---|---|
| Per-page titles & descriptions | `react-helmet-async` on every public route |
| Open Graph & Twitter Card | `src/pages/landing.tsx`, `index.html` |
| JSON-LD structured data | `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` in `index.html` |
| Canonical URLs | Set per page via `react-helmet-async` |
| Sitemap | `public/sitemap.xml` — 6 public pages with priorities |
| Robots | `public/robots.txt` — disallows all authenticated app routes |
| Protected route indexing | `AppLayout` injects `noindex, nofollow` for all `/dashboard`, `/goals`, etc. routes |
| Code splitting | Lazy-loaded route chunks + vendor splits for React, Firebase, Framer Motion, Radix UI |
| PWA | Service worker caches static assets; offline fallback to `index.html` |
| Font loading | Google Fonts preconnect + `display=swap` for zero layout shift |
| GA4 | Set `VITE_GA_MEASUREMENT_ID` to enable Google Analytics event forwarding |

---

## Deployment

This project is configured for **Vercel** with zero additional setup beyond environment variables.

1. Import the repository into Vercel
2. Add all environment variables in **Project Settings → Environment Variables**
3. Deploy — Vercel automatically routes `/api/ai-proxy` to the serverless function and all other paths to the SPA

The `vercel.json` handles:
- `/api/ai-proxy` → `api/ai-proxy.ts` serverless function
- All other routes → `dist/index.html` (SPA fallback)

---

## Firebase Setup

### Console Checklist

- [ ] Create a Firebase project
- [ ] Enable **Email/Password** authentication provider
- [ ] Enable **Google** authentication provider
- [ ] Enable **Firestore Database** in production mode
- [ ] Deploy `firestore.rules` (Firebase Console → Firestore → Rules)
- [ ] Add your production domain to **Authentication → Settings → Authorized Domains**
- [ ] Copy all config values to Vercel environment variables

### Firestore Collections

| Collection | Description |
|---|---|
| `users` | User profile, plan, preferences, streak freezes |
| `goals` | User goals with metadata and progress |
| `systems` | Habit systems linked to goals |
| `checkins` | Daily check-in records per system |
| `journal` | Journal entries |
| `workspaces` | Elite team workspaces with member lists |
| `emailLeads` | Newsletter signups from the landing page |
| `analyticsEvents` | Lightweight in-app event tracking |

---

## Author

**Saif Khan** — Founder & Developer of Strivo

---

## License

This project is private and proprietary. All rights reserved.
Unauthorised copying, distribution, or use of any part of this codebase is prohibited.
