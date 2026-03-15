# SystemForge

## Overview
SystemForge is a React + Firebase web application that helps users turn goals into daily systems they can follow. It allows users to create goals, break them into repeatable daily actions, track progress, and stay consistent.

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

## Routes
- `/` — Landing page (public)
- `/pricing` — Pricing page (public)
- `/login`, `/signup`, `/forgot-password` — Auth pages (public only)
- `/onboarding` — Onboarding flow
- `/dashboard`, `/goals`, `/systems`, `/templates`, `/checkins`, `/analytics`, `/journal`, `/settings` — Protected app routes

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
