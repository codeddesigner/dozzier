# Dozzier

Secure document sharing with page-by-page analytics, live alerts, data rooms and follow-up insights.

Live: https://dozzier.co

## Stack

- Next.js 15 (App Router) + TypeScript, plain CSS design tokens from the Figma file
- Supabase: Postgres (RLS on every table), auth, and a private `documents` storage bucket
- pdf.js for in-browser PDF rendering and page counting
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

Environment variables (both are public, client-safe values; defaults are baked into `lib/supabase.ts`):

```
NEXT_PUBLIC_SUPABASE_URL=https://hxgcoekovalkmdwcabll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Structure

| Path | What it is |
| --- | --- |
| `app/page.tsx` | Marketing site |
| `app/login`, `app/signup` | Auth |
| `app/app/*` | Logged-in app: dashboard, content, links, spaces, contacts, accounts, agreements, file requests, shared, upgrade, Ask Dozzier, settings |
| `app/v/[slug]` | Public document / data room viewer (email gate, passcode, NDA, watermark, tracking) |
| `app/r/[slug]` | Public file-request upload page |
| `app/api/geo` | Returns visitor location from Vercel geo headers |
| `components/` | Shared UI, charts, modals, viewer renderer |

## How tracking works

Public pages call Supabase RPCs (`get_public_link`, `start_visit`, `track_page`, `record_download`, `get_public_space`) that run as `security definer`, so visitors never get direct table access. `start_visit` creates the visit and auto-creates the contact and company account; the viewer sends seconds-per-page every 5 seconds.

## Not yet wired up

- Ask Dozzier answers from visit data with rules, not an AI model
- Plan selection on Upgrade isn't connected to billing
- Cloud-drive and CRM integrations are UI only
