# SystemForge

A modern full-stack productivity web app that helps users transform vague goals into powerful, repeatable daily systems.

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query v5, wouter
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Session-based authentication using express-session + connect-pg-simple

## Key Features

- **Authentication** — Email/password signup, login, logout, protected routes, session persistence
- **Onboarding** — Multi-step onboarding wizard for new users
- **Goal Management** — Full CRUD with categories, priorities, statuses, deadlines
- **System Builder** — 7-step guided builder for creating habit systems (identity, trigger, action, reward, fallback)
- **Templates Library** — Pre-built system templates seeded in the database
- **Daily Check-ins** — Mark systems done/partial/missed, add notes, see fallback plans on missed days
- **Analytics** — 14-day charts, streak tracking, category breakdown, completion rate trends
- **Journal** — Daily reflection entries with prompt types, linked to goals/systems
- **Settings** — Profile, theme (light/dark/system), timezone

## Folder Structure

```
client/src/
├── components/
│   ├── app-sidebar.tsx     # Shadcn sidebar with navigation
│   ├── theme-provider.tsx  # Dark/light/system theme context
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── use-auth.ts         # Auth hook using TanStack Query
│   └── use-toast.ts
├── lib/
│   └── queryClient.ts      # TanStack Query client
├── pages/
│   ├── landing.tsx         # Public landing page
│   ├── login.tsx / signup.tsx / onboarding.tsx
│   ├── dashboard.tsx
│   ├── goals.tsx
│   ├── systems.tsx         # Systems list
│   ├── system-builder.tsx  # Multi-step system builder
│   ├── checkins.tsx
│   ├── analytics.tsx
│   ├── journal.tsx
│   └── settings.tsx
└── App.tsx                 # Router with protected/public route guards

server/
├── db.ts           # Drizzle + pg connection
├── routes.ts       # All API endpoints
├── storage.ts      # Database storage interface
└── index.ts        # Express server entry point

shared/
└── schema.ts       # Drizzle schema + types for all tables
```

## Database Schema

- `users` — id, email, password, name, avatarUrl, focusArea, preferredTheme, timezone, onboardingCompleted
- `goals` — id, userId, title, description, category, priority, status, deadline
- `systems` — id, goalId, userId, title, identityStatement, targetOutcome, triggerType, triggerStatement, minimumAction, rewardPlan, fallbackPlan, frequency, preferredTime, active
- `checkins` — id, systemId, userId, dateKey, status, note, moodBefore, moodAfter, difficulty
- `journal_entries` — id, userId, goalId?, systemId?, dateKey, promptType, content
- `templates` — id, title, category, description, identityStatement, triggerStatement, minimumAction, rewardPlan, fallbackPlan, isPublic

## Design System

Color palette: Deep indigo primary (HSL 258 84% 62%) with light/dark mode support. Gradient brand identity with clean productivity-focused layout.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — Secret key for session signing
