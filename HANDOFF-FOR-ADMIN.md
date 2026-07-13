# Code update for `indecomm-roi` — handoff to web admin

**From:** Krish
**Date:** July 10, 2026
**What this is:** A batch of updates to the ROI calculator app. Please push these to GitHub — Vercel will auto-deploy.

---

## What's in this folder

The folder mirrors the same paths as the GitHub repo. Just **drop these files on top of your local clone** (overwrite when prompted) and the structure will match exactly.

### Files (19 changed + 1 new)

```
src/components/saas/SaasResultsPanel.tsx          (MODIFIED)
src/components/saas/SaasInternalCostInputs.tsx    (MODIFIED)
src/components/saas/SaasPrintSummary.tsx          (MODIFIED)
src/components/saas/SaasVolumeInputs.tsx          (MODIFIED)
src/components/saas/SaasRolesTable.tsx            (MODIFIED)
src/components/saas/SaasPricingInputs.tsx         (MODIFIED)
src/components/saas/ClientPlatformCostInputs.tsx  (MODIFIED)
src/components/SaasCalculatorClient.tsx           (MODIFIED)
src/store/saasScenarioStore.ts                    (MODIFIED)
src/models/_saas-types.ts                         (MODIFIED)
src/models/navy-federal.ts                        (MODIFIED)
src/models/data-entry-validation.ts               (NEW FILE)
src/models/idxgenius.ts                           (MODIFIED)
src/models/idxgenius-bulk.ts                      (MODIFIED)
src/models/decisiongenius.ts                      (MODIFIED)
src/models/index.ts                               (MODIFIED)
src/lib/saas-engine.ts                            (MODIFIED)
src/lib/saas-engine.test.ts                       (MODIFIED)
src/lib/excel-export.ts                           (MODIFIED)
PROJECT.md                                        (MODIFIED — full change log)
```

---

## Summary of changes (since last deploy)

### Navy Federal calculator
- **CEO-revised pricing** — annual license lowered from $3,989,590 to **$3,242,000**. Implementation fee ($520K), legacy assumption ($3M), and escalator (0%) unchanged.
- **New Indexing & Data Extraction role** added — 22 FTE Before, 0 FTE After (eliminated by IDXGenius). Required a small engine type addition: optional `eliminatedByPlatform` field on `SaasRoleDef`.
- Small deep-merge fix in `saasScenarioStore.ts` so stale localStorage doesn't override new model defaults.

### PDF dashboard polished
- Compact `$X.XM` number format on all savings figures.
- Per-year ROI % lines added.
- Bold "3-Year Cumulative ROI" banner (matches on-screen version).
- "Includes:" subtitles on Before/After cost cards showing what's rolled up in each total.

### Excel export improvements
- **SaaS exporter:** the FTE-After formula now honors `eliminatedByPlatform`. Added a live ROI % row and a 3-Year Cumulative ROI banner.
- **Services exporter:** rewrote as **fully formula-driven** (previously it wrote static, pre-formatted string values). Every input is now a yellow-tinted editable cell; every downstream value (FTEs, direct labor, supervisor cost, benefits, indirect, in-house total, Indecomm fee, savings, per-loan costs, KPI band) is a live Excel formula that recalculates when inputs change.

### New services model: Data Entry & Validation
- Route: `/calculator/data-entry-validation`
- Two-role per-FTE BPO model. Single 9,000 apps/month volume drives both roles.
- Defaults: Data Entry (22.5 loans/day, $20/hr onshore → $1,800/FTE/mo Indecomm); Validation (15 loans/day, $30/hr onshore → $2,000/FTE/mo Indecomm).

### Group rename
- Group id `"uw-ppr"` → `"bpo"`, display name "Underwriting & Pre-Purchase Reviews" → **"BPO ROI Calculator"**.
- New URL: `/group/bpo`.
- Three models in the group: `underwriting`, `ppr`, `data-entry-validation`.
- Direct model URLs (`/calculator/underwriting`, `/calculator/ppr`) still work unchanged.

### Automation ROI reframe — capacity, not staff reduction
This is the newest addition, timed for Krish's podcast + webinar on "The Real ROI of Mortgage Operations."

