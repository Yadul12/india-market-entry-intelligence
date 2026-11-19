import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { ExecutiveRecommendation, StrategyDecisionMatrix } from "../types/consulting";
import { DEFAULT_JPY_INR, DEFAULT_USD_INR, formatMoneyFromUsdM, formatPct } from "../utils/formatters";

const CRITERIA_COLORS: Record<string, string> = {
  investment_efficiency: "#0F2942",
  risk_mitigation: "#2C5282",
  ip_control: "#0E6B6B",
  time_to_market: "#9A6314",
  scalability: "#64748B",
};

export const EntryStrategyPage: React.FC = () => {
  const { displayCurrency } = useWorkspace();
  const [matrix, setMatrix] = useState<StrategyDecisionMatrix | null>(null);
  const [rec, setRec] = useState<ExecutiveRecommendation | null>(null);
  const [weightsDraft, setWeightsDraft] = useState<Record<string, number>>({});
  const [scoresDraft, setScoresDraft] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateState = (dm: StrategyDecisionMatrix, recommendation: ExecutiveRecommendation) => {
    setMatrix(dm);
    setRec(recommendation);
    const w: Record<string, number> = {};
    dm.criteria.forEach((c) => {
      w[c.key] = c.input_weight;
    });
    setWeightsDraft(w);

    const sc: Record<string, Record<string, number>> = {};
    dm.ranked_strategies.forEach((s) => {
      sc[s.strategy_key] = { ...s.scores };
    });
    setScoresDraft(sc);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStrategy();
      hydrateState(res.decision_matrix, res.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market entry strategy evaluation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleApplyMatrix = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.updateStrategyMatrix({
        weights: weightsDraft,
        score_overrides: scoresDraft,
      });
      hydrateState(res.decision_matrix, res.recommendation);
      setNotice("Weighted decision matrix persisted and executive recommendation updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update strategy matrix.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetMatrix = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.resetStrategyMatrix();
      hydrateState(res.decision_matrix, res.recommendation);
      setNotice("Restored baseline consulting weights and strategy scores.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset strategy matrix.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPanel label="Computing weighted MCDA matrix and consulting recommendation..." />;
  if (error || !matrix || !rec) return <ErrorPanel message={error || "No strategy data."} onRetry={() => void loadData()} />;

  const fmt = (v: number | null | undefined) => formatMoneyFromUsdM(v, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR);
  const totalDraftWeight = Object.values(weightsDraft).reduce((acc, v) => acc + v, 0);

  const shortLabel = (key: string, fallback: string) => {
    const map: Record<string, string> = {
      joint_venture: "Majority Joint Venture",
      acquisition: "Brownfield Acquisition",
      strategic_partnership: "Strategic Partnership",
      greenfield: "Greenfield (100% WOS)",
    };
    return map[key] || fallback.split("(")[0].trim();
  };

  const contributionChartData = matrix.ranked_strategies.map((s) => ({
    name: shortLabel(s.strategy_key, s.name),
    ...s.weighted_contributions,
    total: s.weighted_score,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION H"
        title="Market Entry Strategy & Consulting Recommendation"
        subtitle="Interactive weighted evaluation of Greenfield, Joint Venture, Acquisition, and Strategic Partnership alongside structured executive roadmap."
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleResetMatrix()}
              disabled={saving}
              className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11.5px] font-medium bg-white border border-[#CBD3DC] text-[#334155] hover:bg-[#F1F3F5] rounded-[3px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Matrix
            </button>
            <button
              type="button"
              onClick={() => void handleApplyMatrix()}
              disabled={saving}
              className="inline-flex items-center gap-1 h-[30px] px-3 text-[11.5px] font-medium bg-[#0F2942] hover:bg-[#193B5C] text-white rounded-[3px] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Recalculating..." : "Recalculate & Save"}
            </button>
          </div>
        }
      />

      {notice ? (
        <div className="px-3 py-2 bg-[#ECF7F1] border border-[#B7DFC9] text-[#1B6B4A] text-[12px] rounded-[3px]">{notice}</div>
      ) : null}

      {/* Part 1: Weighted Decision Matrix Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <SectionPanel
          className="xl:col-span-5"
          title="Decision Criteria Weights (Auto-Normalized to 100%)"
          subtitle="Adjust board strategic priorities and click Recalculate & Save"
          actions={<ProvenanceBadge type="ASSUMPTION" compact />}
        >
          <div className="space-y-3 text-[12px]">
            {matrix.criteria.map((c) => {
              const raw = weightsDraft[c.key] ?? c.input_weight;
              const previewNorm = totalDraftWeight > 0 ? (raw / totalDraftWeight) * 100 : 20;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-[#0F2942]">{c.label}</span>
                    <span className="font-mono-num text-[11.5px] font-semibold text-[#0E6B6B]">
                      {previewNorm.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={raw}
                    onChange={(e) => setWeightsDraft({ ...weightsDraft, [c.key]: parseFloat(e.target.value) })}
                    className="w-full consulting-slider"
                  />
                  <p className="text-[10.5px] text-[#5C6B7A] mt-0.5">{c.description}</p>
                </div>
              );
            })}
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-7"
          title="Weighted Score Decomposition by Entry Archetype"
          subtitle={`Rank #1: ${matrix.recommended_strategy.name} (${matrix.recommended_strategy.weighted_score.toFixed(2)} / 10, +${matrix.score_lead_over_second.toFixed(2)} lead)`}
          actions={<ProvenanceBadge type="DERIVED" compact />}
        >
          <div className="h-[275px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={contributionChartData}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 11, fill: "#1F2937" }} />
                <Tooltip contentStyle={{ fontSize: 11.5, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 10.5 }} />
                {matrix.criteria.map((c) => (
                  <Bar
                    key={c.key}
                    dataKey={c.key}
                    stackId="score"
                    name={c.label.split("&")[0].trim()}
                    fill={CRITERIA_COLORS[c.key]}
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* Editable Strategy Scoring Matrix Table */}
      <SectionPanel
        title="Entry Strategy Weighted Decision Matrix (Editable 1–10 Scores)"
        subtitle="Compare Greenfield, Joint Venture, Acquisition, and Strategic Partnership across all five strategic criteria"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2.5 px-3 font-semibold">Rank &amp; Entry Mode</th>
                <th className="py-2.5 px-3 font-semibold">CAPEX &amp; SOP</th>
                {matrix.criteria.map((c) => (
                  <th key={c.key} className="py-2.5 px-2 font-semibold text-center">
                    <div>{c.label.split(" ")[0]}</div>
                    <div className="font-mono-num text-[9.5px] text-[#0E6B6B]">({c.normalized_weight_pct}%)</div>
                  </th>
                ))}
                <th className="py-2.5 px-3 font-semibold text-right">Weighted Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2]">
              {matrix.ranked_strategies.map((s) => (
                <tr key={s.strategy_key} className={s.rank === 1 ? "bg-[#EDF5F5]" : "hover:bg-[#FAFBFD]"}>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-num text-[10.5px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                          s.rank === 1 ? "bg-[#0E6B6B] text-white" : "bg-[#E5E9EE] text-[#334155]"
                        }`}
                      >
                        #{s.rank}
                      </span>
                      <span className="font-semibold text-[#0F2942]">{s.name}</span>
                    </div>
                    <div className="text-[11px] text-[#5C6B7A] mt-0.5 pl-7">{s.ownership_structure}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono-num text-[11px] text-[#334155] whitespace-nowrap">
                    <div>{s.typical_capex_usd_m}</div>
                    <div className="text-[#5C6B7A]">{s.time_to_sop_months}</div>
                  </td>
                  {matrix.criteria.map((c) => (
                    <td key={c.key} className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        aria-label={`${s.name} ${c.label} score`}
                        value={scoresDraft[s.strategy_key]?.[c.key] ?? s.scores[c.key]}
                        onChange={(e) => {
                          const v = Math.min(10, Math.max(1, parseFloat(e.target.value) || 1));
                          setScoresDraft({
                            ...scoresDraft,
                            [s.strategy_key]: {
                              ...(scoresDraft[s.strategy_key] || s.scores),
                              [c.key]: v,
                            },
                          });
                        }}
                        className="w-[54px] h-[28px] px-1.5 text-center font-mono-num border border-[#CBD3DC] rounded-[2px] bg-white text-[#0F2942]"
                      />
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-mono-num text-[14px] font-bold text-[#0F2942]">
                    {s.weighted_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Trade-off Cards for the 4 Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matrix.ranked_strategies.map((s) => (
          <div
            key={s.strategy_key}
            className={`bg-white border rounded-[4px] p-3.5 ${
              s.rank === 1 ? "border-[#0E6B6B] border-l-4" : "border-[#DCE1E7]"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-[12.5px] font-semibold text-[#0F2942]">
                  #{s.rank} · {s.name}
                </div>
                <div className="text-[11px] text-[#5C6B7A]">
                  CAPEX: {s.typical_capex_usd_m} · Time to SOP: {s.time_to_sop_months}
                </div>
              </div>
              <span className="font-mono-num text-[13px] font-bold text-[#0E6B6B]">{s.weighted_score.toFixed(2)}/10</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11.5px]">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#1B6B4A] mb-1">Strategic Merits</div>
                <ul className="list-disc pl-4 space-y-1 text-[#334155]">
                  {s.pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9B2C2C] mb-1">Key Trade-offs</div>
                <ul className="list-disc pl-4 space-y-1 text-[#334155]">
                  {s.cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Part 2: Executive Consulting Recommendation Dossier */}
      <SectionPanel
        title="Structured Executive Consulting Recommendation"
        subtitle="Synthesized dynamically from live Financial Model, Market Sizing, Weighted MCDA, and Risk Register"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-[#F3FAF6] border border-[#B7DFC9] rounded-[3px] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1B6B4A] shrink-0 mt-0.5" />
            <div>
              <div className="text-[12.5px] font-bold text-[#0F2942]">{rec.verdict}</div>
              <p className="text-[12.5px] text-[#1F2937] mt-1 leading-relaxed">{rec.verdict_rationale}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preferred Customer Segments */}
            <div className="border border-[#E5E9EE] rounded-[3px] overflow-hidden">
              <div className="px-3 py-2 bg-[#F4F6F8] border-b border-[#E5E9EE] text-[11.5px] font-semibold text-[#0F2942]">
                Preferred Customer Segments &amp; Target Revenue Mix
              </div>
              <div className="divide-y divide-[#EAEEF2] text-[12px]">
                {rec.preferred_customer_segments.map((seg) => (
                  <div key={seg.segment} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F2942]">{seg.segment}</span>
                      <span className="font-mono-num text-[11.5px] font-semibold text-[#0E6B6B] shrink-0">
                        {seg.target_revenue_mix_pct}% Mix
                      </span>
                    </div>
                    <div className="text-[10.5px] uppercase tracking-wider text-[#5C6B7A] mt-0.5">{seg.priority}</div>
                    <p className="text-[11.5px] text-[#334155] mt-1">{seg.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Envelope & Financial Expectations */}
            <div className="border border-[#E5E9EE] rounded-[3px] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-3 py-2 bg-[#F4F6F8] border-b border-[#E5E9EE] text-[11.5px] font-semibold text-[#0F2942]">
                  Estimated Capital Envelope &amp; Base-Case Financial Outlook
                </div>
                <dl className="divide-y divide-[#EAEEF2] text-[12px] px-3">
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#5C6B7A]">Initial CAPEX + Initial NWC</dt>
                    <dd className="font-mono-num font-semibold text-[#0F2942]">
                      {fmt(rec.investment_envelope.total_initial_investment_usd_m)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#5C6B7A]">5-Year Total CAPEX (incl. Phase-2)</dt>
                    <dd className="font-mono-num font-semibold text-[#0F2942]">
                      {fmt(rec.investment_envelope.total_5yr_capex_usd_m)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#5C6B7A]">Peak Cash Funding Envelope</dt>
                    <dd className="font-mono-num font-semibold text-[#0F2942]">
                      {fmt(rec.investment_envelope.peak_funding_requirement_usd_m)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#5C6B7A]">Risk Mitigation Budget (12 items)</dt>
                    <dd className="font-mono-num font-semibold text-[#0E6B6B]">
                      {fmt(rec.investment_envelope.mitigation_budget_usd_m)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#5C6B7A]">Base-Case NPV / IRR / 5Y ROI</dt>
                    <dd className="font-mono-num font-semibold text-[#1B6B4A]">
                      {fmt(rec.expected_financial_performance.base.npv_usd_m)} ·{" "}
                      {formatPct(rec.expected_financial_performance.base.irr_pct)} ·{" "}
                      {formatPct(rec.expected_financial_performance.base.roi_5yr_pct)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="px-3 py-2.5 bg-[#FAFBFD] border-t border-[#E5E9EE] text-[11.5px] text-[#334155]">
                <strong>Primary Manufacturing Hub:</strong> {rec.target_regions[0].name} (Score{" "}
                {rec.target_regions[0].composite_fit_score}/10), paired with Phase-2 export/EV satellite in{" "}
                <strong>{rec.target_regions[1].name.split("(")[0].trim()}</strong>.
              </div>
            </div>
          </div>

          {/* 3-Year Implementation Roadmap (2027 - 2029) */}
          <div className="border border-[#DCE1E7] rounded-[3px] overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[#0F2942] text-white text-[12px] font-semibold">
              Three-Year Operational Implementation Roadmap &amp; Stage Gates (2027–2029)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                    <th className="py-2 px-3 font-semibold w-[200px]">Phase &amp; Timeline</th>
                    <th className="py-2 px-3 font-semibold w-[160px]">Workstream</th>
                    <th className="py-2 px-3 font-semibold">Key Deliverables &amp; Actions</th>
                    <th className="py-2 px-3 font-semibold w-[230px]">Executive Stage Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEEF2] align-top">
                  {rec.roadmap.map((step, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFBFD]">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#0F2942]">{step.phase}</div>
                        <div className="font-mono-num text-[11px] text-[#0E6B6B] mt-0.5">{step.window}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#334155]">{step.workstream}</td>
                      <td className="py-2.5 px-3">
                        <ul className="list-disc pl-4 space-y-1 text-[#334155]">
                          {step.key_milestones.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-2.5 px-3 bg-[#FAFBFD] text-[#0F2942] font-medium text-[11.5px]">
                        {step.stage_gate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
};
