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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key. These two also switch on email login — see **Supabase setup** below |
| `ANTHROPIC_API_KEY` | Claude API key. Server-side only, never sent to the browser |
| `ANTHROPIC_MODEL_FAST` | Optional. Defaults to `claude-haiku-5-5` |
| `ANTHROPIC_MODEL_SMART` | Optional. Defaults to `claude-sonnet-5-5`, used only for document drafts |

Restart `npm run dev` after changing `.env.local`.

## Demo mode vs real keys

| | Demo mode (no keys) | With keys |
| --- | --- | --- |
| Data | Fictional sample families, saved in the browser | Saved in Supabase |
| Login | "Carry on without an account", or "Continue as a demo family" | Email + password, or either of the account-free choices |
| Lawyer panel | Five clearly-labelled sample lawyers | The `lawyers` table (falls back to the samples while it is empty) |
| Consultation requests | Opens WhatsApp with the lawyer's name filled in | A row in `consultations`, with WhatsApp as the fallback |
| AI features | Pre-written sample answers | Live Claude responses |

A small banner at the top of the page shows when demo mode is on.

## Supabase setup

A few steps, in this order. Everything still works without them — this is what turns the database and accounts on.

**1. The tables.** Dashboard → SQL Editor → New query → paste all of `supabase/schema.sql` → Run. Safe to run again at any time; it will not delete data. You should end up with `assets`, `cases`, `consultations`, `documents`, `heirs`, `lawyers`, `profiles` and `tasks`, each with a shield icon meaning Row Level Security is on.

**2. Email + password login.** Dashboard → Authentication → Sign In / Providers:

- Turn **Email** on.
- Turn **"Confirm email" OFF.** This is the one that matters. With it on, signing up creates the account but gives back no session, so the person is not logged in until they open an email and click a link — which means login depends on email delivery after all. With it off, creating an account logs you straight in and no email is ever sent. The app handles both (it says plainly when a confirmation is pending), but off is what you want.
- Optional: turn **Anonymous sign-ins** on as well. The app prefers a real account and only falls back to this, which lets somebody who has not signed up still have their case saved in the database rather than only on their device.

Nothing here needs an SMTP server, a template or `{{ .Token }}`. If you later turn confirmations back on, Supabase's own default email is enough.

**3. Nothing to do for `profiles`.** The table is created by step 1 and the app upserts a row after every sign-up and log-in. If the upsert fails for any reason, login still works — the row is our bookkeeping, not a gate.

**4. The lawyer panel.** The `lawyers` table starts empty, and an empty table makes `/lawyers` fall back to its five sample lawyers. Add real rows in Table Editor → `lawyers` → Insert row. `languages` is a text array, so enter it as `{Marathi,Hindi,English}`. Prices are whole rupees — leave one blank and the card says "On request" rather than ₹0.

Nothing in the app can write to `lawyers`: there is no insert or update policy, deliberately. Rows go in through the dashboard, or from a server holding the service-role key.

## Build progress

- [x] Stage 1: Setup, calm design system, landing page, footer, demo-mode detection
- [x] Stage 2: Data models, sample families, login (email + password)
- [x] Stage 3: Intake wizard with autosave
- [x] Stage 4: AI document reading
- [x] Stage 5: Heir result and checklist, per faith
- [x] Stage 6: Hidden Asset Finder (RBI UDGAM, IEPF, EPFO, IRDAI, MCA, Udyam)
- [ ] Stage 7: Case tracker and payment stub — tracker done, payment still a stub
- [x] Stage 8: Chat assistant, on every page
- [ ] Stage 9: Hardening and demo polish

Also done: a `/lawyers` panel with prices and consultation requests, and
`/law` — "what the law says for your family" — reachable straight from
the landing page.

Still outstanding, and worth knowing about:

- **The WhatsApp number in `src/lib/config.ts` is a placeholder.** Every
  WhatsApp fallback in the app points at a number that does not exist.
  Search the project for `REPLACE BEFORE LAUNCH`.
- **Payments.** Consultation prices are shown but nothing is charged.
  `consultations` records the ask; there is no payment step.
- **Document drafts.** Reading a document works; generating one does not.

## Project layout

```
src/
  app/            Pages (each folder = a URL) and API routes (app/api/...)
  components/ui/  Shared building blocks: Button, Card, Container, FadeIn
  components/layout/  Header, footer, demo banner, the shared step page
  lib/            Settings (config.ts) and environment checks (env.ts)
```

A few files carry more weight than their size suggests:

| File | Why it matters |
| --- | --- |
| `lib/journey.ts` | The order of the whole flow, and every intake question. Add a stage here and the Back/Continue buttons either side of it update themselves. |
| `lib/caseStore.ts` | Every save and read. Writes to the device first, then the database, so no save can show a family an error. |
| `lib/auth.ts` | Who is signed in. Logging out, or a second account logging in, clears the answers kept on this device. |
| `lib/heirs/engine.ts` | Succession law, per faith. A pure function, and deliberately never confident about Muslim personal law shares. |
| `lib/registries.ts` | The official portals. Read the comment at the top before adding a link. |
| `lib/demo.ts` | Every piece of made-up data in the app, in one file, so no page can grow its own. |

## Deploying

The app is ready for Vercel. Import the repo, add the same environment variables in Vercel's project settings, and deploy.

---

We are a technology and service platform, not a law firm. Nothing in this app is legal advice.
