"use client";
import { useSaasScenario } from "@/store/saasScenarioStore";
import { computeSaasRoi } from "@/lib/saas-engine";
import { fmtCurrency, fmtCurrencyPrecise, fmtNumber, fmtPercent } from "@/lib/format";
import { ComparisonBar } from "../Charts";

/**
 * Right-side results panel for SaaS models.
 *
 * Two horizontal layouts:
 *   - 2-year (default) — Y1 + Y2 hero (savings-first or ROI-first)
 *   - 3-year (when model.enableThreeYearView is true) — Y1 + Y2 + Y3 plus a
 *     cumulative 3-year hero. Used by NFCU (RFP is a 3-year contract).
 *
 * Tone:
 *   - default — "FTEs reduced" subtext
 *   - "capacity-freed" — "FTE capacity freed (redeployable)"
 */
export function SaasResultsPanel() {
  const model = useSaasScenario((s) => s.model);
  const inputs = useSaasScenario((s) => s.inputs);
  if (!model) return null;
  const r = computeSaasRoi(model, inputs);
  const accent = model.platform.accentHex;
  const savingsFirst = model.displayPreference === "savings-first";
  const threeYear = model.enableThreeYearView === true;
  const capacityFreed = model.tone === "capacity-freed";

  const fteSubtext = capacityFreed
    ? <>FTE capacity freed: <strong>{r.internal.fteSaved.toFixed(1)}</strong> ({r.internal.totalFTEBefore.toFixed(1)} → {r.internal.totalFTEAfter.toFixed(1)}) · Redeployable for growth.</>
    : <>FTEs reduced: <strong>{r.internal.fteSaved.toFixed(1)}</strong> ({r.internal.totalFTEBefore.toFixed(1)} → {r.internal.totalFTEAfter.toFixed(1)}) · Pays back on day one.</>;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 self-start">
      {/* Capacity headline — reframes the ROI story around capability creation
          instead of staff reduction. Renders only for models opted in via
          `tone: "capacity-freed"` (IDX, IDX-Bulk, DecisionGenius, NFCU).
          Sits ABOVE the existing savings hero so the growth narrative reads
          first, and the dollar story remains directly beneath it. */}
      {capacityFreed && (
        <>
          <CapacityHeadline r={r} accent={accent} volumeUnitLabel={model.perLoanUnitLabel ?? "loans"} />
          <FiveDriversStrip r={r} accent={accent} />
        </>
      )}

      {/* Hero — three layouts: 3-year savings, 3-year ROI, 2-year (savings or ROI). */}
      {threeYear ? (
        <ThreeYearHero r={r} accent={accent} savingsFirst={savingsFirst} fteSubtext={fteSubtext} />
      ) : savingsFirst ? (
        <TwoYearSavingsHero r={r} accent={accent} fteSubtext={fteSubtext} />
      ) : (
        <TwoYearRoiHero r={r} accent={accent} />
      )}

      {/* Annual cost cards - Before vs After (Y2 steady state for After). */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-4 py-4 border border-slate-200 bg-white shadow-card">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Annual Before</div>
          <div className="text-2xl font-bold text-navy mt-1">{fmtCurrency(r.internal.annualBefore)}</div>
          <div className="text-xs text-slate-500 mt-1">Cost/loan: {fmtCurrencyPrecise(r.perLoanBefore)}</div>
        </div>
        <div className="rounded-xl px-4 py-4 border-2 shadow-card" style={{ borderColor: accent, background: `${accent}15` }}>
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: accent }}>Annual After (Y2)</div>
          <div className="text-2xl font-bold text-navy mt-1">{fmtCurrency(r.internal.annualAfter + r.platform.year2Spend)}</div>
          <div className="text-xs text-slate-500 mt-1">Cost/loan: {fmtCurrencyPrecise(r.perLoanAfter)}</div>
        </div>
      </div>

      {/* Comparison bar (steady-state Y2). Uses Before/After labels and the
          product's accent color so IDX = light blue, DG = deep blue. */}
      <div className="bg-white rounded-xl shadow-card border border-slate-200 p-4">
        <h4 className="text-sm font-bold text-navy mb-2">Per-loan cost comparison (Year 2 steady state)</h4>
        <ComparisonBar
          internal={r.perLoanBefore}
          outsourced={r.perLoanAfter}
          leftLabel="Before"
          rightLabel="After (Y2)"
          rightColor={accent}
        />
      </div>
    </aside>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TwoYearSavingsHero({ r, accent, fteSubtext }: { r: any; accent: string; fteSubtext: React.ReactNode }) {
  return (
    <div className="rounded-xl shadow-card border-4 px-5 py-4" style={{ borderColor: accent, background: `${accent}15` }}>
      <div className="text-xs uppercase tracking-wider font-bold text-navy/70">Annual Savings</div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 1</div>
          <div className="text-3xl font-extrabold text-navy">{fmtCurrency(r.year1.savings, { compact: true })}</div>
          <div className="text-xs text-navy/70 mt-0.5">{fmtPercent(r.year1.savingsPct, 1)} of current cost</div>
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 2</div>
          <div className="text-3xl font-extrabold" style={{ color: accent }}>{fmtCurrency(r.year2.savings, { compact: true })}</div>
          <div className="text-xs text-navy/70 mt-0.5">{fmtPercent(r.year2.savingsPct, 1)} of current cost</div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t text-xs text-navy/70" style={{ borderColor: `${accent}33` }}>{fteSubtext}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TwoYearRoiHero({ r, accent }: { r: any; accent: string }) {
  return (
    <div className="rounded-xl shadow-card border-4 px-5 py-4" style={{ borderColor: accent, background: `${accent}15` }}>
      <div className="text-xs uppercase tracking-wider font-bold text-navy/70">Return on Investment</div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 1 ROI</div>
          <div className="text-3xl font-extrabold text-navy">{fmtPercent(r.year1.roiPct, 0)}</div>
          <div className="text-xs text-navy/70 mt-0.5">Save {fmtCurrency(r.year1.savings, { compact: true })}</div>
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 2 ROI</div>
          <div className="text-3xl font-extrabold" style={{ color: accent }}>{fmtPercent(r.year2.roiPct, 0)}</div>
          <div className="text-xs text-navy/70 mt-0.5">Save {fmtCurrency(r.year2.savings, { compact: true })}</div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t flex justify-between text-xs" style={{ borderColor: `${accent}33` }}>
        <span className="text-navy/70">Savings %: <strong>Y1 {fmtPercent(r.year1.savingsPct, 0)}</strong> · <strong>Y2 {fmtPercent(r.year2.savingsPct, 0)}</strong></span>
      </div>
    </div>
  );
}

/**
 * Three-year hero used by NFCU and any other model with enableThreeYearView.
 * Shows Y1 / Y2 / Y3 as three columns plus a "3-Year Cumulative Savings"
 * footer band so the rep can lead the RFP conversation with the contract-life
 * total.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ThreeYearHero({ r, accent, savingsFirst, fteSubtext }: {
  r: any; accent: string; savingsFirst: boolean; fteSubtext: React.ReactNode;
}) {
  const headline = savingsFirst ? "3-Year Annual Savings" : "3-Year ROI";
  // Cumulative 3-year ROI = total savings / total Indecomm platform investment
  // across Y1+Y2+Y3 (license + one-time implementation in Y1).
  const cumulativePlatformSpend =
    (r.platform?.year1Spend ?? 0) + (r.platform?.year2Spend ?? 0) + (r.platform?.year3Spend ?? 0);
  const cumulativeRoiPct = cumulativePlatformSpend > 0
    ? r.threeYearCumulativeSavings / cumulativePlatformSpend
    : 0;
  return (
    <div className="rounded-xl shadow-card border-4 px-5 py-4" style={{ borderColor: accent, background: `${accent}15` }}>
      <div className="text-xs uppercase tracking-wider font-bold text-navy/70">{headline}</div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 1</div>
          {savingsFirst ? (
            <>
              <div className="text-2xl font-extrabold text-navy">{fmtCurrency(r.year1.savings, { compact: true })}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtPercent(r.year1.savingsPct, 1)} saved</div>
              <div className="text-[10px] font-semibold text-navy/80 mt-0.5">ROI: {fmtPercent(r.year1.roiPct, 0)}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-navy">{fmtPercent(r.year1.roiPct, 0)}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtCurrency(r.year1.savings, { compact: true })} saved</div>
            </>
          )}
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 2</div>
          {savingsFirst ? (
            <>
              <div className="text-2xl font-extrabold" style={{ color: accent }}>{fmtCurrency(r.year2.savings, { compact: true })}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtPercent(r.year2.savingsPct, 1)} saved</div>
              <div className="text-[10px] font-semibold text-navy/80 mt-0.5">ROI: {fmtPercent(r.year2.roiPct, 0)}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold" style={{ color: accent }}>{fmtPercent(r.year2.roiPct, 0)}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtCurrency(r.year2.savings, { compact: true })} saved</div>
            </>
          )}
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Year 3</div>
          {savingsFirst ? (
            <>
              <div className="text-2xl font-extrabold" style={{ color: accent }}>{fmtCurrency(r.year3.savings, { compact: true })}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtPercent(r.year3.savingsPct, 1)} saved</div>
              <div className="text-[10px] font-semibold text-navy/80 mt-0.5">ROI: {fmtPercent(r.year3.roiPct, 0)}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold" style={{ color: accent }}>{fmtPercent(r.year3.roiPct, 0)}</div>
              <div className="text-[10px] text-navy/70 mt-0.5">{fmtCurrency(r.year3.savings, { compact: true })} saved</div>
            </>
          )}
        </div>
      </div>

      {/* 3-year cumulative banner */}
      <div className="mt-3 pt-3 border-t flex items-baseline justify-between" style={{ borderColor: `${accent}55` }}>
        <span className="text-xs uppercase tracking-wider font-bold text-navy/70">3-Year Cumulative</span>
        <span className="text-xl font-extrabold text-navy">{fmtCurrency(r.threeYearCumulativeSavings, { compact: true })}</span>
      </div>

      {/* 3-year cumulative ROI — the headline contract-life return number. */}
      <div
        className="mt-3 rounded-lg px-4 py-3 flex items-baseline justify-between"
        style={{ background: accent, color: "white" }}
      >
        <span className="text-sm uppercase tracking-wider font-bold opacity-90">3-Year Cumulative ROI</span>
        <span className="text-3xl font-extrabold">{fmtPercent(cumulativeRoiPct, 0)}</span>
      </div>

      <div className="mt-2 pt-2 border-t text-xs text-navy/70" style={{ borderColor: `${accent}33` }}>{fteSubtext}</div>
    </div>
  );
}

