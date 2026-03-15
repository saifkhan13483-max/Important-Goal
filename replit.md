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
