# PostPilot

**Your AI-powered LinkedIn content partner.**

PostPilot is a web app that helps professionals brainstorm, draft, and schedule LinkedIn posts using AI. Pick your preferred AI provider, connect your LinkedIn account, and let PostPilot handle the heavy lifting so you can focus on building your professional brand.

**Live at [mypostpilot.app](https://www.mypostpilot.app)**

---

## What It Does

- **Brainstorm Ideas** — Generate content ideas tailored to your industry, expertise, and audience. Rate them as hot, warm, or cold and develop them when you're ready.
- **Draft Posts** — Turn ideas into polished LinkedIn posts with AI assistance. Chat with the AI to refine tone, add hooks, restructure, or improve your writing in real time.
- **Schedule & Publish** — Organize posts on a visual calendar, schedule them for specific dates, and share directly to LinkedIn when they're ready.
- **Your Voice, Your Brand** — PostPilot learns your background, writing style, and content pillars during onboarding so every post sounds like you, not a robot.

## Supported AI Providers

PostPilot works with your own API key from any of these providers:

| Provider | Models |
|----------|--------|
| **Anthropic** (Claude) | Opus 4.6, Sonnet 4.6, Haiku 4.5, and more |
| **OpenAI** | GPT-4.1, o3, o4-mini, GPT-4o, and more |
| **Google** (Gemini) | 2.5 Pro, 2.5 Flash, Flash Lite, and more |
| **Perplexity** (Sonar) | Deep Research, Reasoning Pro, Sonar Pro, and more |

You can switch providers and models at any time from Settings. API keys are encrypted with AES-256-GCM and only ever used server-side.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19, TypeScript) |
| **Styling** | Tailwind CSS v4, shadcn/ui components |
| **Database** | Supabase (PostgreSQL with Row-Level Security) |
| **Auth** | Supabase Auth with LinkedIn OAuth |
| **AI** | Anthropic SDK, OpenAI SDK (also used for Gemini & Perplexity) |
| **Deployment** | Vercel |

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, signup, OAuth callback
│   ├── (app)/           # Authenticated app shell
│   │   ├── dashboard/   # Stats, recent activity, quick actions
│   │   ├── ideas/       # Idea bank with AI brainstorming
│   │   ├── posts/       # Post editor with AI chat assistant
│   │   ├── calendar/    # Visual content calendar
│   │   ├── onboarding/  # Profile setup wizard
│   │   ├── profile/     # Background, expertise, writing style
│   │   ├── settings/    # AI provider config, theme, session
│   │   └── help/        # API key setup guides per provider
│   └── api/
│       ├── ai/          # Brainstorm, draft, chat, enhance, hashtags
│       ├── models/      # Available AI models endpoint
│       ├── settings/    # AI provider & key management
│       └── profile/     # Resume parsing
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Sidebar, TopBar, MobileNav
│   ├── ai/              # AI chat panel, message bubbles
│   ├── posts/           # Post editor, preview, sharing
│   ├── ideas/           # Idea cards, brainstorm UI
│   ├── calendar/        # Calendar grid, day view
│   ├── onboarding/      # Multi-step wizard components
│   └── landing/         # Landing page components
├── lib/
│   ├── supabase/        # Client, server, and middleware helpers
│   ├── ai/              # Provider configs, prompts, context builder
│   ├── encryption.ts    # AES-256-GCM for API key storage
│   └── constants.ts     # App-wide configuration
└── types/               # TypeScript type definitions
```

## Database

PostPilot uses Supabase PostgreSQL with Row-Level Security on every table — users can only access their own data.

| Table | Purpose |
|-------|---------|
| `creator_profiles` | User profile, expertise, writing preferences, encrypted AI keys |
| `ideas` | Content ideas with temperature ratings and status tracking |
| `posts` | Post content, status workflow (draft → review → scheduled → posted) |
| `post_versions` | Version history for every post edit |
| `ai_conversations` | Chat history with AI for each post or brainstorm session |

A `resumes` storage bucket handles PDF uploads during onboarding for profile context extraction.

## Key Features

- **Streaming AI responses** via Server-Sent Events for real-time writing
- **Auto-save** with 2-second debounce on the post editor
- **LinkedIn sharing** directly from the app via OAuth
- **Post lifecycle** — draft, review, schedule, publish, archive, or delete
- **Past-due detection** for scheduled posts that missed their window
- **Dark mode** support throughout the authenticated app
- **Responsive** sidebar navigation with mobile sheet drawer
- **In-app help center** with step-by-step API key guides for each provider

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the database tables listed above
- A LinkedIn OAuth app (for authentication)
- An API key from at least one supported AI provider

### Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ENCRYPTION_KEY=64-character-hex-string-for-aes-256-gcm
```

> **Note:** AI provider API keys are entered by each user through the app's Settings page and stored encrypted in the database. They are not environment variables.

### Install & Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm start
```

## Current Status

**Beta** — Core features are complete and the app is deployed for testing at [mypostpilot.app](https://www.mypostpilot.app). Authentication is LinkedIn-only by design, since the app's primary value is creating and publishing LinkedIn content.

## License

All rights reserved.
