# ROI App — Project Continuity Doc

> **Use this file when starting a new Claude Code session.** Paste this into the
> fresh session: *"Read `PROJECT.md` and `HANDOFF.md`, then wait for my next
> instruction. Don't change any code until I tell you to."*
>
> `HANDOFF.md` has the long-term architecture context. **This file** captures
> the live state of recent work — what was just changed, what's known to be
> brittle, and what's queued next.

---

## What this app is (one-liner)

Indecomm ROI Calculator — a Next.js web app that replaces Excel ROI models
with a polished, shareable web UI. Reps and prospects compare in-house ops
cost vs. Indecomm SaaS/outsourcing pricing.

**Stack:** Next.js 14 · React 18 · TypeScript · Tailwind · Zustand · Recharts · ExcelJS · Vitest

**Run locally:**
```bash
cd "/Users/krishs/Documents/KS_DATA/14. Claude/ROI App"
npm install --ignore-scripts
npm run dev
# open http://localhost:3000
```

**The model we're actively working on:**
`/calculator/navy-federal` — NFCU custom RFP scenario (hidden from landing
tiles, direct URL only). Source: `src/models/navy-federal.ts`.

---

## Recent session — what changed and why

### Issue 1: Right-side "3-Year Annual Savings" card had overlapping numbers
- **Root cause:** `fmtCurrency()` rendered full `$2,278,086` strings that
  overflowed Year 2 / Year 3 columns in the 3-up grid.
- **Fix:** Switched to compact format `fmtCurrency(n, { compact: true })`
  → renders as `$2.28M`. Applied to all year savings and cumulative total in
  `src/components/saas/SaasResultsPanel.tsx`.

### Issue 2: Platform pricing fields showed $0 instead of model defaults
- **Root cause:** `loadLocal()` in `src/components/SaasCalculatorClient.tsx:33-34`
  reads stale localStorage. That saved scenario was persisted before
  the new pricing fields (`fixedAnnualLicense`, `currentPlatformAnnualCost`)
  existed. The store at `src/store/saasScenarioStore.ts:51` previously did
  `inputs = initial ?? base` — overwriting model defaults with the old empty save.
- **Fix:** Updated `setModel` to **deep-merge** saved inputs OVER the base defaults
  so missing fields fall back to model defaults. See
  `src/store/saasScenarioStore.ts:49-68`.
- **Gotcha:** The merge protects `undefined` fields. If the old save has explicit
  `0` (like `oneTimeImplementationFee: 0`), the `0` still wins. **User must clear
  localStorage** to see the model defaults:
  ```javascript
  // browser DevTools console on the calculator page
  localStorage.removeItem('roi-scenario-saas-navy-federal');
  location.hash = '';
  location.reload();
  ```
  Or use an Incognito window.

### Issue 3: Section ordering
- Reordered the left column in `src/components/SaasCalculatorClient.tsx:100-114`
  so `ClientPlatformCostInputs` renders **before** `SaasInternalCostInputs`.
  This puts the "Total Annual Cost Before / After" cards (which live at the
  bottom of `SaasInternalCostInputs.tsx`) directly above the "Platform Pricing"
  section, with the legacy platform input feeding into the Before total above.

### Issue 4: Added ROI % to the 3-Year card
- Each year now shows ROI % under the savings line:
  ```
  $2.28M
  37.6% saved
  ROI: 51%
  ```
- Formula: `savings / Indecomm platform spend that year` (already in the engine
  as `r.year1.roiPct`, etc. — `src/lib/saas-engine.ts:387,393,399`).
- Only renders when `displayPreference === "savings-first"` (NFCU). For
  ROI-first models the inverse layout already exists.

### Issue 5: Added bold cumulative 3-year ROI banner
- New colored banner at the bottom of the 3-Year card showing the contract-life
  ROI %. See `src/components/saas/SaasResultsPanel.tsx:196-203`.
- Formula computed inline (not in the engine):
  ```
  cumulativeRoiPct = threeYearCumulativeSavings / (Y1 + Y2 + Y3 platform spend)
  ```
- Engine intentionally not modified to keep tests stable — recomputed in the
  display component.

### Issue 6: Added subtitle to Total Annual Cost cards
- **Before card** subtitle now lists: `direct labor + supervisor + benefits +
  indirect + legacy platform ($amount)`. The legacy platform piece is
  conditional on `r.internal.currentPlatformAnnualCost > 0` so non-NFCU
  models don't show a confusing line.
- **After card** subtitle: lists same buckets minus the platform, plus a note
  that **Indecomm platform spend is shown separately below** (in the Platform
  Pricing section). See `src/components/saas/SaasInternalCostInputs.tsx:127-149`.

