# Strivo

> Most people set goals. Few build systems.

Strivo helps you convert vague goals into powerful, repeatable daily systems. Define identity statements, triggers, minimum actions, reward loops, and fallback plans — then track your progress with check-ins, streaks, and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Auth | Firebase Auth (email/password + Google) |
| Database | Firebase Firestore |
| State | TanStack Query v5 + Zustand |
| Routing | wouter |
| Image Uploads | Cloudinary (optional) |

---

## Getting Started (Local Development)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd strivo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your Firebase values:

```bash
cp .env.example .env.local
```

Required variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Optional (profile photo uploads via Cloudinary):

```env
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

### 4. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create or open your project
3. Enable **Authentication** → Email/Password + Google providers
4. Enable **Firestore Database** in production mode
5. Paste your web app config values into `.env.local`

### 5. Deploy Firestore Security Rules

Copy `firestore.rules` content into Firebase Console → Firestore → Rules tab.

### 6. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:5000`.

---

## Deploying to Vercel

This project is a pure static SPA — there is no backend server. It deploys to Vercel as a static site with client-side routing.

### Step 1 — Push to GitHub

Push the project to a GitHub (or GitLab / Bitbucket) repository.

### Step 2 — Import into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect the `vercel.json` configuration:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`

### Step 3 — Set Environment Variables in Vercel

In the Vercel project dashboard → **Settings → Environment Variables**, add each of the following for **Production** (and optionally Preview):

| Variable | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same as above |
| `VITE_FIREBASE_PROJECT_ID` | Same as above |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same as above |
| `VITE_FIREBASE_APP_ID` | Same as above |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard (optional) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary Dashboard (optional) |

### Step 4 — Add your Vercel domain to Firebase

In Firebase Console → **Authentication → Settings → Authorized Domains**:

- Add your Vercel production URL (e.g. `strivo.vercel.app`)
- Add any preview URLs you want to allow

### Step 5 — Deploy

Click **Deploy** in Vercel. Subsequent pushes to `main` will auto-deploy.

---

## Project Structure

```
client/src/
  components/      # Reusable UI components + shadcn/ui primitives
    ui/            # shadcn/ui components
  constants/       # App-wide constants (categories, options, labels)
  hooks/           # Custom React hooks (useAuth, etc.)
  lib/             # Core configuration (Firebase, QueryClient, utils)
  pages/           # Route-level page components
  services/        # Firebase service layer (auth, goals, systems, etc.)
  store/           # Zustand global state stores
  types/           # TypeScript interfaces and data models
```

---

## Features

- **Authentication** — Email/password + Google sign-in, persistent sessions, protected routes
- **Onboarding** — Multi-step wizard, saves to Firestore, routes to System Builder
- **Goal Management** — Full CRUD, categories, priorities, deadlines, archive
- **System Builder** — 7-step guided builder: Identity → Outcome → Trigger → Action → Reward → Fallback → Review
- **Templates Library** — 9 prebuilt templates with search, filters, preview, and one-click use
- **Daily Check-ins** — Today view + 30-day history; done/partial/missed; mood before/after (1-5); difficulty (1-5); streak badges; fallback advice on miss
- **Analytics** — Daily/weekly/monthly completion charts, current streaks, all-time best streaks, most consistent systems, most missed systems, completion by goal
- **Dashboard** — Greeting, today's progress, active goals, streaks, quick actions, combined check-in + journal activity feed
- **Journal** — Daily/weekly reflections with guided prompts, linked to goals/systems
- **Settings** — Profile, theme (light/dark/system), timezone

---

## Firebase Console Checklist

Before going live:

- [ ] Create a Firebase project
- [ ] Enable **Email/Password** auth provider
- [ ] Enable **Google** auth provider
- [ ] Enable **Firestore** in production mode
- [ ] Deploy `firestore.rules`
- [ ] Add your production domain to **Authorized Domains**
- [ ] Copy all config values to Vercel environment variables

---

## Firestore Security Rules

See `firestore.rules` for the recommended security configuration. Deploy these rules before going live to protect user data.
