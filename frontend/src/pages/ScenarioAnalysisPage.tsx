import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2 } from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { FinancialScenario, SensitivityResponse } from "../types/consulting";
import { DEFAULT_JPY_INR, DEFAULT_USD_INR, formatMoneyFromUsdM, formatPct } from "../utils/formatters";

export const ScenarioAnalysisPage: React.FC = () => {
  const { activeScenarioSlug, setActiveScenarioSlug, refreshScenarios, displayCurrency } = useWorkspace();
  const [scenarios, setScenarios] = useState<FinancialScenario[]>([]);
  const [sensitivity, setSensitivity] = useState<SensitivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scRes, sensRes] = await Promise.all([
        api.listScenarios(),
        api.getSensitivity(activeScenarioSlug),
      ]);
      setScenarios(scRes.scenarios);
      setSensitivity(sensRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scenario & sensitivity analytics.");
    } finally {
      setLoading(false);
    }
  }, [activeScenarioSlug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDeleteCustom = async (slug: string) => {
    try {
      await api.deleteScenario(slug);
      if (activeScenarioSlug === slug) setActiveScenarioSlug("base");
      await refreshScenarios();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete custom scenario.");
    }
  };

  if (loading) return <LoadingPanel label="Computing multi-scenario stress tests and 2D DCF sensitivity..." />;
  if (error || !sensitivity) return <ErrorPanel message={error || "No sensitivity data."} onRetry={() => void loadData()} />;

  const fmt = (v: number | null | undefined) => formatMoneyFromUsdM(v, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR);

  const cons = scenarios.find((s) => s.slug === "conservative");
  const base = scenarios.find((s) => s.slug === "base");
  const opt = scenarios.find((s) => s.slug === "optimistic");

  const trajectoryData = (base?.income_statement || []).map((row, idx) => ({
    year: row.fiscal_year,
    conservativeRev: cons?.income_statement[idx]?.revenue_usd_m ?? 0,
    baseRev: row.revenue_usd_m,
    optimisticRev: opt?.income_statement[idx]?.revenue_usd_m ?? 0,
    conservativeFcf: cons?.cash_flow_statement[idx]?.cumulative_fcf_usd_m ?? 0,
    baseFcf: base?.cash_flow_statement[idx]?.cumulative_fcf_usd_m ?? 0,
    optimisticFcf: opt?.cash_flow_statement[idx]?.cumulative_fcf_usd_m ?? 0,
  }));

  const tornadoData = sensitivity.tornado.drivers.map((d) => ({
    driver: d.driver,
    downsideDelta: d.downside_delta_usd_m,
    upsideDelta: d.upside_delta_usd_m,
    shockRange: d.shock_range,
    downsideNpv: d.downside_npv_usd_m,
    upsideNpv: d.upside_npv_usd_m,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION F"
        title="Scenario Comparison & DCF Sensitivity Analysis"
        subtitle="Stress-test Conservative, Base, Optimistic, and custom saved models via one-way Tornado and 2D WACC × COGS heatmaps."
        rightSlot={<ProvenanceBadge type="DERIVED" sourceId={`Sensitivity Base: ${sensitivity.scenario_name}`} />}
      />

      {/* Full Scenario Comparison Table */}
      <SectionPanel
        title="Multi-Scenario Assumption & Performance Matrix"
        subtitle="Compare key inputs and derived financial outcomes side-by-side (click any case to set as active sensitivity base)"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2.5 px-4 font-semibold">Scenario</th>
                <th className="py-2.5 px-3 font-semibold text-right">Y1 Rev</th>
                <th className="py-2.5 px-3 font-semibold text-right">Y1 COGS %</th>
                <th className="py-2.5 px-3 font-semibold text-right">Init CAPEX</th>
                <th className="py-2.5 px-3 font-semibold text-right">WACC</th>
                <th className="py-2.5 px-3 font-semibold text-right">5-Yr Rev</th>
                <th className="py-2.5 px-3 font-semibold text-right">Y5 EBITDA %</th>
                <th className="py-2.5 px-3 font-semibold text-right">NPV (Incl. TV)</th>
                <th className="py-2.5 px-3 font-semibold text-right">IRR</th>
                <th className="py-2.5 px-3 font-semibold text-right">Payback</th>
                <th className="py-2.5 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2] font-mono-num">
              {scenarios.map((sc) => {
                const isActive = sc.slug === activeScenarioSlug;
                return (
                  <tr
                    key={sc.slug}
                    onClick={() => setActiveScenarioSlug(sc.slug)}
                    className={`cursor-pointer transition-colors ${isActive ? "bg-[#EDF5F5]" : "hover:bg-[#FAFBFD]"}`}
                  >
                    <td className="py-2.5 px-4 font-sans">
                      <div className="font-semibold text-[#0F2942] flex items-center gap-1.5">
                        <span>{sc.name}</span>
                        {isActive ? (
                          <span className="text-[9.5px] font-mono-num uppercase px-1.5 py-0.5 bg-[#0F2942] text-white rounded-[2px]">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-[#5C6B7A] line-clamp-1">{sc.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">{fmt(sc.assumptions.year1_revenue_usd_m)}</td>
                    <td className="py-2.5 px-3 text-right">{formatPct(sc.assumptions.cogs_pct_year1)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(sc.assumptions.initial_capex_usd_m)}</td>
                    <td className="py-2.5 px-3 text-right">{formatPct(sc.assumptions.wacc_pct)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#0F2942]">
                      {fmt(sc.summary.cumulative_5yr_revenue_usd_m)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatPct(sc.summary.year5_ebitda_margin_pct)}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        sc.summary.npv_usd_m >= 0 ? "text-[#1B6B4A]" : "text-[#9B2C2C]"
                      }`}
                    >
                      {fmt(sc.summary.npv_usd_m)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sc.summary.irr_pct !== null ? formatPct(sc.summary.irr_pct) : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sc.summary.simple_payback_years !== null ? `${sc.summary.simple_payback_years.toFixed(2)}y` : ">5y"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!sc.is_system ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteCustom(sc.slug);
                          }}
                          className="p-1 text-[#9B2C2C] hover:bg-[#FDF0F0] rounded-[2px] cursor-pointer"
                          title="Delete custom scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10.5px] text-[#8A97A6] font-sans">System</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Scenario Trajectory Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionPanel title="5-Year Revenue Trajectory by Scenario" subtitle="Annual revenue ramp across Conservative, Base, and Optimistic cases ($M)">
          <div className="h-[245px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <Line type="monotone" dataKey="optimisticRev" name="Optimistic" stroke="#1B6B4A" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="baseRev" name="Base Case" stroke="#0F2942" strokeWidth={2.5} dot={{ r: 3.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="conservativeRev" name="Conservative" stroke="#9B2C2C" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Cumulative Cash Flow & Payback Envelope" subtitle="Zero-line crossover marks simple cash payback timing ($M)">
          <div className="h-[245px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <ReferenceLine y={0} stroke="#64748B" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="optimisticFcf" name="Optimistic Cum. FCF" stroke="#1B6B4A" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="baseFcf" name="Base Cum. FCF" stroke="#0F2942" strokeWidth={2.5} dot={{ r: 3.5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="conservativeFcf" name="Conservative Cum. FCF" stroke="#9B2C2C" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* Tornado Chart + 2D Heatmap Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          className="xl:col-span-6"
          title={`One-Way NPV Tornado Sensitivity (${sensitivity.scenario_name})`}
          subtitle={`NPV delta ($M) from baseline ${fmt(sensitivity.tornado.base_npv_usd_m)} sorted by valuation impact`}
        >
          <div className="h-[275px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tornadoData} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `${v >= 0 ? "+" : ""}$${v}M`} />
                <YAxis dataKey="driver" type="category" width={155} tick={{ fontSize: 10.5, fill: "#1F2937" }} />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v >= 0 ? "+" : ""}$${v.toFixed(1)}M`, name]}
                  contentStyle={{ fontSize: 11.5, borderColor: "#CBD3DC", borderRadius: 3 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={0} stroke="#0F2942" />
                <Bar dataKey="downsideDelta" name="Downside Impact ($M)" fill="#9B2C2C" radius={[2, 0, 0, 2]} maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="upsideDelta" name="Upside Impact ($M)" fill="#0E6B6B" radius={[0, 2, 2, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-6"
          title="2D Valuation Sensitivity Grid: WACC (%) × Year-1 Material COGS (%)"
          subtitle={`Cell values show DCF NPV (${displayCurrency}); dark outline marks active baseline coordinate`}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px] font-mono-num">
              <thead>
                <tr>
                  <th className="py-2 px-2.5 bg-[#F4F6F8] border border-[#DCE1E7] text-left font-sans text-[10.5px] uppercase text-[#52606D]">
                    WACC \ COGS
                  </th>
                  {sensitivity.two_way.cogs_values.map((c) => (
                    <th
                      key={c}
                      className={`py-2 px-2 border border-[#DCE1E7] text-right font-semibold ${
                        c === sensitivity.two_way.base_cogs_pct ? "bg-[#0F2942] text-white" : "bg-[#F4F6F8] text-[#0F2942]"
                      }`}
                    >
                      {c.toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensitivity.two_way.matrix.map((row) => (
                  <tr key={row.wacc_pct}>
                    <td
                      className={`py-2 px-2.5 border border-[#DCE1E7] font-semibold ${
                        row.wacc_pct === sensitivity.two_way.base_wacc_pct
                          ? "bg-[#0F2942] text-white"
                          : "bg-[#F4F6F8] text-[#0F2942]"
                      }`}
                    >
                      {row.wacc_pct.toFixed(1)}%
                    </td>
                    {row.cells.map((cell) => {
                      const isBaseCell =
                        cell.wacc_pct === sensitivity.two_way.base_wacc_pct &&
                        cell.cogs_pct === sensitivity.two_way.base_cogs_pct;
                      let bg = "bg-[#ECF7F1] text-[#145338]";
                      if (cell.npv_usd_m < 0) bg = "bg-[#FDF0F0] text-[#9B2C2C]";
                      else if (cell.npv_usd_m < 25) bg = "bg-[#FDF6E9] text-[#8A5610]";
                      else if (cell.npv_usd_m > 75) bg = "bg-[#DCF0E8] text-[#0F4C3A]";

                      return (
                        <td
                          key={`${cell.wacc_pct}-${cell.cogs_pct}`}
                          className={`py-2.5 px-2 border text-right ${bg} ${
                            isBaseCell ? "border-2 border-[#0F2942] font-bold" : "border-[#DCE1E7]"
                          }`}
                          title={`WACC ${cell.wacc_pct}%, COGS ${cell.cogs_pct}% -> IRR ${cell.irr_pct ?? "N/A"}%`}
                        >
                          <div>{fmt(cell.npv_usd_m)}</div>
                          <div className="text-[9.5px] opacity-75">
                            {cell.irr_pct !== null ? `${cell.irr_pct.toFixed(1)}% IRR` : "N/A"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-[#5C6B7A]">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-[#DCF0E8] border border-[#B7DFC9] inline-block" /> Strong Value Creation (&gt;$75M)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-[#ECF7F1] border border-[#C6E5D4] inline-block" /> Positive ($25M–$75M)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-[#FDF6E9] border border-[#E6CE9E] inline-block" /> Marginal ($0–$25M)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-[#FDF0F0] border border-[#E6B8B8] inline-block" /> Value Destructive (&lt;$0)
            </span>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
};
