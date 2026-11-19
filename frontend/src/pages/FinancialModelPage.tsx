import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CopyPlus, Download, RotateCcw, Save } from "lucide-react";
import { KpiCard } from "../components/common/KpiCard";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { FinancialAssumptions, FinancialModelOutput, FinancialScenario } from "../types/consulting";
import { downloadCsv, formatMoneyFromUsdM, formatPct } from "../utils/formatters";

type InputTab = "commercial" | "costs" | "capital" | "valuation";
type StatementTab = "pnl" | "cashflow" | "nwc";

export const FinancialModelPage: React.FC = () => {
  const { activeScenarioSlug, setActiveScenarioSlug, scenarios, refreshScenarios, displayCurrency } = useWorkspace();
  const [scenarioMeta, setScenarioMeta] = useState<FinancialScenario | null>(null);
  const [modelOut, setModelOut] = useState<FinancialModelOutput | null>(null);
  const [draft, setDraft] = useState<FinancialAssumptions | null>(null);
  const [inputTab, setInputTab] = useState<InputTab>("commercial");
  const [statementTab, setStatementTab] = useState<StatementTab>("pnl");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const debounceRef = useRef<number | null>(null);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const list = scenarios.length > 0 ? scenarios : (await api.listScenarios()).scenarios;
      const found = list.find((s) => s.slug === activeScenarioSlug) || list[0];
      if (!found) throw new Error("No scenarios found in database.");
      setScenarioMeta(found);
      setModelOut(found);
      setDraft(found.assumptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load financial model.");
    } finally {
      setLoading(false);
    }
  }, [activeScenarioSlug, scenarios]);

  useEffect(() => {
    void loadScenario();
  }, [loadScenario]);

  const triggerLiveRecalc = (next: FinancialAssumptions) => {
    setDraft(next);
    setNotice(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setCalculating(true);
      try {
        const res = await api.calculateFinancials(next);
        setModelOut(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Financial recalculation failed.");
      } finally {
        setCalculating(false);
      }
    }, 180);
  };

  const updateField = <K extends keyof FinancialAssumptions>(key: K, value: FinancialAssumptions[K]) => {
    if (!draft) return;
    triggerLiveRecalc({ ...draft, [key]: value });
  };

  const updateGrowth = (idx: number, val: number) => {
    if (!draft) return;
    const nextRates = [...draft.revenue_growth_rates_pct] as [number, number, number, number];
    nextRates[idx] = val;
    triggerLiveRecalc({ ...draft, revenue_growth_rates_pct: nextRates });
  };

  const handleSaveCurrent = async () => {
    if (!draft || !scenarioMeta) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await api.updateScenario(scenarioMeta.slug, { assumptions: draft });
      setScenarioMeta(saved);
      setModelOut(saved);
      await refreshScenarios();
      setNotice(`Saved updated assumptions to "${saved.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !newCaseName.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const created = await api.createScenario({
        name: newCaseName.trim(),
        description: `Custom case cloned from ${scenarioMeta?.name || "model"}`,
        assumptions: draft,
      });
      await refreshScenarios();
      setActiveScenarioSlug(created.slug);
      setShowSaveAs(false);
      setNewCaseName("");
      setNotice(`Created new persisted scenario "${created.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSystem = async () => {
    if (!scenarioMeta || !scenarioMeta.is_system) return;
    setSaving(true);
    try {
      const reset = await api.resetScenario(scenarioMeta.slug);
      setScenarioMeta(reset);
      setModelOut(reset);
      setDraft(reset.assumptions);
      await refreshScenarios();
      setNotice(`Restored "${reset.name}" to default baseline assumptions.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (!modelOut) return;
    const pnl = modelOut.income_statement;
    const cf = modelOut.cash_flow_statement;
    downloadCsv(
      `financial_model_${scenarioMeta?.slug || "case"}.csv`,
      [
        "Fiscal Year",
        "Revenue ($M)",
        "Total COGS ($M)",
        "Gross Profit ($M)",
        "Gross Margin (%)",
        "EBITDA ($M)",
        "EBITDA Margin (%)",
        "EBIT ($M)",
        "Tax ($M)",
        "Net Income ($M)",
        "CAPEX ($M)",
        "Change in NWC ($M)",
        "FCFF ($M)",
        "Cumulative FCF ($M)",
      ],
      pnl.map((r, i) => [
        r.fiscal_year,
        r.revenue_usd_m,
        r.total_cogs_usd_m,
        r.gross_profit_usd_m,
        r.gross_margin_pct,
        r.ebitda_usd_m,
        r.ebitda_margin_pct,
        r.ebit_usd_m,
        r.tax_usd_m,
        r.net_income_usd_m,
        cf[i].capex_usd_m,
        cf[i].change_nwc_usd_m,
        cf[i].fcff_usd_m,
        cf[i].cumulative_fcf_usd_m,
      ])
    );
  };

  if (loading || !draft || !modelOut) return <LoadingPanel label="Loading 5-year Pandas/NumPy financial engine..." />;
  if (error) return <ErrorPanel message={error} onRetry={() => void loadScenario()} />;

  const { summary, income_statement: pnl, cash_flow_statement: cf } = modelOut;
  const fxUsd = draft.usd_inr_rate;
  const fxJpy = draft.jpy_inr_rate;
  const fmt = (v: number | null | undefined) => formatMoneyFromUsdM(v, displayCurrency, fxUsd, fxJpy);

  const chartData = pnl.map((row, idx) => ({
    year: row.fiscal_year,
    revenue: row.revenue_usd_m,
    ebitda: row.ebitda_usd_m,
    ebitdaMargin: row.ebitda_margin_pct,
    fcff: cf[idx].fcff_usd_m,
    cumFcf: cf[idx].cumulative_fcf_usd_m,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION E"
        title="Five-Year Financial Model & DCF Valuation Workbench"
        subtitle={`Active Case: ${scenarioMeta?.name} · Real-time Pandas/NumPy P&L, Working Capital, FCFF, NPV, IRR, ROI & Break-Even engine`}
        rightSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {calculating ? <span className="font-mono-num text-[11.5px] text-[#0E6B6B]">Computing...</span> : null}
            {scenarioMeta?.is_system ? (
              <button
                type="button"
                onClick={() => void handleResetSystem()}
                disabled={saving}
                className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11.5px] font-medium bg-white border border-[#CBD3DC] text-[#334155] hover:bg-[#F1F3F5] rounded-[3px] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Case
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowSaveAs((v) => !v)}
              className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11.5px] font-medium bg-white border border-[#CBD3DC] text-[#0F2942] hover:bg-[#F1F3F5] rounded-[3px] cursor-pointer"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              Save As New
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCurrent()}
              disabled={saving}
              className="inline-flex items-center gap-1 h-[30px] px-3 text-[11.5px] font-medium bg-[#0F2942] hover:bg-[#193B5C] text-white rounded-[3px] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Case"}
            </button>
          </div>
        }
      />

      {showSaveAs ? (
        <form
          onSubmit={(e) => void handleSaveAsNew(e)}
          className="bg-white border border-[#0F2942] rounded-[4px] p-3 flex flex-wrap items-center gap-2.5"
        >
          <span className="text-[12px] font-semibold text-[#0F2942]">Save current assumptions as new scenario:</span>
          <input
            type="text"
            required
            placeholder="e.g., PLI-Enabled High Export Case"
            value={newCaseName}
            onChange={(e) => setNewCaseName(e.target.value)}
            className="h-[30px] px-2.5 text-[12px] border border-[#CBD3DC] rounded-[3px] min-w-[240px]"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-[30px] px-3 text-[12px] font-medium bg-[#0E6B6B] text-white rounded-[3px] cursor-pointer"
          >
            Create Scenario
          </button>
          <button
            type="button"
            onClick={() => setShowSaveAs(false)}
            className="h-[30px] px-2.5 text-[12px] text-[#5C6B7A] hover:text-[#0F2942] cursor-pointer"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {notice ? (
        <div className="px-3 py-2 bg-[#ECF7F1] border border-[#B7DFC9] text-[#1B6B4A] text-[12px] rounded-[3px]">{notice}</div>
      ) : null}

      {/* Valuation & Return KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="5-Year Cumulative Revenue"
          value={fmt(summary.cumulative_5yr_revenue_usd_m)}
          subtext={`Y5: ${fmt(summary.year5_revenue_usd_m)} (${formatPct(summary.revenue_cagr_5yr_pct)} CAGR)`}
          provenance="DERIVED"
        />
        <KpiCard
          label="Year-5 EBITDA & Margin"
          value={fmt(summary.year5_ebitda_usd_m)}
          subtext={`Y5: ${formatPct(summary.year5_ebitda_margin_pct)} · 5Y Avg: ${formatPct(summary.avg_ebitda_margin_pct)}`}
          provenance="DERIVED"
          tone="teal"
        />
        <KpiCard
          label="Initial Investment (Y0+NWC)"
          value={fmt(summary.total_initial_investment_usd_m)}
          subtext={`CAPEX ${fmt(summary.initial_capex_usd_m)} · Peak: ${fmt(summary.peak_funding_requirement_usd_m)}`}
          provenance="ASSUMPTION"
        />
        <KpiCard
          label="DCF Net Present Value"
          value={fmt(summary.npv_usd_m)}
          subtext={`5Y Ex-TV: ${fmt(summary.npv_5yr_explicit_usd_m)} @ ${formatPct(summary.wacc_pct)}`}
          provenance="DERIVED"
          tone={summary.npv_usd_m >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Project IRR (vs WACC)"
          value={summary.irr_pct !== null ? formatPct(summary.irr_pct) : "N/A"}
          subtext={
            summary.hurdle_spread_pct !== null
              ? `Spread: ${summary.hurdle_spread_pct >= 0 ? "+" : ""}${summary.hurdle_spread_pct.toFixed(1)} pts`
              : "Cash flows negative"
          }
          provenance="DERIVED"
          tone={summary.hurdle_spread_pct !== null && summary.hurdle_spread_pct > 0 ? "positive" : "warning"}
        />
        <KpiCard
          label="Payback / 5-Yr ROI"
          value={summary.simple_payback_years !== null ? `${summary.simple_payback_years.toFixed(2)} yrs` : ">5.0 yrs"}
          subtext={`5Y ROI: ${formatPct(summary.roi_5yr_pct)} · Break-even: ${fmt(summary.breakeven_revenue_usd_m)}`}
          provenance="DERIVED"
        />
      </div>

      {/* Interactive Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Interactive Model Inputs */}
        <SectionPanel
          className="xl:col-span-4"
          title="Model Assumptions Workbench"
          subtitle="Modify inputs to recalculate P&L, FCFF, NPV & IRR immediately"
          actions={<ProvenanceBadge type="ASSUMPTION" compact />}
        >
          {/* Sub-tabs */}
          <div className="grid grid-cols-4 border border-[#CBD3DC] rounded-[3px] overflow-hidden mb-3.5 text-[11px] font-medium">
            {(
              [
                ["commercial", "Revenue"],
                ["costs", "Costs"],
                ["capital", "CAPEX/WC"],
                ["valuation", "Tax/WACC"],
              ] as [InputTab, string][]
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setInputTab(k)}
                className={`py-1.5 cursor-pointer ${
                  inputTab === k ? "bg-[#0F2942] text-white" : "bg-[#FAFBFD] text-[#475569] hover:bg-[#EEF2F6]"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="space-y-3 text-[12px]">
            {inputTab === "commercial" ? (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Year-1 Launch Revenue (FY27, $M)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">${draft.year1_revenue_usd_m.toFixed(1)}M</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={80}
                    step={1}
                    value={draft.year1_revenue_usd_m}
                    onChange={(e) => updateField("year1_revenue_usd_m", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div className="pt-2 border-t border-[#EAEEF2] space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-[#5C6B7A]">Annual Revenue Ramp Growth (%)</div>
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[#334155]">Year {idx + 2} (FY{draft.start_fiscal_year + idx + 1}) YoY</span>
                        <span className="font-mono-num font-semibold text-[#0F2942]">
                          {draft.revenue_growth_rates_pct[idx].toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={150}
                        step={2}
                        value={draft.revenue_growth_rates_pct[idx]}
                        onChange={(e) => updateGrowth(idx, parseFloat(e.target.value))}
                        className="w-full consulting-slider"
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#EAEEF2]">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Export Revenue Share (FX Hedge %)</span>
                    <span className="font-mono-num font-semibold text-[#0E6B6B]">{draft.export_revenue_share_pct.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={draft.export_revenue_share_pct}
                    onChange={(e) => updateField("export_revenue_share_pct", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
              </>
            ) : null}

            {inputTab === "costs" ? (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Year-1 Material COGS (% Rev)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">{draft.cogs_pct_year1.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={56}
                    max={82}
                    step={0.5}
                    value={draft.cogs_pct_year1}
                    onChange={(e) => updateField("cogs_pct_year1", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Localization COGS Step-Down (bps/yr)</span>
                    <span className="font-mono-num font-semibold text-[#0E6B6B]">-{draft.cogs_localization_stepdown_bps} bps</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={10}
                    value={draft.cogs_localization_stepdown_bps}
                    onChange={(e) => updateField("cogs_localization_stepdown_bps", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                {[
                  { key: "direct_labor_overhead_pct" as const, label: "Direct Labor & Plant Overhead (%)", min: 4, max: 16, step: 0.2 },
                  { key: "sga_pct" as const, label: "SG&A Expenses (%)", min: 4, max: 15, step: 0.2 },
                  { key: "rd_engineering_pct" as const, label: "Local R&D / Validation (%)", min: 1, max: 8, step: 0.2 },
                  { key: "royalty_tech_fee_pct" as const, label: "Japan HQ Technical Royalty (%)", min: 0, max: 6, step: 0.25 },
                ].map((c) => (
                  <div key={c.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#334155]">{c.label}</span>
                      <span className="font-mono-num font-semibold text-[#0F2942]">{draft[c.key].toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={draft[c.key]}
                      onChange={(e) => updateField(c.key, parseFloat(e.target.value))}
                      className="w-full consulting-slider"
                    />
                  </div>
                ))}
              </>
            ) : null}

            {inputTab === "capital" ? (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Initial CAPEX (Year 0, $M)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">${draft.initial_capex_usd_m.toFixed(1)}M</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={110}
                    step={2}
                    value={draft.initial_capex_usd_m}
                    onChange={(e) => updateField("initial_capex_usd_m", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Phase-2 Expansion CAPEX (Year 3, $M)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">${draft.expansion_capex_y3_usd_m.toFixed(1)}M</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={1}
                    value={draft.expansion_capex_y3_usd_m}
                    onChange={(e) => updateField("expansion_capex_y3_usd_m", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Maintenance CAPEX (% Revenue)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">{draft.maintenance_capex_pct_rev.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={draft.maintenance_capex_pct_rev}
                    onChange={(e) => updateField("maintenance_capex_pct_rev", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div className="pt-2 border-t border-[#EAEEF2] grid grid-cols-3 gap-2">
                  {[
                    { key: "dso_days" as const, label: "DSO (Days)" },
                    { key: "dio_days" as const, label: "DIO (Days)" },
                    { key: "dpo_days" as const, label: "DPO (Days)" },
                  ].map((w) => (
                    <div key={w.key}>
                      <label className="block text-[10.5px] text-[#5C6B7A] mb-1">{w.label}</label>
                      <input
                        type="number"
                        min={15}
                        max={120}
                        value={draft[w.key]}
                        onChange={(e) => updateField(w.key, Math.max(15, parseFloat(e.target.value) || 30))}
                        className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-[#5C6B7A] bg-[#FAFBFD] border border-[#E5E9EE] p-2 rounded-[3px]">
                  Cash Conversion Cycle:{" "}
                  <strong className="font-mono-num text-[#0F2942]">
                    {Math.round(draft.dso_days + draft.dio_days - draft.dpo_days)} days
                  </strong>{" "}
                  (DSO + DIO − DPO)
                </div>
              </>
            ) : null}

            {inputTab === "valuation" ? (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">WACC / USD Hurdle Rate (%)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">{draft.wacc_pct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    step={0.5}
                    value={draft.wacc_pct}
                    onChange={(e) => updateField("wacc_pct", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#334155]">Terminal Growth Rate (%)</span>
                    <span className="font-mono-num font-semibold text-[#0F2942]">{draft.terminal_growth_pct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6.5}
                    step={0.5}
                    value={draft.terminal_growth_pct}
                    onChange={(e) => updateField("terminal_growth_pct", parseFloat(e.target.value))}
                    className="w-full consulting-slider"
                  />
                </div>
                <div className="pt-2 border-t border-[#EAEEF2] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#334155]">Corporate Tax Rate (%)</span>
                    <ProvenanceBadge type="SOURCED" sourceId="SRC-09" compact />
                  </div>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={40}
                    value={draft.corporate_tax_rate_pct}
                    onChange={(e) => updateField("corporate_tax_rate_pct", parseFloat(e.target.value) || 25.17)}
                    className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
                  />
                  <p className="text-[10.5px] text-[#5C6B7A]">
                    Default 25.17% reflects India Sec 115BAA (Sec 115BAB 17.16% sunset Mar 31, 2024).
                  </p>
                </div>

                <div className="pt-2 border-t border-[#EAEEF2] space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-medium text-[#0F2942]">JV PLI-Auto / State SGST Incentive</span>
                    <input
                      type="checkbox"
                      checked={draft.pli_incentive_enabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        triggerLiveRecalc({
                          ...draft,
                          pli_incentive_enabled: enabled,
                          pli_incentive_pct: enabled && draft.pli_incentive_pct === 0 ? 5.5 : draft.pli_incentive_pct,
                        });
                      }}
                      className="accent-[#0E6B6B]"
                    />
                  </label>
                  {draft.pli_incentive_enabled ? (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#334155]">Effective Incentive Rate (Y2–Y5)</span>
                        <span className="font-mono-num font-semibold text-[#0E6B6B]">{draft.pli_incentive_pct.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={13}
                        step={0.5}
                        value={draft.pli_incentive_pct}
                        onChange={(e) => updateField("pli_incentive_pct", parseFloat(e.target.value))}
                        className="w-full consulting-slider"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="pt-2 border-t border-[#EAEEF2] grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] text-[#5C6B7A] mb-1">USD / INR (SRC-06)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={draft.usd_inr_rate}
                      onChange={(e) => updateField("usd_inr_rate", parseFloat(e.target.value) || 94.0)}
                      className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] text-[#5C6B7A] mb-1">JPY / INR (SRC-06)</label>
                    <input
                      type="number"
                      step={0.01}
                      value={draft.jpy_inr_rate}
                      onChange={(e) => updateField("jpy_inr_rate", parseFloat(e.target.value) || 0.59)}
                      className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </SectionPanel>

        {/* Right Charts + Institutional Financial Statements */}
        <div className="xl:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionPanel title="Revenue, EBITDA & Margin Ramp" subtitle="5-year profitability expansion via localization">
              <div className="h-[225px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10.5, fill: "#475569" }} tickFormatter={(v) => `$${v}M`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10.5, fill: "#0E6B6B" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ fontSize: 11.5, borderColor: "#CBD3DC", borderRadius: 3 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue ($M)" fill="#0F2942" maxBarSize={26} isAnimationActive={false} />
                    <Bar yAxisId="left" dataKey="ebitda" name="EBITDA ($M)" fill="#0E6B6B" maxBarSize={26} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="ebitdaMargin" name="EBITDA %" stroke="#9A6314" strokeWidth={2} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionPanel>

            <SectionPanel title="Annual FCFF & Cumulative Payback" subtitle={`Year-0 Initial CAPEX outflow: ${fmt(modelOut.year0_outflow_usd_m)}`}>
              <div className="h-[225px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis tick={{ fontSize: 10.5, fill: "#475569" }} tickFormatter={(v) => `$${v}M`} />
                    <Tooltip contentStyle={{ fontSize: 11.5, borderColor: "#CBD3DC", borderRadius: 3 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#64748B" strokeDasharray="2 2" />
                    <Bar dataKey="fcff" name="Annual FCFF ($M)" fill="#3B5B7C" maxBarSize={28} isAnimationActive={false} />
                    <Line type="monotone" dataKey="cumFcf" name="Cumulative FCF ($M)" stroke="#1B6B4A" strokeWidth={2.2} dot={{ r: 3.5 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionPanel>
          </div>

          {/* Structured Tabbed Financial Statements */}
          <SectionPanel
            title={`Five-Year Financial Statements (${displayCurrency})`}
            subtitle="All line items calculated live by Pandas/NumPy with statutory Indian Sec 115BAA tax loss carryforward"
            noPadding
            actions={
              <div className="flex items-center gap-2">
                <div className="inline-flex border border-[#CBD3DC] rounded-[3px] overflow-hidden text-[11px] font-medium">
                  {(
                    [
                      ["pnl", "Income Statement"],
                      ["cashflow", "Cash Flow & DCF"],
                      ["nwc", "Working Capital & ROCE"],
                    ] as [StatementTab, string][]
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setStatementTab(k)}
                      className={`px-2.5 py-1 cursor-pointer ${
                        statementTab === k ? "bg-[#0F2942] text-white" : "bg-white text-[#475569] hover:bg-[#F1F3F5]"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-[#CBD3DC] rounded-[3px] bg-white text-[#0F2942] hover:bg-[#F1F3F5] cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              {statementTab === "pnl" ? (
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                      <th className="py-2 px-4 font-semibold">P&amp;L Line Item ({displayCurrency})</th>
                      {pnl.map((r) => (
                        <th key={r.fiscal_year} className="py-2 px-3 font-semibold text-right font-mono-num">
                          {r.fiscal_year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEEF2] font-mono-num">
                    {[
                      { label: "Total Revenue", vals: pnl.map((r) => fmt(r.revenue_usd_m)), bold: true, tint: true },
                      { label: "  Domestic OEM Revenue", vals: pnl.map((r) => fmt(r.domestic_revenue_usd_m)) },
                      { label: "  Export Hub Revenue", vals: pnl.map((r) => fmt(r.export_revenue_usd_m)) },
                      { label: "Material COGS", vals: pnl.map((r) => fmt(r.material_cogs_usd_m)) },
                      { label: "Direct Labor & Plant Overhead", vals: pnl.map((r) => fmt(r.direct_labor_oh_usd_m)) },
                      { label: "Gross Profit", vals: pnl.map((r) => fmt(r.gross_profit_usd_m)), bold: true },
                      { label: "Gross Margin (%)", vals: pnl.map((r) => formatPct(r.gross_margin_pct)), muted: true },
                      { label: "SG&A Expenses", vals: pnl.map((r) => fmt(r.sga_usd_m)) },
                      { label: "R&D / Validation Engineering", vals: pnl.map((r) => fmt(r.rd_usd_m)) },
                      { label: "Japan HQ Technical Royalty", vals: pnl.map((r) => fmt(r.royalty_usd_m)) },
                      { label: "PLI / State Incentive Credit (+)", vals: pnl.map((r) => fmt(r.pli_credit_usd_m)) },
                      { label: "EBITDA", vals: pnl.map((r) => fmt(r.ebitda_usd_m)), bold: true, tint: true },
                      { label: "EBITDA Margin (%)", vals: pnl.map((r) => formatPct(r.ebitda_margin_pct)), muted: true },
                      { label: "Depreciation & Amortization", vals: pnl.map((r) => fmt(r.depreciation_usd_m)) },
                      { label: "EBIT (Operating Profit)", vals: pnl.map((r) => fmt(r.ebit_usd_m)), bold: true },
                      { label: "Corporate Tax (Sec 115BAA)", vals: pnl.map((r) => fmt(r.tax_usd_m)) },
                      { label: "Net Income (PAT)", vals: pnl.map((r) => fmt(r.net_income_usd_m)), bold: true, tint: true },
                      { label: "Net Margin (%)", vals: pnl.map((r) => formatPct(r.net_margin_pct)), muted: true },
                    ].map((row) => (
                      <tr key={row.label} className={row.tint ? "bg-[#F4F8FA]" : "hover:bg-[#FAFBFD]"}>
                        <td
                          className={`py-2 px-4 font-sans ${
                            row.bold ? "font-semibold text-[#0F2942]" : row.muted ? "text-[#5C6B7A] italic" : "text-[#334155]"
                          }`}
                        >
                          {row.label}
                        </td>
                        {row.vals.map((v, idx) => (
                          <td
                            key={idx}
                            className={`py-2 px-3 text-right ${
                              row.bold ? "font-semibold text-[#0F2942]" : row.muted ? "text-[#0E6B6B]" : "text-[#334155]"
                            }`}
                          >
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : statementTab === "cashflow" ? (
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                      <th className="py-2 px-4 font-semibold">Cash Flow &amp; DCF Line ({displayCurrency})</th>
                      {cf.map((r) => (
                        <th key={r.fiscal_year} className="py-2 px-3 font-semibold text-right font-mono-num">
                          {r.fiscal_year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEEF2] font-mono-num">
                    {[
                      { label: "NOPAT (Net Income)", vals: cf.map((r) => fmt(r.nopat_usd_m)) },
                      { label: "+ Depreciation & Amortization", vals: cf.map((r) => fmt(r.depreciation_usd_m)) },
                      { label: "− Change in Net Working Capital", vals: cf.map((r) => fmt(-r.change_nwc_usd_m)) },
                      { label: "− Annual CAPEX (Maint. + Phase-2)", vals: cf.map((r) => fmt(-r.capex_usd_m)) },
                      { label: "Free Cash Flow to Firm (FCFF)", vals: cf.map((r) => fmt(r.fcff_usd_m)), bold: true, tint: true },
                      { label: "Cumulative Cash Flow (incl. Y0 CAPEX)", vals: cf.map((r) => fmt(r.cumulative_fcf_usd_m)), bold: true },
                      { label: "Discount Factor (@ WACC)", vals: cf.map((r) => r.discount_factor.toFixed(4)), muted: true },
                      { label: "Present Value of Annual FCFF", vals: cf.map((r) => fmt(r.pv_fcff_usd_m)), bold: true, tint: true },
                    ].map((row) => (
                      <tr key={row.label} className={row.tint ? "bg-[#F4F8FA]" : "hover:bg-[#FAFBFD]"}>
                        <td className={`py-2 px-4 font-sans ${row.bold ? "font-semibold text-[#0F2942]" : "text-[#334155]"}`}>
                          {row.label}
                        </td>
                        {row.vals.map((v, idx) => (
                          <td key={idx} className={`py-2 px-3 text-right ${row.bold ? "font-semibold text-[#0F2942]" : "text-[#334155]"}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                      <th className="py-2 px-4 font-semibold">Working Capital &amp; Efficiency ({displayCurrency})</th>
                      {cf.map((r) => (
                        <th key={r.fiscal_year} className="py-2 px-3 font-semibold text-right font-mono-num">
                          {r.fiscal_year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEEF2] font-mono-num">
                    {[
                      { label: "Accounts Receivable (DSO)", vals: cf.map((r) => fmt(r.ar_usd_m)) },
                      { label: "Inventory (DIO)", vals: cf.map((r) => fmt(r.inventory_usd_m)) },
                      { label: "Accounts Payable (DPO)", vals: cf.map((r) => fmt(r.ap_usd_m)) },
                      { label: "Net Working Capital (NWC)", vals: cf.map((r) => fmt(r.nwc_usd_m)), bold: true, tint: true },
                      { label: "NWC % of Revenue", vals: cf.map((r) => formatPct(r.nwc_pct_rev)), muted: true },
                      { label: "Return on Capital Employed (ROCE %)", vals: cf.map((r) => formatPct(r.roce_pct)), bold: true },
                    ].map((row) => (
                      <tr key={row.label} className={row.tint ? "bg-[#F4F8FA]" : "hover:bg-[#FAFBFD]"}>
                        <td className={`py-2 px-4 font-sans ${row.bold ? "font-semibold text-[#0F2942]" : "text-[#334155]"}`}>
                          {row.label}
                        </td>
                        {row.vals.map((v, idx) => (
                          <td key={idx} className={`py-2 px-3 text-right ${row.bold ? "font-semibold text-[#0F2942]" : "text-[#334155]"}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Valuation Footnote Bridge */}
            <div className="px-4 py-2.5 bg-[#FAFBFD] border-t border-[#E5E9EE] flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#52606D]">
              <span>
                DCF Bridge: Y0 CAPEX ({fmt(modelOut.year0_outflow_usd_m)}) + PV 5Y FCF ({fmt(summary.npv_5yr_explicit_usd_m + summary.initial_capex_usd_m)}) + PV Terminal Value ({fmt(summary.pv_terminal_value_usd_m)}) ={" "}
                <strong className="font-mono-num text-[#0F2942]">{fmt(summary.npv_usd_m)}</strong>
              </span>
              <span className="font-mono-num text-[11px]">
                Terminal Value (Undiscounted): {fmt(summary.terminal_value_usd_m)}
              </span>
            </div>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
};