- **`tone: "capacity-freed"`** added to IDXGenius, IDXGenius-Bulk, and DecisionGenius.
- **New engine metrics** exposed on `SaasResult.capacity`: volume multiplier (Before-FTE ÷ After-FTE), additional monthly volume (unlocked headroom), FTE capacity freed.
- **New on-screen components:**
  - **CapacityHeadline** — three-metric hero (Volume Multiplier · Additional Capacity · FTE Capacity Freed) rendered ABOVE the savings hero for capacity-freed models. Cost story still visible directly below.
  - **FiveDriversStrip** — bulleted list showing the five drivers of automation ROI: Productivity, Capacity, Quality, Risk, Scalability. First two show live numbers from the engine; the other three are qualitative framework markers.
- **Language pass**: FTE subtext copy updated to "Redeployable for growth" (was "…higher-value work").
- **Compact savings numbers** — 2-year savings hero + ROI hero on-screen and in the PDF now show `$1.4M` instead of `$1,428,432`.

`PROJECT.md` in this folder has the full detailed change log (Issues 7-15).

---

## Verification before you push

After dropping these files into your local clone, please confirm everything is healthy:

```bash
cd <local-clone-folder>
npm install --ignore-scripts     # package.json didn't change, but safe to run
npm run test                     # should report 85/85 tests passing
npx tsc --noEmit                 # should report no errors
npm run build                    # should complete successfully
```

I've already run all three locally — they pass. But please run them again on your machine before pushing, just to be safe.

---

## After deployment — smoke-test checklist

Once Vercel finishes deploying, please confirm:

**Landing page**
- The 4th group tile now reads **"BPO ROI Calculator"** (was "Underwriting & Pre-Purchase Reviews").
- Clicking it goes to `/group/bpo` and shows **3 models**: Underwriting, Pre-Purchase Review, **Data Entry & Validation**.

**IDXGenius / DecisionGenius calculators** (`/calculator/idxgenius`, `/calculator/decisiongenius`)
- Right-side panel now leads with a **"Capacity Created"** hero showing 3 metrics (Volume Multiplier · Additional Capacity · FTE Capacity Freed).
- Below it, a **"The five drivers of automation ROI"** bulleted card with Productivity + Capacity + Quality + Risk + Scalability.
- Savings hero appears directly below the capacity hero (both stories visible).
- Savings numbers show as `$X.XM` (compact) instead of full length.

**Data Entry & Validation** (`/calculator/data-entry-validation`)
- Opens with 9,000 apps/month default.
- Data Entry: 20 FTE in-house.
- Validation: 30 FTE in-house.
- Total in-house: ~$4.4M/yr.
- Indecomm fee: ~$1.15M/yr.
- Annual savings: ~$3.26M (~74% saved).

**Navy Federal** (hidden — direct URL `/calculator/navy-federal`)
- Indecomm Annual License field: **$3,242,000**
- Implementation fee: **$520,000**
- "Indexing & Data Extraction" role at top of the roles table, 22 → 0 FTE.
- Total Annual Cost Before: ~**$13.13M**
- 3-Year Cumulative banner: ~**$13.12M** saved
- 3-Year Cumulative ROI banner: ~**128%**

**Excel export from any services model** (e.g., PCQC)
- Downloaded workbook has **yellow-tinted editable cells** in the INPUTS block.
- Changing a yellow cell (like the hourly rate) recalculates downstream totals.

If any of these look wrong, ping me and we'll figure it out before rolling back.

---

## A note for users about stale localStorage

After this deploys, some users may report that the calculator shows $0 for previously-populated fields (like the Implementation fee on Navy Federal). That's a **stale localStorage** issue — their browsers cached the old defaults. Quick fix:

In the browser DevTools console on the calculator page:
```javascript
localStorage.clear(); sessionStorage.clear(); window.location.replace(window.location.pathname);
```

Or just use an Incognito window to confirm the new defaults appear.

---

## Thank you!

Appreciate you handling the push. Once it's live let me know and I'll do a smoke test on my end too.

— Krish
