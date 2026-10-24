# Lead Follow-up Agent

One screen that tells a sales rep who to follow up with today, and what to say.

Built for the FDE take-home assignment: a small packaging-equipment company
with 5 reps, leads scattered across a spreadsheet and WhatsApp, and no clear
view of who's hot, who's gone cold, and who needs a reply today.

## What it does

1. **Tags every lead** Hot / Warm / Cold with a one-line, specific reason
   (e.g. *"Buyer asked for pricing 1 day ago"*, *"No reply in 9 days after
   your last message"*).
2. **Sets a next follow-up date** for each lead — either parsed from an
   explicit date mentioned in the chat ("call me Monday") or from a
   tag-based cadence (Hot = 1 day, Warm = 3 days, Cold = 7 days).
3. **Drafts the next WhatsApp message** for each lead, tailored to the tag
   and the specific signal that drove it (price objection, stalling, ready
   to order, gone quiet, etc.).
4. **Dashboard**: today's and overdue follow-ups sorted to the top,
   overdue ones flagged in red, one click into any lead's full chat, tag,
   reason and draft. A rep can edit the draft, mark it sent, log a new
   WhatsApp message, or add a brand new lead — all of which re-run the
   agent immediately.

See [`NOTE.md`](./NOTE.md) for the full write-up: how the tagging logic
works, what AI tools were used, and what's next.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sample data (20 leads, 15 with WhatsApp-style
chat history) seeds automatically into the browser's local storage on first
load — no backend or database required.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- No backend/database: the agent logic runs client-side and state persists
  to `localStorage`, so the app deploys as a single static-friendly Next.js
  app with zero external services to configure or that can go down during
  review.
