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

**3. Re-run the whole file after any update.** It is idempotent, and
the payment columns on `consultations` (`payment_status`, `amount_inr`,
`razorpay_order_id`, `razorpay_payment_id`, `paid_at`) are added by
`add column if not exists` statements near the top. The `status` and
`payment_status` check constraints are dropped and re-added, so running
it again updates the rules rather than failing.

**4. Nothing to do for `profiles`.** The table is created by step 1 and the app upserts a row after every sign-up and log-in. If the upsert fails for any reason, login still works — the row is our bookkeeping, not a gate.

**5. The lawyer panel.** The `lawyers` table starts empty, and an empty table makes `/lawyers` fall back to its five sample lawyers. Add real rows in Table Editor → `lawyers` → Insert row. `languages` is a text array, so enter it as `{Marathi,Hindi,English}`. Prices are whole rupees — leave one blank and the card says "On request" rather than ₹0.

Nothing in the app can write to `lawyers`: there is no insert or update policy, deliberately. Rows go in through the dashboard, or from a server holding the service-role key.

## Razorpay (consultation payments)

Optional. Without it the payment step still works as a clearly labelled
test payment, so the app demos end to end with nothing configured.

**1. Get test keys.** Razorpay dashboard, with the **Test mode** switch
on, then Settings, then API Keys. A test key id starts `rzp_test_`.
Nothing in test mode moves real money.

**2. Put them in `.env.local`:**

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

The secret has no `NEXT_PUBLIC_` prefix, so it never reaches a browser.
It is the only thing that can verify a payment. The key id appears
twice on purpose: once for the server, once for the checkout widget.

**3. Pay with a test card.** Razorpay's test cards are in their docs;
`4111 1111 1111 1111` with any future expiry and any CVV works.

### What the code will not do

- **The browser cannot say what it owes.** `/api/payments/create-order`
  takes a lawyer id and reads the fee server-side. Sending an amount
  with the request has no effect.
- **Only the server can mark a payment paid**, and only when an HMAC of
  `<order_id>|<payment_id>` keyed with the secret verifies. Compared
  with `timingSafeEqual`, not `===`.
- **The test path cannot be requested by a browser.** It is reachable
  only when the server itself has no keys. Once real keys are set,
  `{"demo": true}` is refused.

Optionally set `SUPABASE_SERVICE_ROLE_KEY` as well. The verification
route then writes the paid flag with that key, which bypasses Row Level
Security and closes the one remaining gap: without it, a determined
person could set `payment_status` on their own consultation row
directly through Supabase. The blast radius is one unpaid request that
a human reviews before any lawyer is booked.

## Build progress

- [x] Stage 1: Setup, calm design system, landing page, footer, demo-mode detection
- [x] Stage 2: Data models, sample families, login (email + password)
- [x] Stage 3: Intake wizard with autosave
- [x] Stage 4: AI document reading
- [x] Stage 5: Heir result and checklist, per faith
- [x] Stage 6: Hidden Asset Finder (RBI UDGAM, IEPF, EPFO, IRDAI, MCA, Udyam)
- [x] Stage 7: Case tracker and payment (Razorpay, test mode)
- [x] Stage 8: Chat assistant, on every page
- [x] Stage 9: Hardening and demo polish

Also done: a `/lawyers` panel with prices and consultation requests, and
`/law` — "what the law says for your family" — reachable straight from
the landing page.

### Done since

- **Payments work, in test mode.** A consultation fee is charged through
  Razorpay. The fee is read server-side from the lawyer record, so the
  browser cannot say what it owes, and a row is marked paid only after
  an HMAC signature verifies on the server. With no Razorpay keys set
  the step becomes a clearly labelled test payment, so the whole flow
  is demoable with no account anywhere. See **Razorpay** below.

- **The WhatsApp placeholder is gone.** The number comes from
  `NEXT_PUBLIC_WHATSAPP_NUMBER`. With none configured the app shows no
  WhatsApp link at all and offers the in-app consultation route
  instead, so there is no way to reach a dead number.

### Still outstanding

- **Document drafts.** Reading a document works; generating one does
  not. This is the one feature on the original list still missing.

- **No automated tests.** Everything has been verified by hand, and the
  payment routes were checked against a running server for forged,
  wrong-length and valid signatures. The pure modules
  (`lib/recovery/estimate.ts`, `lib/heirs/engine.ts`,
  `lib/payments/razorpay.ts`) are straightforward to unit-test.

- **Translations are not reviewed by a native speaker.** All five
  languages are complete and key-for-key identical, but the legal and
  financial wording should be read by someone fluent before launch.
  The riskiest keys are `recovery.basis.*`, `heirs.*` and `payment.*`.

- **Land record portals cover seven states.** The other twenty-four are
  listed by name without a link, on purpose: see the comment at the top
  of `src/lib/landRecords.ts`.

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
