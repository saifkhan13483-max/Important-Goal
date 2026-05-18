<div align="center">

# SaifCraft

### Portfolio & Freelance Development Site

**[Live Site](https://portfolio-wheat-iota-47.vercel.app/) · [Portfolio](https://portfolio-wheat-iota-47.vercel.app/portfolio) · [Services](https://portfolio-wheat-iota-47.vercel.app/services) · [Contact](https://portfolio-wheat-iota-47.vercel.app/contact)**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

</div>

---

## Overview

SaifCraft is the professional portfolio and freelance services site of **Saif Khan**, a senior fullstack developer. It showcases past work, lists available services with fixed-scope pricing, captures client inquiries via a validated contact form, and includes an AI-powered chatbot for instant answers — all backed by Firebase and deployed on Vercel.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Admin Dashboard](#admin-dashboard)
- [AI Chatbot](#ai-chatbot)
- [SEO & Performance](#seo--performance)
- [Deployment](#deployment)
- [Author](#author)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| **Portfolio Gallery** | Filterable project showcase with full case study detail pages |
| **Services & Pricing** | Fixed-scope packages with clear pricing, timelines, and feature breakdowns |
| **AI Chatbot** | Groq-powered floating assistant — answers questions about services, pricing, and delivery |
| **Contact Form** | Zod-validated lead form that saves inquiries directly to Firestore |
| **Client Profile** | Authenticated clients can review all their submitted inquiries at `/profile` |
| **Admin Dashboard** | Secure admin area for managing projects, services, and incoming orders |
| **Image Uploads** | Direct Cloudinary integration for portfolio asset management |
| **Dark Mode** | System-preference aware with localStorage persistence |
| **Error Boundary** | React error boundary catches unexpected crashes and shows a friendly fallback |
| **SEO Ready** | Meta tags, Open Graph, Twitter Card, JSON-LD Person schema, sitemap, robots.txt |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 7 |
| **Styling** | Tailwind CSS v3, shadcn/ui (Radix UI), Framer Motion |
| **Routing** | wouter |
| **Data Fetching** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod |
| **Authentication** | Firebase Authentication (Email/Password + Google) |
| **Database** | Firebase Firestore |
| **AI Chatbot** | Groq API — llama models, multi-key rotation, model fallback |
| **Media** | Cloudinary (unsigned upload preset) |
| **Deployment** | Vercel (SPA + serverless function) |

---

## Project Structure

```
saifcraft/
├── api/
│   └── chat.ts                    # Vercel serverless function — Groq API proxy
│
├── client/
│   ├── index.html                 # HTML shell — meta tags, OG, JSON-LD schema
│   ├── public/
│   │   ├── logo.png               # Favicon
│   │   ├── logo-light.png         # Light mode logo
│   │   ├── logo-dark.png          # Dark mode logo
│   │   ├── favicon.png            # Browser tab icon
│   │   ├── robots.txt             # Search engine crawl rules
│   │   ├── sitemap.xml            # Public page URLs for indexing
│   │   └── 404.html               # SPA fallback for Vercel routing
│   │
│   └── src/
│       ├── App.tsx                # Root router — public + admin branches
│       ├── main.tsx               # Entry point, wrapped in ErrorBoundary
│       ├── index.css              # Global styles & CSS custom properties
│       │
│       ├── components/
│       │   ├── ErrorBoundary.tsx  # React error boundary (crash fallback)
│       │   ├── Header.tsx         # Navigation bar with auth menu & dark mode toggle
│       │   ├── Footer.tsx         # Site footer with links and social icons
│       │   ├── Hero.tsx           # Home page hero section
│       │   ├── ChatBot.tsx        # Floating AI chatbot widget
│       │   ├── ContactForm.tsx    # Reusable contact / lead capture form
│       │   ├── ProjectCard.tsx    # Portfolio project card component
│       │   ├── ProjectsGallery.tsx# Filterable portfolio grid
│       │   ├── ServiceCard.tsx    # Service package card
│       │   ├── ServicesSection.tsx# Services overview section
│       │   ├── AdminProtectedRoute.tsx # Auth guard for admin routes
│       │   └── ui/                # shadcn/ui component library
│       │
│       ├── context/
│       │   └── AuthContext.tsx    # Firebase auth state provider
│       │
│       ├── hooks/
│       │   ├── use-dark-mode.ts   # Dark mode state hook
│       │   ├── use-image-upload.ts# Cloudinary upload hook
│       │   ├── use-mobile.tsx     # Mobile breakpoint hook
│       │   ├── use-orders.ts      # Firestore orders hook
│       │   ├── use-projects.ts    # Firestore projects hook
│       │   ├── use-services.ts    # Firestore services hook
│       │   └── use-toast.ts       # Toast notification hook
│       │
│       ├── lib/
│       │   ├── firebase/
│       │   │   ├── config.ts      # Firebase app initialisation
│       │   │   ├── auth.ts        # signIn, signOut, isAdmin helpers
│       │   │   └── firestore.ts   # Firestore CRUD + local service fallbacks
│       │   ├── ai.ts              # Groq chatbot logic + site knowledge base
│       │   ├── cloudinary.ts      # Cloudinary upload helper
│       │   ├── queryClient.ts     # TanStack React Query client setup
│       │   └── utils.ts           # Utility functions (cn, etc.)
│       │
│       ├── pages/
│       │   ├── Home.tsx           # Landing page
│       │   ├── Services.tsx       # Services & pricing
│       │   ├── Portfolio.tsx      # Portfolio gallery (filterable)
│       │   ├── ProjectDetail.tsx  # Individual project case study
│       │   ├── About.tsx          # About Saif Khan
│       │   ├── Contact.tsx        # Contact / hire page
│       │   ├── FAQ.tsx            # Frequently asked questions
│       │   ├── ClientProfile.tsx  # Client inquiry history (/profile)
│       │   ├── PrivacyPolicy.tsx  # Privacy policy
│       │   ├── TermsOfService.tsx # Terms of service
│       │   ├── not-found.tsx      # 404 page
│       │   └── admin/
│       │       ├── Login.tsx      # Admin login
│       │       ├── AdminLayout.tsx# Admin shell layout
│       │       ├── Dashboard.tsx  # Admin overview
│       │       ├── Orders.tsx     # Manage incoming orders
│       │       ├── Projects.tsx   # Manage portfolio projects
│       │       └── Services.tsx   # Manage service packages
│       │
│       └── types/
│           └── index.ts           # Project, Service, Order TypeScript interfaces
│
├── firestore.rules                # Firestore security rules
├── vercel.json                    # Vercel deploy config
├── vite.config.ts                 # Vite config — port 5000, code splitting, dev proxy
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── components.json                # shadcn/ui configuration
└── .env.example                   # Environment variables template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with Firestore and Authentication enabled
- A [Cloudinary](https://cloudinary.com/) account with an unsigned upload preset
- A [Groq](https://console.groq.com/) API key (free tier available)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on **port 5000**. The `/api/chat` endpoint is handled by a Vite middleware in dev, and by `api/chat.ts` as a Vercel serverless function in production.

### Build

```bash
npm run build
```

Output is written to `dist/public`.

### Type Check

```bash
npm run check
```

---

## Environment Variables

Copy `.env.example` to `.env` (local) or add the values via Replit Secrets / Vercel Project Settings.

```env
# Firebase — VITE_ prefix makes these available in the client bundle
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Admin whitelist — comma-separated email addresses
VITE_ADMIN_EMAILS=

# Cloudinary — unsigned upload, no server secret required
VITE_CLOUDINARY_CLOUD_NAME=

# Groq — server-side ONLY, never prefix with VITE_
GROQ_API_KEY=
```

> **Important:** `GROQ_API_KEY` and siblings are server-only secrets. `VITE_*` variables are embedded into the client bundle at build time — never store secrets in them.

---

## Architecture

```
Browser
  │
  ├── /api/chat (POST)
  │     ├── [dev]  Vite middleware in vite.config.ts
  │     └── [prod] Vercel serverless function → api/chat.ts → Groq API
  │
  └── All other routes → React SPA (wouter client-side routing)
        ├── Firebase Auth — admin authentication
        ├── Firestore — projects, services, orders, users collections
        └── Cloudinary — image uploads (unsigned preset, no server secret)
```

**Key decisions:**
- **No separate Express server** — all server logic lives in either the Vite middleware (dev) or Vercel serverless functions (prod)
- **Dual API layer** — `/api/chat` is transparent across environments with zero config changes
- **Groq multi-key rotation** — on a 429 rate-limit, the proxy automatically advances to the next key and retries all 3 llama models before giving up
- **Firebase local fallbacks** — services return pre-defined data if Firestore is empty or unreachable
- **Admin routes fully isolated** — public `Header`/`Footer` are never rendered under `/admin/*`; a separate router branch handles the admin shell

---

## Admin Dashboard

The admin area is accessible at `/admin`. Access requires:
- Email listed in `VITE_ADMIN_EMAILS`, **or**
- `role: "admin"` set on the user's document in the Firestore `users` collection

**Capabilities:**
- View, filter, and manage incoming client orders in real time (Firestore live subscription)
- Create, edit, and delete portfolio projects with image upload via Cloudinary
- Manage service packages, pricing, and feature lists

---

## AI Chatbot

The floating chatbot widget (`ChatBot.tsx`) is powered by Groq and uses a hand-crafted site knowledge base defined in `client/src/lib/ai.ts`. It answers questions about:

- Service pricing and what is included
- Typical delivery timelines
- Technology stack and past projects
- How to place an order or get in touch

**Reliability features:**
- Cycles through up to 5 Groq API keys on rate-limit (HTTP 429)
- Falls back across 3 llama models per key before returning an error
- Returns a graceful error message to the user if all keys are exhausted

---

## SEO & Performance

| Item | Implementation |
|---|---|
| Title & description | Set per page via `document.title` and meta tag updates in `useEffect` |
| Open Graph | Configured in `client/index.html` |
| Twitter Card | Configured in `client/index.html` |
| JSON-LD schema | `Person` schema for Saif Khan in `client/index.html` |
| Canonical URL | `<link rel="canonical">` in `client/index.html` |
| Sitemap | `client/public/sitemap.xml` — all 8 public pages |
| Robots | `client/public/robots.txt` — allow all, reference sitemap |
| Code splitting | Vendor chunks for React, Firebase, Framer Motion, Radix UI, icons |
| Font loading | Preconnect + `display=swap` for zero layout shift |

---

## Deployment

This project is configured for **Vercel** with zero additional setup beyond environment variables.

1. Import the repository into Vercel
2. Add all environment variables in **Project Settings → Environment Variables**
3. Deploy — Vercel automatically routes `/api/chat` to the serverless function and all other paths to the SPA

The `vercel.json` handles:
- `/api/chat` → `api/chat.ts` serverless function
- All other routes → `dist/public/index.html` (SPA fallback)

---

## Author

**Saif Khan** — Senior Fullstack Developer

- Website: [portfolio-wheat-iota-47.vercel.app](https://portfolio-wheat-iota-47.vercel.app/)
- GitHub: [@saifkhan-dev](https://github.com/saifkhan-dev)
- LinkedIn: [linkedin.com/in/saifkhan](https://linkedin.com/in/saifkhan)
- Twitter: [@saifbuilds](https://twitter.com/saifbuilds)
- Email: contact@saifcraft.com

---

## License

This project is private and proprietary. All rights reserved — Saif Khan / SaifCraft.
Unauthorised copying, distribution, or use of any part of this codebase is prohibited.