### Issue 7: Added "Indexing & Data Extraction" role + new engine flag
- **What:** New role at the top of NFCU's roles list:
  - 12 files/day baseline · $22/hr · 100% improvement
  - Volume: new `indexingVolume` input, 5,167/month (matches RESPA pipeline)
  - **Fully eliminated by IDXGenius** (Gen AI doc classification + 250+ field extraction)
- **Engine change (intentional):** Added optional `eliminatedByPlatform: boolean`
  to `SaasRoleDef`. The engine forces `fteAfter = 0` when this flag is true,
  regardless of the productivity math. Without this flag, the engine treats
  "100% improvement" as "productivity doubles" → halves FTE, not zero.
- Files: `src/models/_saas-types.ts` (type), `src/lib/saas-engine.ts:147-150` (engine),
  `src/models/navy-federal.ts` (volume + role config).

### Issue 8: Removed 3% annual escalator (set to 0%, hook preserved)
- `pricingEscalatorAnnual: 0` in `src/models/navy-federal.ts`. Comment explains
  how to restore the 3% behavior by flipping to `0.03`.
- Engine behavior is unchanged — the escalator hook still applies symmetrically
  to Indecomm license AND legacy platform cost when non-zero.
- Net result: Y2 and Y3 Indecomm license now stay flat at $3,989,590.

### Issue 9: CEO-revised NFCU pricing (June 2026)
- `defaultFixedAnnualLicense` lowered from **$3,989,590 → $3,242,000** in
  `src/models/navy-federal.ts`. Implementation fee, legacy assumption, and
  escalator unchanged. Source: CEO pricing deck "NFCU Post Settlement Indecomm
  Revised Pricing.pptx" (slides 5 + 7).
- Test fixtures in `src/lib/saas-engine.test.ts` updated to new totals; all
  85 tests pass.

### Issue 10: PDF dashboard polished
- `src/components/saas/SaasPrintSummary.tsx` — 3-year hero now uses compact
  format (`$4.03M`), adds ROI % under each year, renamed "3-Year Total" to
  "3-Year Cumulative", added a bold accent-colored **"3-Year Cumulative ROI"**
  banner directly below the hero (matches the on-screen banner), added
  "Includes:" subtitles to Before/After cost cards.
- Tighter padding (11 vs 12) so everything fits on one landscape page.

### Issue 11: Excel export — eliminatedByPlatform fix + ROI rows
- **Bug fix in `src/lib/excel-export.ts`:** the FTE-After formula for roles
  ignored `eliminatedByPlatform`. Fixed: when the flag is true, the cell is
  set to a literal `0` (matches the engine).
- Added **ROI %** row to the Annual Savings table (Y1, Y2, Y3, 3-year cumulative).
- Added a headline **3-Year Cumulative ROI** banner in the KPI section,
  styled in the platform accent color — parallel to the on-screen banner.

### Issue 12: NFCU 2-slide ROI add-on deck generated (not committed to repo)
- Generated `NFCU ROI Add-on - Revised Pricing.pptx` in the NFCU folder
  via a Python script (`/tmp/build_nfcu_roi_deck.py`). Matches the visual
  style of the CEO pricing deck (navy/gold, eyebrow tag + bold navy title +
  gray subtitle, "Indecomm Global Services | Confidential and Proprietary"
  footer). Two slides: Slide 1 headline ROI tiles + year strip; Slide 2
  side-by-side cost build-up.
- Script is throwaway (in /tmp). Re-run if the model numbers change again.

### Issue 14: New "Data Entry & Validation" services model + BPO group rename
- **Group renamed:** id `"uw-ppr"` → `"bpo"`, display name "Underwriting &
  Pre-Purchase Reviews" → **"BPO ROI Calculator"**. URL is now `/group/bpo`.
  *Existing shared links to `/group/uw-ppr` will break* — direct model URLs
  (`/calculator/underwriting`, `/calculator/ppr`) still work unchanged.
- **New model added:** `src/models/data-entry-validation.ts` (id
  `"data-entry-validation"`, route `/calculator/data-entry-validation`).
  Two-role services model with a single 9,000 apps/month volume driver:
  - **Data Entry:** 22.5 loans/day (20 min/loan), $20/hr onshore →
    20 FTE @ default volume.
  - **Validation:** 15 loans/day (30 min/loan), $30/hr onshore →
    30 FTE @ default volume.
  - **Indecomm pricing:** $1,800/FTE/mo (Data Entry), $2,000/FTE/mo
    (Validation). Per-FTE model — FTE count mirrors the in-house need.
  - Standard services defaults otherwise: span 8, $100K sup salary, 25%
    benefits, 5×$1M×5% indirect.
