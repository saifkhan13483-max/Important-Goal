# SystemForge

A modern full-stack productivity web app that helps users transform vague goals into powerful, repeatable daily systems.

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query v5, wouter
- **Auth**: Firebase Auth (email/password)
- **Database**: Firestore (Firebase)
- **Image uploads**: Cloudinary (via `client/src/lib/cloudinary.ts`)
- **Dev server**: Minimal Express.js used only to host the Vite dev server and serve static files in production

## Key Features

- **Authentication** — Firebase Auth email/password signup, login, logout, protected routes
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

server/
├── index.ts    # Minimal Express server (Vite host only)
├── vite.ts     # Vite dev server middleware
└── static.ts   # Static file serving for production

firestore.rules   # Firestore security rules (deploy via Firebase CLI)
```

## Data Models (Firestore Collections)

- `users/{uid}` — profile, theme, timezone, onboardingCompleted
- `goals/{id}` — userId, title, category, priority, status, deadline
- `systems/{id}` — userId, goalId, title, identityStatement, triggerStatement, minimumAction, rewardPlan, fallbackPlan, frequency, active
- `checkins/{id}` — userId, systemId, dateKey, status, note, moodBefore, moodAfter, difficulty
- `journalEntries/{id}` — userId, goalId?, systemId?, dateKey, promptType, content

## Environment Variables

All are `VITE_` prefixed so they are available in the frontend via `import.meta.env.*`:

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

Rules are defined in `firestore.rules`. Deploy them with the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Rules ensure every user can only read and write their own documents.

## Design System

Color palette: Deep indigo primary (HSL 258 84% 62%) with light/dark mode support.
