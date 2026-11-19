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
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { KpiCard } from "../components/common/KpiCard";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../services/api";
import { RiskAssessmentResponse, RiskItem } from "../types/consulting";
import { DEFAULT_JPY_INR, DEFAULT_USD_INR, formatMoneyFromUsdM, formatPct } from "../utils/formatters";

const CATEGORIES = ["All", "Regulatory", "Competitive", "Supply-Chain", "Currency", "Demand", "Operational"] as const;

function matrixCellTone(prob: number, imp: number): string {
  const score = prob * imp;
  if (score >= 16) return "bg-[#FBEAEA] border-[#E4B8B8]";
  if (score >= 10) return "bg-[#FDF3E3] border-[#E6CA98]";
  if (score >= 5) return "bg-[#FBF9EC] border-[#E6DFB5]";
  return "bg-[#EEF7F2] border-[#C1E0CE]";
}

function severityPillClass(sev: RiskItem["inherent_severity"]): string {
  if (sev === "Critical") return "bg-[#FDF0F0] text-[#9B2C2C] border-[#E6B8B8]";
  if (sev === "High") return "bg-[#FDF6E9] text-[#9A6314] border-[#E6CE9E]";
  if (sev === "Moderate") return "bg-[#EEF2F6] text-[#0F2942] border-[#C7D3DF]";
  return "bg-[#ECF7F1] text-[#1B6B4A] border-[#B7DFC9]";
}

