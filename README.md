# Aasra

A calm, grief-first web app that helps bereaved families in India claim a loved one's assets — bank accounts, insurance, EPF, shares and property — through one guided journey.

> Technology does the reading, writing, translating and reminding. Lawyers do the deciding.

"Aasra" is a working name. Change it in `src/lib/config.ts`.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you have. **All of them are optional**: anything missing switches that part of the app to demo mode.

| Variable | What it's for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key |
| `ANTHROPIC_API_KEY` | Claude API key. Server-side only, never sent to the browser |
| `ANTHROPIC_MODEL_FAST` | Optional. Defaults to `claude-haiku-5-5` |
| `ANTHROPIC_MODEL_SMART` | Optional. Defaults to `claude-sonnet-5-5`, used only for document drafts |

Restart `npm run dev` after changing `.env.local`.

## Demo mode vs real keys

| | Demo mode (no keys) | With keys |
| --- | --- | --- |
| Data | Fictional sample families, saved in the browser | Saved in Supabase |
| Login | "Continue as demo" | Phone number + OTP (needs an SMS provider set up in Supabase) |
| AI features | Pre-written sample answers | Live Claude responses |

A small banner at the top of the page shows when demo mode is on.

## Build progress

- [x] Stage 1: Setup, calm design system, landing page, footer, demo-mode detection
- [ ] Stage 2: Data models, sample families, login
- [ ] Stage 3: Intake wizard with autosave
- [ ] Stage 4: AI document reading
- [ ] Stage 5: Heir result and checklist
- [ ] Stage 6: Hidden Asset Finder
- [ ] Stage 7: Case tracker and payment stub
- [ ] Stage 8: Chat assistant and document drafts
- [ ] Stage 9: Hardening and demo polish

## Project layout

```
src/
  app/            Pages (each folder = a URL) and API routes (app/api/...)
  components/ui/  Shared building blocks: Button, Card, Container, FadeIn
  components/layout/  Header, footer, demo banner
  lib/            Settings (config.ts) and environment checks (env.ts)
```

## Deploying

The app is ready for Vercel. Import the repo, add the same environment variables in Vercel's project settings, and deploy.

---

We are a technology and service platform, not a law firm. Nothing in this app is legal advice.