- The group now contains 3 models in this order: `underwriting`, `ppr`,
  `data-entry-validation`.

### Issue 13: Services Excel export converted to formula-driven
- **Before:** `exportServicesToExcel` wrote pre-computed, pre-formatted
  string values. Editing a cell did nothing — the workbook was a static
  snapshot. This was inconsistent with the SaaS workbook (NFCU/IDX/DG),
  which is fully formula-driven.
- **After:** Every editable input (volumes, sample rate, role productivity
  & rate, supervisor span & salary, benefits %, indirect pool & allocation,
  Indecomm pricing, retention toggle/pct/supervisors) is a yellow-tinted
  editable cell. All downstream values (FTEs, direct labor, supervisor cost,
  benefits, indirect total, in-house total, Indecomm fee, audited loans/yr,
  annual savings, savings %, per-loan internal, per-loan post-outsourcing,
  KPI band callouts, bar chart "Live Value" column) are FORMULAS pointing
  at the input cells.
- The visual layout is preserved — KPI band still sits at the top (using
  forward references to inputs below), per-loan bar still uses cell-rendered
  bars for the visualization (bar widths stay at snapshot; the dollar
  values to the right are now live formulas).
- New helper `kpiCalloutFormula()` added alongside `kpiCallout()` for
  formula-driven callout boxes.
- All 7 services models (PCQC, PFQC, Servicing QC, PCH Post-Close, PCH
  Trailing, PPR, Underwriting) benefit automatically — the same exporter
  function handles all of them.
- Tests still pass (85/85), TypeScript compiles clean, production build
  succeeds.

### Issue 15: Capacity-creation reframe for automation models (Tier 1)
- **Context:** Krish's podcast + webinar talk track ("The Real ROI of
  Mortgage Operations") reframes the ROI story from *cost / staff reduction*
  to *capability / capacity creation*. Source: `The_Real_ROI_of_Mortgage_
  Operations_Webinar_Flow_Polished.docx`. Five drivers named in Part 2:
  Productivity · Capacity · Quality · Risk · Scalability.
- **Scope:** IDXGenius (retail + bulk) and DecisionGenius only. NFCU already
  uses capacity-freed tone; services models are cost-comparison-driven and
  stay untouched for now.
