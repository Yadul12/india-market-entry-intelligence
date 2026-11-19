import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { KpiCard } from "../components/common/KpiCard";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { ExecutiveSummaryResponse } from "../types/consulting";
import { formatMoneyFromUsdBn, formatMoneyFromUsdM, formatPct } from "../utils/formatters";

export const ExecutiveSummaryPage: React.FC = () => {
  const { activeScenarioSlug, displayCurrency } = useWorkspace();
  const [data, setData] = useState<ExecutiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getExecutiveSummary(activeScenarioSlug);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executive summary.");
    } finally {
      setLoading(false);
    }
  }, [activeScenarioSlug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) return <LoadingPanel label="Synthesizing executive decision summary..." />;
  if (error || !data) return <ErrorPanel message={error || "No data returned."} onRetry={() => void loadData()} />;

  const { recommendation, market_sizing_summary: ms, active_financials: fin, strategy_evaluation: strat, risk_summary } = data;
  const fxUsd = fin.assumptions.usd_inr_rate;
  const fxJpy = fin.assumptions.jpy_inr_rate;

  const verdictStyle =
    recommendation.verdict_code === "GO"
      ? {
          border: "border-l-[#1B6B4A]",
          bg: "bg-[#F3FAF6]",
          badgeBg: "bg-[#1B6B4A]",
          icon: <CheckCircle2 className="w-4 h-4 text-[#1B6B4A] shrink-0 mt-0.5" />,
        }
      : recommendation.verdict_code === "CONDITIONAL_GO"
      ? {
          border: "border-l-[#9A6314]",
          bg: "bg-[#FDF9F0]",
          badgeBg: "bg-[#9A6314]",
          icon: <AlertCircle className="w-4 h-4 text-[#9A6314] shrink-0 mt-0.5" />,
        }
      : {
          border: "border-l-[#9B2C2C]",
          bg: "bg-[#FDF3F3]",
          badgeBg: "bg-[#9B2C2C]",
          icon: <XCircle className="w-4 h-4 text-[#9B2C2C] shrink-0 mt-0.5" />,
        };

  const financialChartData = fin.income_statement.map((row, idx) => ({
    year: row.fiscal_year,
    revenue: row.revenue_usd_m,
    ebitda: row.ebitda_usd_m,
    cumFcf: fin.cash_flow_statement[idx]?.cumulative_fcf_usd_m ?? 0,
  }));

  const shortStrategyLabel = (key: string, fallback: string) => {
    const map: Record<string, string> = {
      joint_venture: "Majority Joint Venture",
      acquisition: "Brownfield Acquisition",
      strategic_partnership: "Strategic Partnership",
      greenfield: "Greenfield (100% WOS)",
    };
    return map[key] || fallback.split("(")[0].trim();
  };

  const strategyChartData = strat.ranked_strategies.map((s) => ({
    name: shortStrategyLabel(s.strategy_key, s.name),
    score: s.weighted_score,
    isTop: s.rank === 1,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION A"
        title="Executive Summary & Board Decision Brief"
        subtitle={`${data.client_profile.name} (${data.client_profile.origin}) — ${data.client_profile.planning_horizon}`}
        rightSlot={
          <div className="flex items-center gap-2">
            <ProvenanceBadge type="SOURCED" sourceId="ACMA / SIAM / MHI / RBI" />
            <ProvenanceBadge type="DERIVED" sourceId={data.active_scenario.name} />
          </div>
        }
      />

      {/* Dynamic Executive Verdict Banner */}
      <div
        className={`border border-[#DCE1E7] border-l-4 ${verdictStyle.border} ${verdictStyle.bg} rounded-[4px] p-4`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 max-w-4xl">
            {verdictStyle.icon}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 text-[10.5px] font-mono-num font-semibold text-white rounded-[2px] ${verdictStyle.badgeBg}`}>
                  {recommendation.verdict}
                </span>
                <span className="text-[11.5px] text-[#5C6B7A] font-medium">
                  Active Financial Case: <strong className="text-[#0F2942]">{data.active_scenario.name}</strong>
                </span>
              </div>
              <p className="text-[13px] text-[#1F2937] mt-1.5 leading-relaxed">{recommendation.verdict_rationale}</p>
            </div>
          </div>
          <Link
            to="/entry-strategy"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0F2942] hover:text-[#0E6B6B] shrink-0"
          >
            Full Recommendation Dossier
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Institutional 5-KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard
          label="India Auto Comp. TAM (FY26)"
          value={formatMoneyFromUsdBn(ms.fy26_tam_usd_bn, displayCurrency, fxUsd, fxJpy)}
          subtext={`FY31 Proj: ${formatMoneyFromUsdBn(ms.fy31_tam_usd_bn, displayCurrency, fxUsd, fxJpy)} (${formatPct(ms.forward_tam_cagr_fy26_fy31_pct)} CAGR)`}
          provenance="SOURCED"
          sourceId="SRC-01"
        />
        <KpiCard
          label="Addressable SAM (FY31)"
          value={formatMoneyFromUsdBn(ms.fy31_sam_usd_bn, displayCurrency, fxUsd, fxJpy)}
          subtext={`FY31 SOM: ${formatMoneyFromUsdM(ms.fy31_som_usd_m, displayCurrency, fxUsd, fxJpy)} (${formatPct(ms.effective_sam_pct_of_tam)} of TAM)`}
          provenance="DERIVED"
          tone="teal"
        />
        <KpiCard
          label={`Net Present Value (${data.active_scenario.scenario_type})`}
          value={formatMoneyFromUsdM(fin.summary.npv_usd_m, displayCurrency, fxUsd, fxJpy)}
          subtext={`5Y Ex-TV: ${formatMoneyFromUsdM(fin.summary.npv_5yr_explicit_usd_m, displayCurrency, fxUsd, fxJpy)} @ ${formatPct(fin.summary.wacc_pct)} WACC`}
          provenance="DERIVED"
          tone={fin.summary.npv_usd_m >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Project IRR & Payback"
          value={fin.summary.irr_pct !== null ? formatPct(fin.summary.irr_pct) : "N/A"}
          subtext={`Payback: ${fin.summary.simple_payback_years !== null ? `${fin.summary.simple_payback_years.toFixed(2)} yrs` : ">5 yrs"} · 5Y ROI: ${formatPct(fin.summary.roi_5yr_pct)}`}
          provenance="DERIVED"
          tone={fin.summary.hurdle_spread_pct !== null && fin.summary.hurdle_spread_pct > 0 ? "positive" : "warning"}
        />
        <KpiCard
          label="Top Entry Strategy"
          value={recommendation.recommended_entry_mode.name.split("(")[0].trim()}
          subtext={`MCDA Score ${recommendation.recommended_entry_mode.weighted_score.toFixed(2)}/10 (+${strat.score_lead_over_second.toFixed(2)} vs #2)`}
          provenance="DERIVED"
          tone="default"
        />
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          className="xl:col-span-7"
          title={`Five-Year Revenue, EBITDA & Cumulative Cash Flow (${data.active_scenario.name})`}
          subtitle="Derived via Pandas/NumPy engine (USD Millions; cumulative cash flow includes Year-0 initial CAPEX)"
          actions={
            <Link to="/financial-model" className="text-[11.5px] font-medium text-[#0E6B6B] hover:underline">
              Open Financial Model →
            </Link>
          }
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financialChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatMoneyFromUsdM(value, displayCurrency, fxUsd, fxJpy),
                    name,
                  ]}
                  contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }}
                />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <ReferenceLine y={0} stroke="#64748B" strokeDasharray="2 2" />
                <Bar dataKey="revenue" name="Revenue" fill="#0F2942" radius={[2, 2, 0, 0]} maxBarSize={34} isAnimationActive={false} />
                <Bar dataKey="ebitda" name="EBITDA" fill="#0E6B6B" radius={[2, 2, 0, 0]} maxBarSize={34} isAnimationActive={false} />
                <Line
                  type="monotone"
                  dataKey="cumFcf"
                  name="Cumulative Cash Flow"
                  stroke="#9A6314"
                  strokeWidth={2.2}
                  dot={{ r: 3.5, fill: "#9A6314" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-5"
          title="Market Entry Mode Weighted Evaluation"
          subtitle="5-criteria weighted MCDA ranking (10-point institutional scale)"
          actions={
            <Link to="/entry-strategy" className="text-[11.5px] font-medium text-[#0E6B6B] hover:underline">
              Adjust Weights →
            </Link>
          }
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={strategyChartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis dataKey="name" type="category" width={132} tick={{ fontSize: 11, fill: "#1F2937" }} />
                <Tooltip
                  formatter={(val: number) => [`${val.toFixed(2)} / 10`, "Weighted Score"]}
                  contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }}
                />
                <Bar dataKey="score" radius={[0, 2, 2, 0]} maxBarSize={26} isAnimationActive={false}>
                  {strategyChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isTop ? "#0E6B6B" : "#64748B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* Three-Pillar Strategic Synthesis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionPanel title="1. Capital & Return Envelope" subtitle="Derived from active 5-year financial case">
          <dl className="divide-y divide-[#EEF1F5] text-[12.5px]">
            <div className="py-2 flex justify-between">
              <dt className="text-[#5C6B7A]">Initial CAPEX (Year 0)</dt>
              <dd className="font-mono-num font-semibold text-[#0F2942]">
                {formatMoneyFromUsdM(fin.summary.initial_capex_usd_m, displayCurrency, fxUsd, fxJpy)}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-[#5C6B7A]">Initial Working Capital (Y1)</dt>
              <dd className="font-mono-num font-semibold text-[#0F2942]">
                {formatMoneyFromUsdM(fin.summary.initial_nwc_usd_m, displayCurrency, fxUsd, fxJpy)}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-[#5C6B7A]">Peak Funding Requirement</dt>
              <dd className="font-mono-num font-semibold text-[#0F2942]">
                {formatMoneyFromUsdM(fin.summary.peak_funding_requirement_usd_m, displayCurrency, fxUsd, fxJpy)}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-[#5C6B7A]">Year-5 Revenue & EBITDA Margin</dt>
              <dd className="font-mono-num font-semibold text-[#0E6B6B]">
                {formatMoneyFromUsdM(fin.summary.year5_revenue_usd_m, displayCurrency, fxUsd, fxJpy)} · {formatPct(fin.summary.year5_ebitda_margin_pct)}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-[#5C6B7A]">EBITDA / EBIT Break-Even Year</dt>
              <dd className="font-mono-num font-semibold text-[#0F2942]">
                {fin.summary.ebitda_positive_year} / {fin.summary.ebit_positive_year}
              </dd>
            </div>
          </dl>
        </SectionPanel>

        <SectionPanel title="2. Target Clusters & Segments" subtitle="Prioritized OEM & regional entry sequence">
          <div className="space-y-2.5 text-[12px]">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-1">
                Top Ranked Clusters (Composite Fit)
              </div>
              {recommendation.target_regions.slice(0, 3).map((c, i) => (
                <div key={c.cluster_id} className="flex items-center justify-between py-1 border-b border-[#F1F3F5] last:border-0">
                  <span className="text-[#1F2937] font-medium">
                    {i + 1}. {c.name.split("(")[0].trim()}
                  </span>
                  <span className="font-mono-num font-semibold text-[#0E6B6B]">{c.composite_fit_score}/10</span>
                </div>
              ))}
            </div>
            <div className="pt-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-1">
                Priority Customer Mix
              </div>
              {recommendation.preferred_customer_segments.map((seg) => (
                <div key={seg.segment} className="flex items-center justify-between py-1">
                  <span className="text-[#334155] truncate pr-2">{seg.segment.split("(")[0].trim()}</span>
                  <span className="font-mono-num text-[#0F2942] font-semibold shrink-0">{seg.target_revenue_mix_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="3. Risk Exposure & Mitigation"
          subtitle={`${risk_summary.total_risks} risks assessed across 6 domains`}
          actions={
            <Link to="/risk-assessment" className="text-[11.5px] font-medium text-[#0E6B6B] hover:underline">
              Risk Matrix →
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#FAFBFD] border border-[#E5E9EE] rounded-[3px] p-2">
              <div className="text-[10px] uppercase text-[#5C6B7A] font-semibold">Avg Inherent → Residual</div>
              <div className="font-mono-num text-[14px] font-semibold text-[#0F2942] mt-0.5">
                {risk_summary.avg_inherent_score.toFixed(1)} → <span className="text-[#1B6B4A]">{risk_summary.avg_residual_score.toFixed(1)}</span>
              </div>
            </div>
            <div className="bg-[#FAFBFD] border border-[#E5E9EE] rounded-[3px] p-2">
              <div className="text-[10px] uppercase text-[#5C6B7A] font-semibold">Mitigation Budget</div>
              <div className="font-mono-num text-[14px] font-semibold text-[#0F2942] mt-0.5">
                {formatMoneyFromUsdM(risk_summary.total_mitigation_cost_usd_m, displayCurrency, fxUsd, fxJpy)}
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-[11.5px]">
            {data.top_risks.slice(0, 3).map((r) => (
              <div key={r.risk_code} className="flex items-start justify-between gap-2 py-1 border-b border-[#F1F3F5] last:border-0">
                <span className="text-[#1F2937] leading-snug">
                  <strong className="font-mono-num text-[#0F2942]">{r.risk_code}</strong> {r.title}
                </span>
                <span className="font-mono-num text-[10.5px] px-1.5 py-0.5 rounded-[2px] bg-[#FDF6E9] text-[#9A6314] shrink-0">
                  {r.inherent_score}→{r.residual_score}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      {/* Scenario Stress-Test Summary Table */}
      <SectionPanel
        title="Cross-Scenario Financial Comparison"
        subtitle="Real-time comparison across Conservative, Base, and Optimistic cases"
        noPadding
        actions={
          <Link to="/scenarios" className="text-[11.5px] font-medium text-[#0E6B6B] hover:underline">
            Sensitivity & Scenarios →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2.5 px-4 font-semibold">Scenario Case</th>
                <th className="py-2.5 px-4 font-semibold text-right">Year-5 Revenue</th>
                <th className="py-2.5 px-4 font-semibold text-right">Y5 EBITDA Margin</th>
                <th className="py-2.5 px-4 font-semibold text-right">NPV (Incl. TV)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Project IRR</th>
                <th className="py-2.5 px-4 font-semibold text-right">5-Year ROI</th>
                <th className="py-2.5 px-4 font-semibold text-right">Simple Payback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2]">
              {(["conservative", "base", "optimistic"] as const).map((key) => {
                const row = recommendation.expected_financial_performance[key];
                const isBase = key === "base";
                return (
                  <tr key={key} className={isBase ? "bg-[#F4FAFA] font-medium" : "hover:bg-[#FAFBFD]"}>
                    <td className="py-2.5 px-4 text-[#0F2942] font-semibold">
                      {key === "base"
                        ? "Base Case (Recommended)"
                        : key === "conservative"
                        ? "Conservative Case"
                        : "Optimistic Case"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num">
                      {formatMoneyFromUsdM(row.year5_revenue_usd_m, displayCurrency, fxUsd, fxJpy)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num">{formatPct(row.year5_ebitda_margin_pct)}</td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num font-semibold ${
                        row.npv_usd_m >= 0 ? "text-[#1B6B4A]" : "text-[#9B2C2C]"
                      }`}
                    >
                      {formatMoneyFromUsdM(row.npv_usd_m, displayCurrency, fxUsd, fxJpy)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num">
                      {row.irr_pct !== null ? formatPct(row.irr_pct) : "N/A"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num">{formatPct(row.roi_5yr_pct)}</td>
                    <td className="py-2.5 px-4 text-right font-mono-num">
                      {row.simple_payback_years !== null ? `${row.simple_payback_years.toFixed(2)} yrs` : ">5 yrs"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
};
