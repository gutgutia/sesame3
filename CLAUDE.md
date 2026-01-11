# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sesame3 is a college admissions preparation app targeting high school students. It helps students track their profile (academics, activities, awards), manage school lists, set goals, and get AI-powered advising. The product philosophy is "college prep without the panic."

## Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production (runs prisma generate first)
npm run lint         # Run ESLint

# Database (Prisma + Supabase)
npm run db:push      # Push schema to database (uses .env.local)
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio GUI

# Seeding
npm run db:seed-all      # Seed all data
npm run db:seed-schools  # Seed schools only
npm run db:seed-programs # Seed summer programs only
npm run db:seed-users    # Seed test users

# Testing
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Unit tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright)
npm run test:e2e:ui  # E2E with Playwright UI
npm run test:uat     # User acceptance tests
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **Auth**: Custom email OTP (session stored in `sesame_session` cookie)
- **Styling**: Tailwind CSS v4
- **Fonts**: Inter, JetBrains Mono, Satoshi
- **AI**: Multi-model (Claude, GPT, Gemini, Kimi K2 via Groq)
- **Payments**: Stripe (2 tiers: Free, Premium $25/mo or $250/year)
- **Email**: Resend for transactional emails
- **Testing**: Playwright (E2E), Vitest (unit)

## Architecture

### Route Structure

```
app/
├── (app)/              # Authenticated routes (wrapped in AppLayout)
│   ├── dashboard/      # Home dashboard
│   ├── advisor/        # AI chat advisor
│   ├── profile/        # Student profile with sub-routes:
│   │   ├── about-me/
│   │   ├── testing/
│   │   ├── courses/
│   │   ├── activities/
│   │   ├── awards/
│   │   └── programs/
│   ├── schools/        # School list management
│   ├── chances/        # Admission chances calculator
│   ├── plan/           # Goals & planning
│   ├── discover/       # School discovery
│   ├── opportunities/  # Summer programs
│   ├── recommendations/# AI recommendations
│   └── settings/       # User settings
├── (marketing)/        # Public marketing pages (no sidebar)
│   ├── page.tsx        # Landing page
│   ├── about/
│   ├── privacy/
│   └── terms/
├── (admin)/            # Admin panel
│   └── admin/
│       ├── programs/
│       └── schools/
├── auth/               # Auth pages
├── login/              # Login page
├── onboarding/         # New user onboarding
├── invite/[token]/     # Invitation acceptance flow
└── api/                # API routes (77 files, 121 endpoints)
```

### Key Directories

```
lib/
├── db.ts               # Prisma client singleton
├── auth.ts             # Auth helpers (getCurrentUser, requireProfile)
├── ai/                 # AI integration
│   ├── providers.ts    # Model configuration & tier selection
│   ├── tools.ts        # Tool schemas for AI
│   ├── tool-handlers.ts# Tool execution
│   ├── prompts.ts      # Prompt templates
│   └── context/        # Context assembly for advisor
├── supabase/           # Supabase client setup
├── chances/            # Admission probability calculations
├── recommendations/    # Recommendation engine with agents
├── email/              # Resend email + templates
├── subscription/       # Billing plans
└── context/            # React context providers

components/
├── layout/             # AppLayout, Sidebar, BottomNav
├── dashboard/          # Dashboard widgets
├── chat/               # AI chat components
├── profile/            # Profile editing forms
├── schools/            # School management
├── plan/               # Goal/task components
├── subscription/       # Billing UI
├── ui/                 # Reusable primitives (Button, Card, Modal, etc.)
└── marketing/          # Landing page sections
```

### Auth Flow

Authentication uses custom email OTP (not Supabase Auth):
1. User enters email → `POST /api/auth/send-code` sends OTP via Resend
2. User enters code → `POST /api/auth/verify-code` validates and sets session
3. Session stored in `sesame_session` cookie (base64 encoded JSON)
4. Middleware (`middleware.ts`) validates session on protected routes
5. API routes use `requireProfile()` from `lib/auth.ts` for authentication

Protected routes: `/dashboard`, `/plan`, `/profile`, `/schools`, `/discover`, `/advisor`, `/chances`, `/opportunities`, `/recommendations`, `/settings`

