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
- **System Builder** — 7-step guided builder with beginner-friendly language: Identity → Outcome → Trigger → Minimum Action → Reward → Backup Plan → Review
- **Templates Library** — 9 prebuilt templates with Firestore seeding + category filters + preview dialog
- **Pricing Page** — `/pricing` page with 4 plans (Free, Starter, Pro, Team/Coach), comparison table, FAQ, monthly/yearly toggle

## Recent Design Changes (v3 Full UX Redesign)

### Landing Page
- Premium hero with gradient headline ("Most people set goals. Few build systems.")
- Live product preview mockup embedded in the hero (mock browser + dashboard UI)
- Social proof stats strip (12,000+ users, 4.9★ rating, 47-day avg streak)
- Problem section with "Sound familiar?" relatable framing
- Goal → System transformation example side-by-side
- How it works 3-step section with dashed timeline
- Template preview grid with Beginner badges
- Compassionate design section (backup plans, recovery mode, gentle language)
- Beginner reassurance 4-point grid
- Testimonials with star ratings
- Pricing section with monthly/yearly toggle and 4 plans (Free, Starter, Pro, Team)
- Interactive FAQ accordion
- Final gradient CTA banner

### Dashboard
- Gradient greeting banner with date, dynamic message, and live progress bar
- Recovery mode banner when habits were missed yesterday
- Daily tip-of-the-day (educational habit science tips)
- Improved metric cards (Active Goals, My Systems, Today's Progress, Best Streak)
- Better empty states with guided next-step nudges
- Quick check-in row — Done / Partial / Missed buttons inline
- 7-day completion bar chart with legend and weekly average
- Active streaks list with progress bars
- Suggested next step card (changes based on context)
- Recent activity feed (combined check-ins + journal entries)
- Quick action buttons at bottom

### Analytics
- Text-based AI-style insight cards at the top (e.g. "Your longest streak is 12 days on 'Morning Movement'. That's real consistency.")
- Insight cards cover: streak milestones, avg completion rate, most consistent system, most missed system, total check-ins milestones
- Fixed React hooks ordering (all useMemo calls before conditional returns)

### Journal
- Replaced modal-only form with inline writing experience
- Entry type pill selector (6 types with emojis)
- Prominent prompt display with lightbulb icon
- Jump-start sentence starter chips (click to insert into textarea)
- Word count display in corner of textarea
- Collapsible "Link to a goal" section
- Expanded/collapsed long entries with "Read more" toggle
- Better date grouping headers with "Today" highlight
- Entry cards with per-type emoji + color-coded badges

### Systems Page
- Separate sections for Active vs Paused systems
- Per-card status dot with ring indicator
- Identity statement shown as blockquote with left border
- Trigger and minimum action styled as labeled info boxes
- "What's a system?" explainer shown for new users
- Nudge to build more when under 5 active systems

### Sidebar
- Today's completion progress bar in the header
- "Done/Total" badge on Today's Progress nav item
- "Quick Add" section with dropdown for New System / New Goal / New Journal Entry

### Settings
- Icon-labeled section cards with descriptions
- Profile section shows avatar preview with initials
- Appearance section improved with theme descriptions
- Notifications section (coming soon) with placeholders
- Data & Privacy section
- Help & Resources section with quick links
- Account section with plan status + upgrade nudge + sign out

### Goals Page
- Already polished — maintained existing card design with search/filter

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

## Theme System

ThemeProvider reads from and writes to the Zustand store (`useAppStore.theme`), which is persisted via `zustand/persist`. This creates a single source of truth:
- On login, `use-auth.ts` syncs `user.preferredTheme` from Firestore into the store
- During onboarding theme selection, the theme is applied immediately for a live preview
- The header toggle and settings page both update the same Zustand store value

## Design System

Color palette: Deep indigo primary (HSL 258 84% 62%) with light/dark mode support.