export const RiskAssessmentPage: React.FC = () => {
  const { displayCurrency } = useWorkspace();
  const [data, setData] = useState<RiskAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [matrixMode, setMatrixMode] = useState<"inherent" | "residual">("inherent");
  const [selectedCode, setSelectedCode] = useState<string>("R-01");
  const [showAddForm, setShowAddForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newRisk, setNewRisk] = useState({
    category: "Operational" as RiskItem["category"],
    title: "",
    description: "",
    probability: 3,
    impact: 4,
    residual_probability: 2,
    residual_impact: 2,
    mitigation_strategy: "",
    owner: "India Project Director",
    early_warning_indicator: "",
    estimated_mitigation_cost_usd_m: 0.8,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRisks(categoryFilter);
      setData(res);
      if (res.risks.length > 0 && !res.risks.some((r) => r.risk_code === selectedCode)) {
        setSelectedCode(res.risks[0].risk_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load risk register.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, selectedCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleScoreAdjust = async (
    code: string,
    field: "probability" | "impact" | "residual_probability" | "residual_impact",
    value: number
  ) => {
    setBusy(true);
    try {
      const updated = await api.updateRisk(code, { [field]: value });
      setData(
        categoryFilter === "All"
          ? updated
          : { ...updated, risks: updated.risks.filter((r) => r.category === categoryFilter) }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update risk score.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.createRisk(newRisk);
      setData(updated);
      setCategoryFilter("All");
      setShowAddForm(false);
      setNewRisk({
        category: "Operational",
        title: "",
        description: "",
        probability: 3,
        impact: 4,
        residual_probability: 2,
        residual_impact: 2,
        mitigation_strategy: "",
        owner: "India Project Director",
        early_warning_indicator: "",
        estimated_mitigation_cost_usd_m: 0.8,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add risk.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRisk = async (code: string) => {
    setBusy(true);
    try {
      const updated = await api.deleteRisk(code);
      setData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete risk.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      const updated = await api.resetRisks();
      setData(updated);
      setCategoryFilter("All");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset risk register.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <LoadingPanel label="Loading enterprise risk register & probability-impact matrix..." />;
  if (error || !data) return <ErrorPanel message={error || "No risk data."} onRetry={() => void loadData()} />;

  const { summary } = data;
  const selectedRisk = data.risks.find((r) => r.risk_code === selectedCode) || data.risks[0];
  const fmt = (v: number) => formatMoneyFromUsdM(v, displayCurrency, DEFAULT_USD_INR, DEFAULT_JPY_INR);

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION G"
        title="Enterprise Risk Assessment & Mitigation Playbook"
        subtitle="Quantified 5×5 probability–impact evaluation across Regulatory, Competitive, Supply-Chain, Currency, Demand, and Operational risks."
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11.5px] font-medium bg-[#0E6B6B] hover:bg-[#0B5757] text-white rounded-[3px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Risk
            </button>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={busy}
              className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11.5px] font-medium bg-white border border-[#CBD3DC] text-[#334155] hover:bg-[#F1F3F5] rounded-[3px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Register
            </button>
          </div>
        }
      />

      {showAddForm ? (
        <SectionPanel title="Register Additional Market Entry Risk" subtitle="Persisted directly to database and plotted on 5×5 matrix">
          <form onSubmit={(e) => void handleCreateRisk(e)} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
            <div>
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Risk Category</label>
              <select
                value={newRisk.category}
                onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value as RiskItem["category"] })}
                className="w-full h-[32px] px-2 border border-[#CBD3DC] rounded-[3px] bg-white"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Risk Title</label>
              <input
                type="text"
                required
                minLength={4}
                placeholder="e.g., Land acquisition litigation in industrial corridor"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                className="w-full h-[32px] px-2.5 border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Description</label>
              <input
                type="text"
                required
                minLength={8}
                placeholder="Specific operational or financial exposure pathway..."
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                className="w-full h-[32px] px-2.5 border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "probability" as const, lbl: "Inh. Prob" },
                { key: "impact" as const, lbl: "Inh. Imp" },
                { key: "residual_probability" as const, lbl: "Res. Prob" },
                { key: "residual_impact" as const, lbl: "Res. Imp" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] text-[#52606D] mb-1">{f.lbl} (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk[f.key]}
                    onChange={(e) => setNewRisk({ ...newRisk, [f.key]: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Owner</label>
              <input
                type="text"
                required
                value={newRisk.owner}
                onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                className="w-full h-[30px] px-2 border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Mitigation Cost ($M)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                value={newRisk.estimated_mitigation_cost_usd_m}
                onChange={(e) => setNewRisk({ ...newRisk, estimated_mitigation_cost_usd_m: parseFloat(e.target.value) || 0 })}
                className="w-full h-[30px] px-2 font-mono-num border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Mitigation Action Plan</label>
              <input
                type="text"
                required
                minLength={6}
                placeholder="Concrete contractual, operational, or financial mitigation measure..."
                value={newRisk.mitigation_strategy}
                onChange={(e) => setNewRisk({ ...newRisk, mitigation_strategy: e.target.value })}
                className="w-full h-[30px] px-2 border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52606D] mb-1">Early Warning Trigger</label>
              <input
                type="text"
                required
                minLength={4}
                placeholder="Quantifiable KPI trigger..."
                value={newRisk.early_warning_indicator}
                onChange={(e) => setNewRisk({ ...newRisk, early_warning_indicator: e.target.value })}
                className="w-full h-[30px] px-2 border border-[#CBD3DC] rounded-[3px]"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-[12px] text-[#5C6B7A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-3.5 py-1.5 text-[12px] font-medium bg-[#0F2942] text-white rounded-[3px] cursor-pointer"
              >
                Save Risk Item
              </button>
            </div>
          </form>
        </SectionPanel>
      ) : null}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Tracked Risks (6 Domains)"
          value={String(summary.total_risks)}
          subtext={`Inherent Critical/High: ${summary.critical_inherent_count} / ${summary.high_inherent_count}`}
          provenance="DERIVED"
        />
        <KpiCard
          label="Avg Inherent Score (out of 25)"
          value={summary.avg_inherent_score.toFixed(1)}
          subtext="Pre-mitigation baseline exposure"
          provenance="DERIVED"
          tone="warning"
        />
        <KpiCard
          label="Avg Residual Score (Post-Mitigation)"
          value={summary.avg_residual_score.toFixed(1)}
          subtext={`Exposure reduced by -${formatPct(summary.avg_risk_reduction_pct)} · Critical Residual: ${summary.critical_residual_count}`}
          provenance="DERIVED"
          tone="positive"
        />
        <KpiCard
          label="Budgeted Mitigation Envelope"
          value={fmt(summary.total_mitigation_cost_usd_m)}
          subtext="SQE audits, APA tax filing, FX hedging & pilot tooling"
          provenance="ASSUMPTION"
        />
      </div>

      {/* 5x5 Probability-Impact Matrix + Category Reduction Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          className="xl:col-span-7"
          title={`5×5 Probability–Impact Risk Matrix (${matrixMode === "inherent" ? "Inherent" : "Residual Post-Mitigation"})`}
          subtitle="Click any risk badge inside a grid cell to inspect and adjust mitigation parameters"
          actions={
            <div className="inline-flex border border-[#CBD3DC] rounded-[3px] overflow-hidden text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setMatrixMode("inherent")}
                className={`px-2.5 py-1 cursor-pointer ${
                  matrixMode === "inherent" ? "bg-[#0F2942] text-white" : "bg-white text-[#475569]"
                }`}
              >
                Inherent Risk
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode("residual")}
                className={`px-2.5 py-1 cursor-pointer ${
                  matrixMode === "residual" ? "bg-[#0E6B6B] text-white" : "bg-white text-[#475569]"
                }`}
              >
                Residual (Mitigated)
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-1 text-[11px]">
                {[5, 4, 3, 2, 1].map((imp) => (
                  <React.Fragment key={imp}>
                    <div className="flex flex-col justify-center items-end pr-2 text-[#52606D] font-medium">
                      <span className="font-mono-num font-semibold text-[#0F2942]">I={imp}</span>
                      <span className="text-[9.5px]">{["", "Minimal", "Minor", "Moderate", "Major", "Severe"][imp]}</span>
                    </div>
                    {[1, 2, 3, 4, 5].map((prob) => {
                      const cellRisks = data.risks.filter((r) =>
                        matrixMode === "inherent"
                          ? r.probability === prob && r.impact === imp
                          : r.residual_probability === prob && r.residual_impact === imp
                      );
                      return (
                        <div
                          key={`${prob}-${imp}`}
                          className={`min-h-[54px] p-1.5 border rounded-[2px] flex flex-wrap content-start gap-1 ${matrixCellTone(
                            prob,
                            imp
                          )}`}
                        >
                          {cellRisks.map((r) => (
                            <button
                              key={r.risk_code}
                              type="button"
                              onClick={() => setSelectedCode(r.risk_code)}
                              title={`${r.risk_code}: ${r.title}`}
                              className={`px-1.5 py-0.5 text-[10px] font-mono-num font-semibold rounded-[2px] cursor-pointer transition-colors ${
                                selectedRisk?.risk_code === r.risk_code
                                  ? "bg-[#0F2942] text-white"
                                  : "bg-white border border-[#94A3B8] text-[#0F2942] hover:bg-[#EEF2F6]"
                              }`}
                            >
                              {r.risk_code}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
                <div />
                {[1, 2, 3, 4, 5].map((prob) => (
                  <div key={prob} className="text-center pt-1 text-[#52606D]">
                    <span className="font-mono-num font-semibold text-[#0F2942]">P={prob}</span>
                    <div className="text-[9.5px]">{["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"][prob]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-5"
          title="Risk Exposure by Domain (Inherent vs. Residual)"
          subtitle="Average 25-point risk index before and after budgeted mitigation"
        >
          <div className="h-[275px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_summary} layout="vertical" margin={{ top: 6, right: 16, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" horizontal={false} />
                <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis dataKey="category" type="category" width={92} tick={{ fontSize: 11, fill: "#1F2937" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avg_inherent_score" name="Inherent Avg" fill="#9A6314" maxBarSize={14} radius={[0, 2, 2, 0]} isAnimationActive={false} />
                <Bar dataKey="avg_residual_score" name="Residual Avg" fill="#0E6B6B" maxBarSize={14} radius={[0, 2, 2, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* Risk Register Table + Selected Risk Mitigation Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <SectionPanel
          className="xl:col-span-8"
          title={`Risk Register (${data.risks.length} items)`}
          subtitle="Filter by risk domain; select any row to edit scores or inspect mitigation governance"
          noPadding
          actions={
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-[2px] border cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-[#0F2942] text-white border-[#0F2942]"
                      : "bg-white text-[#475569] border-[#CBD3DC] hover:bg-[#F1F3F5]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                  <th className="py-2 px-3 font-semibold">Code</th>
                  <th className="py-2 px-3 font-semibold">Risk Event &amp; Category</th>
                  <th className="py-2 px-3 font-semibold text-center">Inherent (P×I)</th>
                  <th className="py-2 px-3 font-semibold text-center">Residual (P×I)</th>
                  <th className="py-2 px-3 font-semibold text-right">Reduction</th>
                  <th className="py-2 px-3 font-semibold text-right">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEEF2]">
                {data.risks.map((r) => {
                  const active = selectedRisk?.risk_code === r.risk_code;
                  return (
                    <tr
                      key={r.risk_code}
                      onClick={() => setSelectedCode(r.risk_code)}
                      className={`cursor-pointer transition-colors ${active ? "bg-[#EDF5F5]" : "hover:bg-[#FAFBFD]"}`}
                    >
                      <td className="py-2 px-3 font-mono-num font-semibold text-[#0F2942]">{r.risk_code}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[#0F2942]">{r.title}</div>
                        <div className="text-[11px] text-[#5C6B7A]">
                          {r.category} · Owner: {r.owner}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10.5px] font-mono-num font-semibold border rounded-[2px] ${severityPillClass(
                            r.inherent_severity
                          )}`}
                        >
                          {r.inherent_score} ({r.probability}×{r.impact})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10.5px] font-mono-num font-semibold border rounded-[2px] ${severityPillClass(
                            r.residual_severity
                          )}`}
                        >
                          {r.residual_score} ({r.residual_probability}×{r.residual_impact})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num text-[#1B6B4A] font-semibold">
                        -{r.risk_reduction_pct.toFixed(0)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num text-[#334155]">
                        {fmt(r.estimated_mitigation_cost_usd_m)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        {/* Selected Risk Mitigation Playbook & Live Scoring */}
        {selectedRisk ? (
          <SectionPanel
            className="xl:col-span-4"
            title={`${selectedRisk.risk_code} — Mitigation Playbook`}
            subtitle={`${selectedRisk.category} Risk · Owner: ${selectedRisk.owner}`}
            actions={
              <div className="flex items-center gap-1.5">
                <ProvenanceBadge type={selectedRisk.provenance} sourceId={selectedRisk.source_ref} compact />
                {selectedRisk.is_custom ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteRisk(selectedRisk.risk_code)}
                    className="p-1 text-[#9B2C2C] hover:bg-[#FDF0F0] rounded-[2px] cursor-pointer"
                    title="Delete custom risk"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="space-y-3 text-[12px]">
              <div>
                <h3 className="font-semibold text-[#0F2942] text-[13px]">{selectedRisk.title}</h3>
                <p className="text-[#334155] mt-1 leading-relaxed">{selectedRisk.description}</p>
              </div>

              {/* Editable P/I Controls */}
              <div className="p-2.5 bg-[#FAFBFD] border border-[#E5E9EE] rounded-[3px] grid grid-cols-2 gap-2.5">
                {[
                  { key: "probability" as const, lbl: "Inherent Prob.", val: selectedRisk.probability },
                  { key: "impact" as const, lbl: "Inherent Impact", val: selectedRisk.impact },
                  { key: "residual_probability" as const, lbl: "Residual Prob.", val: selectedRisk.residual_probability },
                  { key: "residual_impact" as const, lbl: "Residual Impact", val: selectedRisk.residual_impact },
                ].map((ctrl) => (
                  <div key={ctrl.key}>
                    <label className="block text-[10.5px] font-medium text-[#52606D] mb-1">{ctrl.lbl}</label>
                    <select
                      value={ctrl.val}
                      disabled={busy}
                      onChange={(e) => void handleScoreAdjust(selectedRisk.risk_code, ctrl.key, parseInt(e.target.value))}
                      className="w-full h-[28px] px-2 font-mono-num text-[11.5px] bg-white border border-[#CBD3DC] rounded-[3px]"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#E5E9EE]">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#0E6B6B]">
                  Recommended Mitigation Strategy
                </div>
                <p className="text-[#1F2937] mt-1 leading-relaxed">{selectedRisk.mitigation_strategy}</p>
              </div>

              <div className="pt-2 border-t border-[#E5E9EE]">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9A6314]">
                  Early Warning KPI Trigger
                </div>
                <p className="text-[#334155] mt-0.5">{selectedRisk.early_warning_indicator}</p>
              </div>
            </div>
          </SectionPanel>
        ) : null}
      </div>
    </div>
  );
};
