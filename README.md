# muslim-routine

Arabic-first routine planner that turns prayer-time-based templates into a one-week Google Calendar plan.

## What It Does

- Builds a 7-day preview grouped by real routine blocks such as `الفجر إلى الشروق`.
- Keeps reusable task templates separate from generated occurrences.
- Supports daily and selected-day repeats like `سحور + استغفار` on Monday and Thursday.
- Exports one Google Calendar event per occupied prayer block.
- Uses a payload hash and private Google event properties so repeated exports update existing events instead of duplicating them.

## Stack

- Next.js App Router monorepo
- shadcn/ui with RTL enabled
- Supabase Postgres migrations with RLS
- Google Calendar API via server-side service account credentials
- Vitest for scheduling/export logic

## Local Setup

```bash
corepack pnpm install
corepack pnpm dev
```

Copy `.env.example` to `.env.local` and fill only the values you need locally.

For Google Calendar service-account testing:

1. Share the target Google Calendar with the service account email.
2. Set `GOOGLE_SERVICE_ACCOUNT_FILE` to the absolute local JSON path.
3. Set `GOOGLE_CALENDAR_ID` to the shared calendar ID.

`GOOGLE_CALENDAR_ID` comes from Google Calendar settings under **Integrate calendar**. It is usually an email-like value for a primary calendar or a long `...@group.calendar.google.com` value for a secondary calendar. Do not use the service account **Unique ID** or **Client ID** as the calendar ID.

Never commit `.env.local`, service-account JSON, or Supabase service-role keys.

## Production Readiness

- Run `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm lint`, and `pnpm build` before deployment.
- Confirm `/api/health` returns `status: "ok"` and shows `configured` for the integrations you expect.
- Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` public-client only.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_FILE`, and `GOOGLE_SERVICE_ACCOUNT_JSON` server-side only.
- Rotate any service-role key or service-account credential that was ever pasted into chat before public deployment.
- Prayer times come from AlAdhan with Riyadh/Umm Al-Qura defaults and are cached at the route edge for production traffic.
- The live UI waits for AlAdhan results before previewing or filling Google Calendar, so seed/demo prayer times are not used for real exports.

## Verification

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Supabase schema lives in `supabase/migrations`.