- **Changes:**
  - `src/models/idxgenius.ts`, `idxgenius-bulk.ts`, `decisiongenius.ts` —
    added `tone: "capacity-freed"` to each.
  - `src/lib/saas-engine.ts` — new `SaasCapacityMetrics` type exposed on
    `SaasResult.capacity`. Fields: `volumeMultiplier` (Before-FTE ÷
    After-FTE across direct roles), `additionalMonthlyVolume` (today's
    volume × (mult − 1)), `fteCapacityFreed` (aliases fteSaved with
    growth-story framing), `monthlyVolumeBase`.
  - `src/components/saas/SaasResultsPanel.tsx` — two new components:
    * `CapacityHeadline` — three-metric hero (Volume Multiplier ·
      Additional Capacity · FTE Capacity Freed) rendered ABOVE the existing
      savings hero when `tone === "capacity-freed"`. Uses the model's
      accent color + narrative subtext.
    * `FiveDriversStrip` — compact 5-column strip showing Productivity,
      Capacity, Quality, Risk, Scalability. First two have live values
      derived from the engine; last three show qualitative labels
      ("Consistent", "Auditable", "Market-ready") — placeholders for a
      future quantitative pass.
  - FTE subtext copy updated: "Redeployable for growth" (was "Redeployable
    to higher-value work").
- **What was NOT built** (Tier 2, later): volume-spike stress-test slider,
  loaded cost-per-hire input, avoided-hire dollars, rep talking-script
  callouts, podcast companion slide.
- **Cleanup:** removed stale `indecomm-roi-handoff/` folder from repo root
  (leftover from the admin-handoff staging — was polluting the TypeScript
  build). Zip still exists at `/Users/krishs/Documents/indecomm-roi-handoff-
  2026-06-12.zip` if needed.
- Tests still pass (85/85), TypeScript clean, production build succeeds.

---

## NFCU model reference numbers (for sanity checks)

From `src/models/navy-federal.ts` (current state, after this session):

| Field | Default |
|---|---|
| **Indexing volume / month** | **5,167** (NEW, matches RESPA pipeline) |
| RESPA Reviews / month | 5,167 (62,000/yr) |
| Post-Close Audits / month | 2,075 (24,900/yr) |
| Trailing-Doc Reviews / month | 6,667 (80,000/yr) |
| **Indexing role** | **12 files/day · $22/hr · 100% lift · `eliminatedByPlatform: true`** |
| RESPA Auditor | 6/day · $30/hr · 75% lift |
| Post-Close Auditor | 6/day · $30/hr · 60% lift |
| Trailing-Docs Analyst | 10/day · $30/hr · 50% lift |
| Benefits rate | 25% |
| Supervisor salary / span | $95K / 10 |
| Indirect cost pools | 5 × $1M × 5% allocation |
| **Indecomm fixed annual license** | **$3,242,000** (CEO-revised June 2026; was $3,989,590) |
| **One-time implementation fee** | **$520,000** |
| **Assumed legacy platform cost** | **$3,000,000/yr** (Paradatec + Hyland + Trinity) |
| **Annual escalator (Y2/Y3)** | **0%** (was 3% — hook preserved for easy restore) |
| Display preference | `savings-first` |
| Tone | `capacity-freed` (avoids "layoff" language) |
| 3-year view | enabled |

**Expected outputs after a clean load** (no stale localStorage):
- FTE Before: ~126.5 (Indexing 22 + RESPA 43 + PC 17 + TD 33 + Supervisor 11.5)
- FTE After: ~63.8 (Indexing 0 + RESPA 25 + PC 11 + TD 22 + Supervisor 5.8)
- FTE freed: ~62.7
- Total Annual Cost Before: ~$13.13M (labor + benefits + indirect + $3M legacy)
- Total Annual Cost After: ~$5.34M (labor + benefits + indirect only — no platform)
- Year 1 Indecomm spend: $3,242,000 + $520,000 = **$3,762,000**
- Year 2 Indecomm spend: **$3,242,000** (flat — escalator 0%)
- Year 3 Indecomm spend: **$3,242,000** (flat — escalator 0%)
- Year 1 savings: ~$4.03M · ~30.7% saved · ROI ~107%
- Year 2 / Year 3 savings: ~$4.55M each (ROI ~140% each)
- 3-year cumulative savings: ~$13.12M  ·  Cumulative 3-yr ROI ~128%

---

## Files touched this session

```
src/components/saas/SaasResultsPanel.tsx        — compact format, ROI line per year, cumulative ROI banner
src/components/saas/SaasInternalCostInputs.tsx  — "Includes:" subtitles on Before/After cards
src/components/SaasCalculatorClient.tsx         — reordered ClientPlatformCostInputs above SaasInternalCostInputs
src/store/saasScenarioStore.ts                  — setModel now deep-merges saved inputs over defaults
src/models/_saas-types.ts                       — added eliminatedByPlatform?: boolean to SaasRoleDef
src/lib/saas-engine.ts                          — honors eliminatedByPlatform → fteAfter = 0
src/lib/saas-engine.test.ts                     — updated NFCU fixture block (new role + 0% escalator + new pricing)
src/models/navy-federal.ts                      — added indexingVolume + Indexing role; escalator → 0; CEO pricing $3.242M
src/components/saas/SaasPrintSummary.tsx        — PDF polish (compact, ROI lines, cumulative ROI banner, Includes: subtitles)
src/lib/excel-export.ts                         — SaaS: eliminatedByPlatform fix, ROI % row, cumulative ROI banner
                                                  Services: rewrote exportServicesToExcel as fully formula-driven
                                                  + new kpiCalloutFormula() helper
src/models/data-entry-validation.ts             — NEW services model (Data Entry + Validation, per-FTE BPO pricing)
src/models/index.ts                             — registered new model; group "uw-ppr" → "bpo" (BPO ROI Calculator)
PROJECT.md                                      — this file
```

External artifacts (not in the repo):
```
NFCU Post Settlement Automation 2026/NFCU ROI Add-on - Revised Pricing.pptx
   — generated 2-slide ROI add-on deck
```

All 85 tests pass (`npm run test`). TypeScript compiles clean (`npx tsc --noEmit`).

---

## Known issues / things to be aware of

1. **Stale localStorage is the #1 footgun.** Anytime model defaults change or
   new pricing fields are added, an old save in `localStorage` can mask them
   with explicit zeros. The merge fix in `saasScenarioStore.ts` only protects
   `undefined` keys — `0` is still treated as user intent. If a user reports
   "the default isn't showing", **first ask them to clear localStorage**:
   ```javascript
   localStorage.removeItem('roi-scenario-saas-navy-federal');
   location.hash = '';
   location.reload();
   ```

2. **URL hash also persists state.** If a user has a shared URL with old data
   in `#d=…`, that wins over localStorage. Clearing the hash (`location.hash = ''`)
   is part of the reset above.

3. **Engine is pure — keep it that way.** No React, no DOM, no storage imports
   in `src/lib/engine.ts` or `src/lib/saas-engine.ts`. Display-only helpers
   (like cumulative ROI %) can be computed inline in components.

4. **`navy-federal` model is hidden by design** — not in landing tiles, not in
   any group. Reachable only at `/calculator/navy-federal`. See comments at
   the top of `src/models/navy-federal.ts:7-9`.

5. **PrintSummary and Excel export are NOT updated** with the new ROI lines /
   subtitles. If those views matter for the next client demo, they need a
   parallel pass. Files: `src/components/saas/SaasPrintSummary.tsx` and
   `src/lib/excel-export.ts`.

6. **`displayPreference` switches layout.** Most components branch on
   `model.displayPreference === "savings-first"`. NFCU is savings-first.
   If you copy NFCU logic for an ROI-first model, the ROI line per year
   needs a parallel addition in the `else` branch.

7. **`eliminatedByPlatform` is an absolute override.** When set, the engine
   forces `fteAfter = 0` and ignores `improvementPct`. Don't combine it with
   partial-improvement narratives in the UI — the value of `improvementPct`
   becomes informational only. Source: `src/lib/saas-engine.ts:147-150`.

---

## What's queued / open items

*Fill in / update as work continues.*

- [ ] Apply the same Before/After subtitle treatment to the Print Summary
  (`src/components/saas/SaasPrintSummary.tsx`) so the printed PDF matches
  what the rep sees on screen.
- [ ] Decide whether the Excel export should reflect the 3-year cumulative
  ROI banner (currently engine doesn't expose `cumulativeRoiPct` — computed
  inline in the panel). If yes, hoist into the engine and add a test.
- [ ] (User-requested polish items go here)

---

## Key conventions / things not to break

(Same as `HANDOFF.md`, restated here so this file stands alone.)

1. **Sharing is URL-hash based.** Anything added to scenario state must
   round-trip through `src/lib/share.ts`. Never push scenario data into query
   params.
2. **Engine is pure.** `src/lib/engine.ts` and `saas-engine.ts` have no React,
   DOM, or storage imports. Keep math testable and portable.
3. **Models are config-only.** Adding a new ROI model = one new file in
   `src/models/` + one entry in `src/models/index.ts`. Don't fork the engine.
4. **`navy-federal` is intentionally hidden.** URL-only.
5. **Brand colors are Tailwind tokens** (e.g. `bg-navy`, `text-orange`), not
   raw hex.
6. **Tests must pass:** `npm run test` (currently 85 tests).

---

## How to verify nothing's broken

```bash
npm run test          # all engine tests must pass
npm run build         # type-check + production build must succeed
npm run dev           # smoke-test the NFCU calculator at /calculator/navy-federal
```

After `npm run dev`, smoke-test checklist for NFCU (assumes a clean localStorage):
- [ ] Page loads at `/calculator/navy-federal`
- [ ] Implementation fee shows **$520,000** (clear localStorage if it shows $0)
- [ ] Indecomm Annual License shows **$3,242,000**
- [ ] Current Platform Cost shows **$3,000,000**
- [ ] Indexing & Data Extraction role visible at top of the Roles table
  with Before FTE 22 and After FTE 0
- [ ] Total Annual Cost Before ≈ **$13,128,025**
- [ ] Total Annual Cost After ≈ **$5,338,837**
- [ ] FTE counts: ~126.5 → ~63.8 (~62.7 freed)
- [ ] Y2/Y3 platform spend both show **$3,242,000** (no escalator)
- [ ] 3-Year Cumulative banner shows ≈ **$13.12M**
- [ ] 3-Year Cumulative ROI banner (orange) shows a bold % at the bottom of the card
- [ ] Each year column shows: $X.XXM · X.X% saved · ROI: XX%
- [ ] Y2 and Y3 columns show identical savings (since escalator = 0)
- [ ] Before card subtitle includes "+ legacy platform ($3,000,000)"
- [ ] After card subtitle says "Indecomm platform spend shown separately below"

---

## Resume prompt template

Paste this into a fresh session:

> Read `PROJECT.md` and then `HANDOFF.md` in this repo. We were working on the
> Navy Federal RFP calculator at `/calculator/navy-federal`. Don't change any
> code yet — first confirm your understanding back to me by summarizing the
> recent changes and the known stale-localStorage gotcha. Then I'll tell you
> what's next.
