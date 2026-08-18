# Neoteric Connect — Owner Portfolio & Re-Investment System

React port of the single-file `neoteric-connect-system.html` prototype. Same data, same
rules, same visual design — restructured into components with real state management so it
can be extended and wired to an API.

## Run it

The app is split into two fully independent projects — `frontend/` (React + Vite) and
`backend/` (Node + Express + MongoDB) — each with its own `package.json`/`node_modules`.
There is no root-level `package.json`; install and run each one from inside its own
folder. MongoDB must be running locally (`mongodb://localhost:27017` by default, see
`backend/.env`).

```bash
cd backend && npm install && npm run seed   # one-time: install + populate MongoDB (240 owners)
npm run dev                                 # backend on :4000 (leave running)
```

```bash
cd frontend && npm install
npm run dev      # http://localhost:5173 — proxies /api to :4000
npm run build    # production bundle into frontend/dist/
npm run preview  # serve the built bundle
```

Run both `npm run dev` commands at the same time, in two terminals.

## What it does

Thirteen screens over one consolidated owner base spanning three entities (Neoteric
Properties, Navayan Realty, Heaven Heights):

| Group | Screen | Purpose |
|---|---|---|
| Read | Command centre | Who is ready to re-invest, who must not be touched, what the base is worth |
| Read | Owner base | Every owner, scored, segmented, sortable and filterable |
| Read | Customer master | One owner in full, across eight tabs |
| Act | Trigger calendar | Dated reasons to make contact over 90 days, gate applied |
| Act | Referral tree | The genealogy of owners who introduced other owners |
| Act | Portfolio statement | The customer-facing one-pager (printable to PDF) |
| Act | Statement send log | What each statement produced, and the dispute rate |
| Data | Intake & exceptions | The write path — validated import plus a live add-owner form |
| Data | Valuation register | The signed monthly note behind every gain figure |
| Data | Exit register | Owners who sold without you, and the commission foregone |
| Build | Scoring engine | Move the weights, watch the segments redraw live |
| Build | Field dictionary | Every field, with the named person accountable for capturing it |
| Build | Access & governance | Role matrix, DPDP obligations, retention policy |

## Command centre

Beyond the original prototype, the Command centre answers *where the value is and how
much of it is locked up*:

- **Segment tiles carry money**, not just headcount — Segment A is 39 owners holding
  ₹20.2 Cr.
- **Where the value sits** ([frontend/src/components/ValueByProject.jsx](frontend/src/components/ValueByProject.jsx))
  — unrealised gain per project as a horizontal stacked bar, split into reachable now
  vs behind the gate. Hover any row for the breakdown; "Show table" gives the same
  numbers as a table. It makes the stale-valuation problem visible at a glance: The
  Statement's bar is entirely red, because one out-of-date note holds all 24 of its
  owners.
- **Why records are blocked** now shows the gain locked behind each gate code and splits
  them into *clearable* (open complaint, no consent, stale valuation) and *structural*
  (exited, transfer, litigation), with the recoverable total called out. It is the
  difference between a list of blocks and a work queue.

Three numbers on that page have to agree, and do: Segment C's held value, the
contact-blocked KPI, and the chart's "behind the gate" total are all ₹29.7 Cr. The chart's
grand total is deliberately *larger* than the unrealised-gain KPI — the KPI counts active
owners, the chart counts every live unit — so the card states the basis and the
difference rather than leaving two totals unexplained.

The two-series palette (`#F97316` / `#B91C1C`) was checked with the visualization
validator, not by eye: CVD ΔE 20.4 (deuteranopia), normal-vision ΔE 21.0. Orange sits at
2.8:1 on white, under the 3:1 mark floor, so every bar carries a visible value label and
the card ships a table view — both are required relief, not decoration.

## The two rules that matter

**The contact gate runs before the score.** `GATE_ORDER` in
[frontend/src/lib/derived.js](frontend/src/lib/derived.js) is evaluated in strict order, first match wins:
exited → transfer in progress → litigation → open complaint → no marketing consent →
stale valuation. Any hit forces Segment C and suppresses all outbound, whatever the score
says. The gate returns a machine-readable code so a send layer can enforce it
independently of the screen.

**Valuation is resale-led, floored at circle rate, never the ask price.** A valuation note
older than 90 days automatically holds every owner in that project out of all outreach.

## Structure

```
frontend/
  src/
    lib/
      core.js         clock, seeded PRNG, formatters, projects, festivals
      generator.js    synthetic sample base (240 owners) — also copied into backend/ for seeding
      derived.js      position maths, contact gate, confidence, score, segments, triggers
      intake.js       client-side form validation (exceptions queue, live-add form)
      reference.js    field dictionary and access matrix (static tables)
    context/
      AppContext.jsx  fetches the raw base from the API; enrich(raw, weights) stays client-side
    components/       Ui.jsx primitives, Sidebar, RateLadder, ThemedSelect
    views/            one file per screen; views/master/* for the eight master tabs
    index.css         Tailwind entry (dark mode, custom scrollbars, print rules)
  index.html, vite.config.js, tailwind.config.js, postcss.config.js

backend/
  src/
    lib/
      core.js, generator.js   own copies of the frontend's (used only for seeding)
      gate.js, validate.js    server-authoritative ports of the contact gate + intake checks
    models/           Mongoose schemas: Customer, Project, Counter
    routes/           customers.js, projects.js
    index.js          Express app entrypoint
  seed.js             one-shot idempotent seed script
  .env                MONGODB_URI, PORT
```

### State

`AppContext` fetches the raw base once from `GET /api/customers` on mount. Everything
derived — score, segment, gate, gain, data confidence — is still recomputed entirely
client-side by `enrich(raw, weights)` inside a `useMemo`, exactly as before: move a weight
slider on the Scoring engine and every segment count, chip and call list redraws instantly,
with no round trip to the server. The one real write path (adding an owner via Intake, and
now also logging a sent statement from Portfolio statement) goes through the backend, which
re-validates and re-checks the gate independently of whatever the client already checked.

### Sample data

`backend/seed.js` calls `generateBase()` from a fixed seed (`20260810`) to populate MongoDB
once with the same 240 owners the in-memory version used to regenerate on every reload. The
system clock is still pinned to **10 Aug 2026** via `TODAY` in `core.js` (both copies).
Re-run `npm run seed` any time to reset the database back to that clean sample state.

> One oddity is preserved deliberately: `email: rnd() < 0.7 ? null : null` in the
> generator always yields `null` but consumes a random draw. Remove it and every
> subsequent value shifts, changing the whole sample base.

## Notes on the port

- All markup moved from HTML template strings to JSX, so React escapes values and the
  `esc()` helper is gone.
- The global mutable `BASE` / `W` / `CUR` / `TAB` variables became React state; view
  functions became components.
- `score()`, `segOf()` and `enrich()` take the weights as an argument instead of reading a
  global, and `enrich()` returns a new array rather than mutating in place.
- Duplicate-PAN detection on the intake form now genuinely compares against the base. In
  the original the check could never fire.
- Everything else — every figure, threshold, label and piece of copy — is unchanged.
