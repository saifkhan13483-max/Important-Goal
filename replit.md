# SystemForge

A modern productivity web app that helps users transform vague goals into powerful, repeatable daily systems. Fully frontend-only — no backend server required.

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query v5, wouter
- **Auth**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firestore (Firebase) — all data reads/writes happen client-side via Firebase SDK
- **Image uploads**: Cloudinary (via `client/src/lib/cloudinary.ts`) — optional
- **Dev server**: Vite dev server only (`npx vite --port 5000 --host 0.0.0.0`)
- **Production**: Static build output in `dist/` served as a static site

## Running the App

```bash
# Development
npm run dev   # runs vite on port 5000

# Production build
npm run build   # outputs to dist/
```

## Key Features

- **Authentication** — Firebase Auth email/password + Google OAuth, protected routes
- **Onboarding** — Multi-step onboarding wizard for new users
- **Goal Management** — Full CRUD with categories, priorities, statuses, deadlines
- **System Builder** — 7-step guided builder for creating habit systems
- **Templates Library** — Static pre-built system templates (no DB fetch required)
- **Daily Check-ins** — Mark systems done/partial/missed, add notes
- **Analytics** — 14-day charts, streak tracking, category breakdown (all client-side computed)
- **Journal** — Daily reflection entries linked to goals/systems
- **Settings** — Profile, theme (light/dark/system), timezone

## Folder Structure

```
client/src/
├── components/
│   ├── app-sidebar.tsx     # Shadcn sidebar with navigation
│   ├── theme-provider.tsx  # Dark/light/system theme context
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── use-auth.ts         # Firebase Auth hook using TanStack Query
│   └── use-toast.ts
├── lib/
│   ├── firebase.ts         # Firebase app + auth + firestore init
│   ├── cloudinary.ts       # Cloudinary image upload helper
│   └── queryClient.ts      # TanStack Query client
├── pages/                  # All page components
├── services/               # Firebase/Firestore service functions
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── goals.service.ts
│   ├── systems.service.ts
│   ├── checkins.service.ts
│   ├── journal.service.ts
│   ├── analytics.service.ts  # Client-side computed analytics
│   └── templates.service.ts  # Static template data
└── types/
    └── schema.ts           # Plain TypeScript interfaces for all entities

script/
└── build.ts    # Vite-only build script (frontend only, no server)

firestore.rules   # Firestore security rules (deploy via Firebase CLI)
```

## Data Models (Firestore Collections)

- `users/{uid}` — profile, theme, timezone, onboardingCompleted
- `goals/{id}` — userId, title, category, priority, status, deadline
- `systems/{id}` — userId, goalId, title, identityStatement, triggerStatement, minimumAction, rewardPlan, fallbackPlan, frequency, active
- `checkins/{id}` — userId, systemId, dateKey, status, note, moodBefore, moodAfter, difficulty
- `journalEntries/{id}` — userId, goalId?, systemId?, dateKey, promptType, content

## Environment Variables

All are `VITE_` prefixed (safe for frontend use via `import.meta.env.*`):

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (optional, for avatar uploads) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset (optional) |

## Firestore Security Rules

Rules are defined in `firestore.rules`. Deploy with the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Rules ensure every user can only read and write their own documents.

## Design System

Color palette: Deep indigo primary (HSL 258 84% 62%) with light/dark mode support.
