# Neoteric Connect — Owner Portfolio & Re-Investment System

React port of the single-file `neoteric-connect-system.html` prototype. Same data, same
rules, same visual design — restructured into components with real state management so it
can be extended and wired to an API.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
```

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
- **Where the value sits** ([src/components/ValueByProject.jsx](src/components/ValueByProject.jsx))
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
[src/lib/derived.js](src/lib/derived.js) is evaluated in strict order, first match wins:
exited → transfer in progress → litigation → open complaint → no marketing consent →
stale valuation. Any hit forces Segment C and suppresses all outbound, whatever the score
says. The gate returns a machine-readable code so a send layer can enforce it
independently of the screen.

**Valuation is resale-led, floored at circle rate, never the ask price.** A valuation note
older than 90 days automatically holds every owner in that project out of all outreach.

## Structure

```
src/
  lib/
    core.js         clock, seeded PRNG, formatters, projects, festivals
    generator.js    synthetic sample base (240 owners) — replace with your API
    derived.js      position maths, contact gate, confidence, score, segments, triggers
    intake.js       import checks, exceptions queue, form validation, record builder
    reference.js    field dictionary and access matrix (static tables)
  context/
    AppContext.jsx  the single store: raw base + weights in, enriched base out
  components/       Ui.jsx primitives, Sidebar, RateLadder
  views/            one file per screen; views/master/* for the eight master tabs
  styles.css        unchanged from the prototype
```

### State

`AppContext` holds the raw base and the four weights. Everything derived —
score, segment, gate, gain, data confidence — is recomputed by `enrich(raw, weights)`
inside a `useMemo`. Move a weight slider on the Scoring engine and every segment count,
chip and call list in the app redraws from the same computation. Nothing is cached
separately, so nothing can drift out of sync.

### Sample data

`generateBase()` runs once at module load from a fixed seed (`20260810`), so the base is
identical on every reload and matches the original prototype record for record. The system
clock is pinned to **10 Aug 2026** via `TODAY` in `core.js`.

To connect real data, replace `RAW_BASE` in [src/lib/generator.js](src/lib/generator.js)
with a fetch. Nothing else needs to change — every other module reads the shape, not the
source.

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
