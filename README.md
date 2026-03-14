# SystemForge

> Most people set goals. Few build systems.

SystemForge helps you convert vague goals into powerful, repeatable daily systems. Define identity statements, triggers, minimum actions, reward loops, and fallback plans — then track your progress with check-ins, streaks, and analytics.

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

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd systemforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional (for profile photo uploads):
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

### 4. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Enable **Authentication** and turn on Email/Password and Google providers
4. Enable **Firestore Database** in production mode
5. Copy your web app config into `.env`

### 5. Deploy Firestore Security Rules

Copy the contents of `firestore.rules` to Firebase Console → Firestore → Rules.

### 6. Run the app

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

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

### Phase 0 — Project Setup
- React 18 + Vite + TypeScript + Tailwind CSS
- shadcn/ui + Radix UI components
- wouter routing
- Firebase Auth + Firestore setup
- Sidebar + header app shell for authenticated pages
- All 8 pages scaffolded: Landing, Login, Signup, Dashboard, Goals, System Builder, Check-ins, Analytics, Settings, Journal

### Phase 1 — Authentication
- Email/password sign up and sign in
- Google sign-in (popup flow)
- Forgot password via Firebase email reset
- Protected routes — unauthenticated users redirected to login
- Public-only routes — authenticated users redirected to dashboard
- Onboarding redirect for new users
- Persistent auth session via Firebase
- Zustand store for global UI state
- Full form validation and friendly error messages

---

## Deployment

Deploy to [Vercel](https://vercel.com) or Replit Autoscale:

- Set all `VITE_` environment variables in your deployment environment
- Add your deployment domain to Firebase Console → Authentication → Authorized Domains

---

## Firestore Security Rules

See `firestore.rules` for the recommended security configuration.

---

## Firebase Console Checklist

Before going live, make sure you have:

- [ ] Created a Firebase project
- [ ] Enabled Email/Password auth provider
- [ ] Enabled Google auth provider
- [ ] Enabled Firestore in production mode
- [ ] Deployed `firestore.rules`
- [ ] Added your domain to Authorized Domains
- [ ] Copied all config values to environment variables
