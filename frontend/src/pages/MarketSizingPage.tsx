import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RotateCcw, Save } from "lucide-react";
import { KpiCard } from "../components/common/KpiCard";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { MarketSizingAssumptions, MarketSizingResponse } from "../types/consulting";
import {
  DEFAULT_JPY_INR,
  DEFAULT_USD_INR,
  downloadCsv,
  formatMoneyFromUsdBn,
  formatMoneyFromUsdM,
  formatPct,
} from "../utils/formatters";

export const MarketSizingPage: React.FC = () => {
  const { displayCurrency } = useWorkspace();
  const [data, setData] = useState<MarketSizingResponse | null>(null);
  const [draft, setDraft] = useState<MarketSizingAssumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMarketSizing();
      setData(res);
      setDraft(res.assumptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load TAM/SAM/SOM model.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const updateAssumption = <K extends keyof MarketSizingAssumptions>(key: K, value: MarketSizingAssumptions[K]) => {
    if (!draft) return;
    const next = { ...draft, [key]: value };
    setDraft(next);
    setSaveNotice(null);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setRecalculating(true);
      try {
        const res = await api.calculateMarketSizing(next);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Calculation failed.");
      } finally {
        setRecalculating(false);
      }
    }, 180);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await api.saveMarketSizing(draft);
      setData(res);
      setSaveNotice("Assumptions persisted to database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await api.resetMarketSizing();
      setData(res);
      setDraft(res.assumptions);
      setSaveNotice("Reset to verified baseline parameters.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    downloadCsv(
      "india_auto_components_tam_sam_som.csv",
      ["Fiscal Year", "PV ($B)", "CV ($B)", "EV ($B)", "Other ($B)", "Total TAM ($B)", "SAM ($B)", "SOM ($M)", "SOM % SAM"],
      data.forecast_series.map((r) => [
        r.fiscal_year,
        r.pv_usd_bn,
        r.cv_usd_bn,
        r.ev_usd_bn,
        r.other_usd_bn,
        r.tam_usd_bn,
        r.sam_usd_bn,
        r.som_usd_m,
        r.som_share_of_sam_pct,
      ])
    );
  };

  if (loading || !draft) return <LoadingPanel label="Loading TAM / SAM / SOM analytical workbench..." />;
  if (error || !data) return <ErrorPanel message={error || "No market sizing data."} onRetry={() => void loadInitial()} />;

  const { summary } = data;
  const catFlagMap: Record<string, keyof MarketSizingAssumptions> = {
    engine: "include_engine",
    suspension_braking: "include_suspension_braking",
    drive_transmission: "include_drive_transmission",
    electrical_electronics: "include_electrical_electronics",
    body_chassis: "include_body_chassis",
    interiors: "include_interiors",
    cooling_misc: "include_cooling_misc",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION C"
        title="TAM / SAM / SOM Market Sizing Workbench"
        subtitle="Anchored to ACMA FY2026 turnover ($85.9B). Adjust forward segment CAGRs, addressable product categories, and client SOM ramp curves."
        rightSlot={
          <div className="flex items-center gap-2">
            {recalculating ? (
              <span className="text-[11.5px] text-[#0E6B6B] font-mono-num">Recalculating...</span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[11.5px] font-medium bg-white border border-[#CBD3DC] text-[#334155] hover:bg-[#F1F3F5] rounded-[3px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[11.5px] font-medium bg-[#0F2942] hover:bg-[#193B5C] text-white rounded-[3px] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Assumptions"}
            </button>
          </div>
        }
      />

      {saveNotice ? (
        <div className="px-3 py-2 bg-[#ECF7F1] border border-[#B7DFC9] text-[#1B6B4A] text-[12px] rounded-[3px]">
          {saveNotice}
        </div>
      ) : null}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard
          label="Historical CAGR (FY20–FY26)"
          value={formatPct(summary.historical_cagr_fy20_fy26_pct)}
          subtext="$49.3B (FY20) → $85.9B (FY26)"
          provenance="SOURCED"
          sourceId="SRC-01"
        />
        <KpiCard
          label="Projected FY31 TAM"
          value={formatMoneyFromUsdBn(summary.fy31_tam_usd_bn, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR)}
          subtext={`Blended Forward CAGR: ${formatPct(summary.forward_tam_cagr_fy26_fy31_pct)}`}
          provenance="DERIVED"
        />
        <KpiCard
          label="Addressable FY31 SAM"
          value={formatMoneyFromUsdBn(summary.fy31_sam_usd_bn, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR)}
          subtext={`${formatPct(summary.effective_sam_pct_of_tam)} of TAM · ${summary.selected_category_oem_share_pct}% OEM scope`}
          provenance="DERIVED"
          tone="teal"
        />
        <KpiCard
          label="Target FY31 SOM (Year 5)"
          value={formatMoneyFromUsdM(summary.fy31_som_usd_m, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR)}
          subtext={`FY27 Launch: ${formatMoneyFromUsdM(summary.fy27_som_usd_m, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR)}`}
          provenance="DERIVED"
          tone="positive"
        />
        <KpiCard
          label="Cumulative 5-Yr SOM"
          value={formatMoneyFromUsdM(summary.cumulative_5yr_som_usd_m, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR)}
          subtext={`SOM Ramp CAGR: ${formatPct(summary.forward_som_cagr_fy27_fy31_pct)}`}
          provenance="DERIVED"
        />
      </div>

      {/* Main Split Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Assumptions Panel */}
        <SectionPanel
          className="xl:col-span-4"
          title="Adjustable Market Assumptions"
          subtitle="All controls below modify live Pandas/NumPy projections"
          actions={<ProvenanceBadge type="ASSUMPTION" compact />}
        >
          <div className="space-y-4 text-[12px]">
            {/* Segment Growth Rates */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-2">
                Forward Segment CAGRs (FY27–FY31)
              </h3>
              <div className="space-y-2.5">
                {[
                  { key: "pv_cagr_pct" as const, label: "Passenger Vehicles (PV) CAGR", min: 2, max: 20, step: 0.5 },
                  { key: "cv_cagr_pct" as const, label: "Commercial Vehicles (CV) CAGR", min: 1, max: 18, step: 0.5 },
                  { key: "ev_cagr_pct" as const, label: "EV Components (Ex-Battery) CAGR", min: 8, max: 45, step: 1 },
                  { key: "other_cagr_pct" as const, label: "2W / 3W / Aftermarket CAGR", min: 2, max: 18, step: 0.5 },
                ].map((ctrl) => (
                  <div key={ctrl.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#334155]">{ctrl.label}</span>
                      <span className="font-mono-num font-semibold text-[#0F2942]">{draft[ctrl.key].toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={draft[ctrl.key]}
                      onChange={(e) => updateAssumption(ctrl.key, parseFloat(e.target.value))}
                      className="w-full consulting-slider"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Categories Scope */}
            <div className="pt-3 border-t border-[#E5E9EE]">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-2">
                Target Product Categories (SAM Scope)
              </h3>
              <div className="space-y-1.5">
                {data.categories.map((cat) => {
                  const flagKey = catFlagMap[cat.code];
                  const checked = Boolean(draft[flagKey]);
                  return (
                    <label
                      key={cat.code}
                      className="flex items-center justify-between gap-2 py-1 px-2 rounded-[3px] border border-[#E5E9EE] bg-[#FAFBFD] cursor-pointer hover:bg-[#F1F5F8]"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => updateAssumption(flagKey, e.target.checked)}
                          className="accent-[#0F2942]"
                        />
                        <span className="text-[#1F2937] truncate">{cat.name}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-[#5C6B7A] shrink-0">{cat.oem_share_pct}%</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Addressability & SOM Capture */}
            <div className="pt-3 border-t border-[#E5E9EE] space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6B7A]">
                Tier-1 Filtering & Client SOM Capture
              </h3>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#334155]">Tier-1 Precision Addressability Factor</span>
                  <span className="font-mono-num font-semibold text-[#0F2942]">{draft.tier1_addressable_factor_pct.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  step={1}
                  value={draft.tier1_addressable_factor_pct}
                  onChange={(e) => updateAssumption("tier1_addressable_factor_pct", parseFloat(e.target.value))}
                  className="w-full consulting-slider"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#334155]">Export Hub Uplift Adder</span>
                  <span className="font-mono-num font-semibold text-[#0F2942]">+{draft.export_hub_adder_pct.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={1}
                  value={draft.export_hub_adder_pct}
                  onChange={(e) => updateAssumption("export_hub_adder_pct", parseFloat(e.target.value))}
                  className="w-full consulting-slider"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] text-[#5C6B7A] mb-1">Year-1 SOM (% SAM)</label>
                  <input
                    type="number"
                    min={0.02}
                    max={5}
                    step={0.02}
                    value={draft.som_year1_share_pct}
                    onChange={(e) => updateAssumption("som_year1_share_pct", Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#5C6B7A] mb-1">Year-5 SOM (% SAM)</label>
                  <input
                    type="number"
                    min={0.05}
                    max={10}
                    step={0.05}
                    value={draft.som_year5_share_pct}
                    onChange={(e) => updateAssumption("som_year5_share_pct", Math.max(0.02, parseFloat(e.target.value) || 0.02))}
                    className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#5C6B7A] mb-1">Commercial Ramp Curve</label>
                <select
                  value={draft.ramp_curve}
                  onChange={(e) =>
                    updateAssumption("ramp_curve", e.target.value as MarketSizingAssumptions["ramp_curve"])
                  }
                  className="w-full h-[30px] px-2 bg-white border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
                >
                  <option value="s_curve">S-Curve (Standard OEM Nomination Ramp)</option>
                  <option value="linear">Linear (Uniform Share Capture)</option>
                  <option value="backloaded">Back-Loaded (Conservative Early Ramp)</option>
                </select>
              </div>
            </div>
          </div>
        </SectionPanel>

        {/* Right Analytical Outputs */}
        <div className="xl:col-span-8 space-y-4">
          <SectionPanel
            title="Five-Year TAM, SAM & Client SOM Trajectory (FY27–FY31)"
            subtitle="Stacked TAM composition by segment (left axis, $B) overlaid with Client SOM revenue potential (right axis, $M)"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.forecast_series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                  <XAxis dataKey="fiscal_year" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}B`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#0E6B6B" }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                  <Legend wrapperStyle={{ fontSize: 11.5 }} />
                  <Bar yAxisId="left" dataKey="pv_usd_bn" stackId="tam" name="PV ($B)" fill="#0F2942" maxBarSize={42} isAnimationActive={false} />
                  <Bar yAxisId="left" dataKey="cv_usd_bn" stackId="tam" name="CV ($B)" fill="#3B5B7C" maxBarSize={42} isAnimationActive={false} />
                  <Bar yAxisId="left" dataKey="ev_usd_bn" stackId="tam" name="EV ($B)" fill="#0E6B6B" maxBarSize={42} isAnimationActive={false} />
                  <Bar yAxisId="left" dataKey="other_usd_bn" stackId="tam" name="2W/3W/Other ($B)" fill="#CBD5E1" maxBarSize={42} isAnimationActive={false} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sam_usd_bn"
                    name="Addressable SAM ($B)"
                    fill="#E6F4F4"
                    fillOpacity={0.35}
                    stroke="#0E6B6B"
                    strokeDasharray="4 2"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="som_usd_m"
                    name="Target SOM ($M)"
                    stroke="#9A6314"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#9A6314" }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>

          {/* FY31 TAM -> SAM -> SOM Funnel */}
          <SectionPanel
            title="FY2031 Market Sizing Funnel (TAM → SAM → SOM)"
            subtitle="Step-down derivation explicitly distinguishing sourced baselines from model filters"
          >
            <div className="space-y-2.5">
              {data.funnel_fy31.map((step) => {
                const widthPct = Math.max(3, Math.min(100, step.pct_of_tam));
                return (
                  <div key={step.stage} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0F2942]">{step.stage}</span>
                        <ProvenanceBadge type={step.provenance} compact />
                      </div>
                      <div className="font-mono-num font-semibold text-[#0F2942]">
                        {step.value_usd_bn < 1
                          ? `$${(step.value_usd_bn * 1000).toFixed(1)}M`
                          : `$${step.value_usd_bn.toFixed(2)}B`}{" "}
                        <span className="text-[#5C6B7A] font-normal">({step.pct_of_tam.toFixed(step.pct_of_tam < 1 ? 2 : 1)}% of TAM)</span>
                      </div>
                    </div>
                    <div className="w-full h-[9px] bg-[#EEF1F5] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full bg-[#0F2942]"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: step.stage.includes("SOM")
                            ? "#9A6314"
                            : step.stage.includes("SAM")
                            ? "#0E6B6B"
                            : "#0F2942",
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#5C6B7A]">{step.note}</p>
                  </div>
                );
              })}
            </div>
          </SectionPanel>

          {/* Granular Year-by-Year Schedule Table */}
          <SectionPanel
            title="Projected Market Sizing Schedule (FY27–FY31)"
            subtitle="All projected figures are derived from ACMA FY26 baseline + active assumptions"
            noPadding
            actions={
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-[#CBD3DC] rounded-[3px] bg-white text-[#0F2942] hover:bg-[#F1F3F5] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                    <th className="py-2 px-3 font-semibold">Year</th>
                    <th className="py-2 px-3 font-semibold text-right">PV ($B)</th>
                    <th className="py-2 px-3 font-semibold text-right">CV ($B)</th>
                    <th className="py-2 px-3 font-semibold text-right">EV ($B)</th>
                    <th className="py-2 px-3 font-semibold text-right">Total TAM ($B)</th>
                    <th className="py-2 px-3 font-semibold text-right">SAM ($B)</th>
                    <th className="py-2 px-3 font-semibold text-right">SOM Share</th>
                    <th className="py-2 px-3 font-semibold text-right">Target SOM ($M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEEF2] font-mono-num">
                  {data.forecast_series.map((r) => (
                    <tr key={r.fiscal_year} className="hover:bg-[#FAFBFD]">
                      <td className="py-2 px-3 font-semibold text-[#0F2942]">{r.fiscal_year}</td>
                      <td className="py-2 px-3 text-right">${r.pv_usd_bn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">${r.cv_usd_bn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#0E6B6B] font-medium">${r.ev_usd_bn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-[#0F2942]">${r.tam_usd_bn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-[#0E6B6B]">${r.sam_usd_bn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[#5C6B7A]">{r.som_share_of_sam_pct.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-semibold text-[#9A6314]">${r.som_usd_m.toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
};