/**
 * CapacityHeadline — the "growth story" hero that sits above the existing
 * savings hero for automation models with `tone: "capacity-freed"`.
 *
 * Three metrics, no growth-rate assumption:
 *   1. Volume Multiplier      — "same team can now handle 2.5× today's volume"
 *   2. Additional Monthly Capacity — the incremental loans/apps unlocked
 *   3. FTE Capacity Freed     — redeployable-for-growth headcount
 *
 * Design language mirrors the on-screen savings hero — same border/tint
 * treatment in the platform's accent color — so the two panels read as a
 * matched pair (growth story on top, cost story below).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CapacityHeadline({ r, accent, volumeUnitLabel }: {
  r: any; accent: string; volumeUnitLabel: string;
}) {
  const cap = r.capacity;
  const mult = cap.volumeMultiplier;
  const hasCapacity = mult > 0 && isFinite(mult);
  return (
    <div className="rounded-xl shadow-card border-4 px-5 py-4" style={{ borderColor: accent, background: `${accent}15` }}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider font-bold text-navy/70">Capacity Created</div>
        <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: accent }}>Same team · More work</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Volume Multiplier</div>
          <div className="text-3xl font-extrabold text-navy">
            {hasCapacity ? `${fmtNumber(mult, 1)}×` : "—"}
          </div>
          <div className="text-[10px] text-navy/70 mt-0.5">of today&apos;s volume</div>
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">Additional Capacity</div>
          <div className="text-3xl font-extrabold" style={{ color: accent }}>
            +{fmtNumber(cap.additionalMonthlyVolume, 0)}
          </div>
          <div className="text-[10px] text-navy/70 mt-0.5">{volumeUnitLabel} / month</div>
        </div>
        <div className="border-l pl-3" style={{ borderColor: `${accent}55` }}>
          <div className="text-[10px] uppercase tracking-wider text-navy/60">FTE Capacity Freed</div>
          <div className="text-3xl font-extrabold text-navy">{cap.fteCapacityFreed.toFixed(1)}</div>
          <div className="text-[10px] text-navy/70 mt-0.5">redeployable for growth</div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t text-xs text-navy/70" style={{ borderColor: `${accent}33` }}>
        {hasCapacity ? (
          <>Your existing team can now handle <strong>{fmtNumber(mult, 1)}×</strong> the volume — that&apos;s {" "}
          <strong>{fmtNumber(cap.additionalMonthlyVolume, 0)}</strong> more {volumeUnitLabel}/month before you need to hire.</>
        ) : (
          <>Capacity is fully absorbed by automation — the affected roles are eliminated in the After state.</>
        )}
      </div>
    </div>
  );
}

/**
 * FiveDriversStrip — a compact horizontal band displaying the five
 * dimensions of automation ROI: Productivity, Capacity, Quality, Risk,
 * Scalability. Reinforces the webinar/podcast framework inside the tool.
 *
 * Only Productivity and Capacity have live numbers in this version. Quality,
 * Risk, and Scalability show short qualitative labels — placeholders for a
 * future release where we quantify them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FiveDriversStrip({ r, accent }: { r: any; accent: string }) {
  // Productivity: derive an aggregate labor-lift % from the FTE ratio across
  // direct roles. This is the effective productivity improvement the platform
  // delivers on the current volume.
  const totalBefore = r.internal.roles.reduce((s: number, x: { fteBefore: number }) => s + x.fteBefore, 0);
  const totalAfter = r.internal.roles.reduce((s: number, x: { fteAfter: number }) => s + x.fteAfter, 0);
  const productivityLift = totalBefore > 0 ? 1 - totalAfter / totalBefore : 0;
  const mult = r.capacity.volumeMultiplier;
  const hasCapacity = mult > 0 && isFinite(mult);

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-200 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-navy/70 mb-2">
        The five drivers of automation ROI
      </div>

      {/* Two prominent live drivers — the metrics the engine computes. */}
      <ul className="text-sm text-navy space-y-1">
        <li className="flex items-baseline gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent, transform: "translateY(-2px)" }} />
          <span>
            <strong>Productivity:</strong> +{fmtPercent(productivityLift, 0)} labor lift across all roles
          </span>
        </li>
        <li className="flex items-baseline gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent, transform: "translateY(-2px)" }} />
          <span>
            <strong>Capacity:</strong> {hasCapacity ? `${fmtNumber(mult, 1)}× same-team headroom` : "—"}
          </span>
        </li>
      </ul>

      {/* Three smaller framework drivers — qualitative for now. */}
      <ul className="text-xs text-navy/70 mt-2 pt-2 border-t space-y-0.5" style={{ borderColor: `${accent}22` }}>
        <li className="flex items-baseline gap-2">
          <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: `${accent}88`, transform: "translateY(-2px)" }} />
          <span><strong>Quality:</strong> consistent execution, fewer exceptions and rework</span>
        </li>
        <li className="flex items-baseline gap-2">
          <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: `${accent}88`, transform: "translateY(-2px)" }} />
          <span><strong>Risk:</strong> auditable, better compliance visibility and control</span>
        </li>
        <li className="flex items-baseline gap-2">
          <span className="inline-block w-1 h-1 rounded-full flex-shrink-0" style={{ background: `${accent}88`, transform: "translateY(-2px)" }} />
          <span><strong>Scalability:</strong> market-ready, absorb volume spikes without hiring</span>
        </li>
      </ul>
    </div>
  );
}