### AI Architecture

**Dual-Model System:**
- **Parser** (Kimi K2 via Groq, ~50ms): Fast intent detection, extracts user intent
- **Advisor** (tier-based Claude): Quality responses with context

**Tier-Based Model Selection (Two-tier system):**
- Free: Kimi K2 only (20 messages/day, 3 schools for chances, no recommendations)
- Premium ($25/mo or $250/year): Kimi K2 (parser) + Claude Opus (counselor), unlimited

**Key Files:**
- `lib/ai/providers.ts` - Model configuration
- `lib/ai/tools.ts` - Tool definitions (profile updates, school additions, etc.)
- `lib/ai/context/assembler.ts` - Builds context for advisor
- `app/api/chat/route.ts` - Main chat endpoint

**Available Tools:** Profile updates, school list management, goal creation, recommendation retrieval

### Database Schema

The Prisma schema (`prisma/schema.prisma`) is organized into 7 layers:

1. **Identity & Auth**: `User`, `AuthCode`
2. **Student Profile**: `StudentProfile`, `AboutMe`, `StoryEntry`, `Academics`, `Course`, `Testing`, `SATScore`, `ACTScore`, `APScore`, `Activity`, `Award`, `Program`
3. **Schools & Planning**: `School`, `SchoolDeadlineYear`, `SummerProgram`, `SummerProgramSession`, `StudentSchool`, `StudentSummerProgram`, `SchoolNote`, `Goal`, `Task`, `TaskTemplate`
4. **AI & Conversations**: `Conversation`, `Message`, `StudentContext`
5. **Access Control**: `AccessGrant`, `Invitation`, `Organization`, `OrganizationMember`
6. **Usage & Billing**: `UsageRecord`, `GlobalConfig`
7. **Recommendations**: `RecommendationPreferences`, `Recommendation`, `DataRequest`

### API Routes Overview

Major endpoint groups:
- `/api/auth/*` - Authentication (send-code, verify-code, logout)
- `/api/profile/*` - Profile CRUD (about-me, academics, testing, courses, activities, awards, programs, stories, schools)
- `/api/chat` - Main AI chat endpoint
- `/api/schools/*` - School search and details
- `/api/opportunities/*` - Summer programs
- `/api/plan/*` - Goals, tasks, timeline
- `/api/chances` - Admission probability calculation
- `/api/recommendations/*` - AI recommendations
- `/api/subscription/*` - Billing management
- `/api/stripe/*` - Stripe webhooks
- `/api/admin/*` - Admin operations

## Environment Variables

Required in `.env` and `.env.local`:

```bash
# Database
DATABASE_URL=           # Supabase pooler (port 6543, ?pgbouncer=true)
DIRECT_URL=             # Supabase direct (port 5432, for migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI Providers
ANTHROPIC_API_KEY=      # Claude models
GROQ_API_KEY=           # Kimi K2 parser
OPENAI_API_KEY=         # GPT models (optional)
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini (optional)

# Services
RESEND_API_KEY=         # Email
STRIPE_SECRET_KEY=      # Payments
STRIPE_WEBHOOK_SECRET=  # Stripe webhooks
```

## Testing

**Unit Tests** (`__tests__/`): API endpoint tests, library function tests
```bash
npm run test            # Run once
npm run test:watch      # Watch mode
```

**E2E Tests** (`e2e/tests/`):
- `auth.spec.ts` - Login/logout
- `navigation.spec.ts` - Sidebar navigation
- `profile.spec.ts` - Profile editing
- `schools.spec.ts` - School list
- `advisor.spec.ts` - Chat functionality
- `uat-student-journeys.spec.ts` - Full user journeys

```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # With Playwright UI
```

## Key Patterns

- **API Authentication**: All protected routes use `requireProfile()` which returns user and profile or throws 401
- **Database Access**: Always use `prisma` from `lib/db.ts` (singleton prevents connection issues)
- **Component Style**: Use `"use client"` directive for interactive components, Tailwind for styling
- **Error Handling**: API routes return `NextResponse.json()` with appropriate status codes
- **State Management**: React Context (`ProfileContext`) for global user state, no Redux
