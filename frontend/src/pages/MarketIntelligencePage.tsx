import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "../components/common/KpiCard";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { api } from "../services/api";
import { MarketIntelligenceResponse } from "../types/consulting";
import { formatInteger, formatPct, formatSignedPct } from "../utils/formatters";

export const MarketIntelligencePage: React.FC = () => {
  const [data, setData] = useState<MarketIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<string>("All");
  const [policyCategory, setPolicyCategory] = useState<string>("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMarketIntelligence();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) return <LoadingPanel label="Loading Indian automotive sector intelligence..." />;
  if (error || !data) return <ErrorPanel message={error || "No data available."} onRetry={() => void loadData()} />;

  const { macro_benchmarks: macro, channel_structure: ch } = data;
  const filteredDrivers =
    segmentFilter === "All"
      ? data.demand_drivers
      : data.demand_drivers.filter((d) => d.segment === segmentFilter || d.segment === "All");

  const policyCategories = ["All", ...Array.from(new Set(data.regulatory_policies.map((p) => p.category)))];
  const filteredPolicies =
    policyCategory === "All"
      ? data.regulatory_policies
      : data.regulatory_policies.filter((p) => p.category === policyCategory);

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION B"
        title="Indian Automotive Components Market Intelligence"
        subtitle="Industry scale, OEM vehicle demand across PV, CV & EV segments, policy framework, and regional manufacturing clusters."
        rightSlot={<ProvenanceBadge type="SOURCED" sourceId="ACMA · SIAM · MHI · IBEF · RBI · World Bank" />}
      />

      {/* Verified Macro & Industry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Industry Turnover (FY26)"
          value={`$${ch.fy26_turnover_usd_bn.toFixed(1)}B`}
          subtext={`FY25: $${ch.total_turnover_usd_bn.toFixed(1)}B (₹7.60L Cr FY26)`}
          provenance="SOURCED"
          sourceId="SRC-01"
        />
        <KpiCard
          label="FY25 Exports & Surplus"
          value={`$${ch.exports_usd_bn.toFixed(1)}B`}
          subtext={`Trade surplus: +$${ch.trade_surplus_usd_m.toFixed(0)}M`}
          provenance="SOURCED"
          sourceId="SRC-01"
          tone="teal"
        />
        <KpiCard
          label="Total Vehicle Prod. (FY25)"
          value={`${macro.total_vehicle_production_fy25_m.toFixed(2)}M`}
          subtext="PV 4.30M · CV 0.96M · 2W 19.6M"
          provenance="SOURCED"
          sourceId="SRC-02"
        />
        <KpiCard
          label="India EV Sales (FY26)"
          value={`${macro.ev_total_sales_fy26_m.toFixed(2)}M`}
          subtext={`+${macro.ev_sales_yoy_growth_pct.toFixed(0)}% YoY · 4.6% OEM comp share`}
          provenance="SOURCED"
          sourceId="SRC-05"
          tone="positive"
        />
        <KpiCard
          label="RBI Repo & FX Benchmarks"
          value={`${macro.rbi_repo_rate_pct.toFixed(2)}%`}
          subtext={`USD/INR ₹${macro.usd_inr_rate.toFixed(1)} · JPY/INR ₹${macro.jpy_inr_rate.toFixed(2)}`}
          provenance="SOURCED"
          sourceId="SRC-06"
        />
        <KpiCard
          label="GDP Growth & Corp. Tax"
          value={`${macro.india_gdp_growth_2026_proj_pct.toFixed(1)}%`}
          subtext={`2026E GDP · Sec 115BAA Tax ${macro.corporate_tax_sec_115baa_pct}%`}
          provenance="SOURCED"
          sourceId="SRC-07"
        />
      </div>

      {/* Charts Row: Historical ACMA Turnover & Product Category Share */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          className="xl:col-span-7"
          title="Historical Auto Component Industry Turnover (FY20–FY26)"
          subtitle="Verified ACMA annual turnover (USD Billions) and year-on-year growth rate (%)"
          actions={<ProvenanceBadge type="SOURCED" sourceId="SRC-01" compact />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.historical_turnover} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="fiscal_year" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}B`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <Bar yAxisId="left" dataKey="turnover_usd_bn" name="Turnover ($B)" fill="#0F2942" maxBarSize={36} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="yoy_growth_pct"
                  name="YoY Growth (%)"
                  stroke="#0E6B6B"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: "#0E6B6B" }}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-5"
          title="OEM Component Supply by Product Category (%)"
          subtitle="Teal bars indicate priority target categories for Japanese entrant"
          actions={<ProvenanceBadge type="SOURCED" sourceId="SRC-01" compact />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.component_categories}
                layout="vertical"
                margin={{ top: 6, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10.5, fill: "#1F2937" }} />
                <Tooltip
                  formatter={(v: number) => [`${v}% of OEM Supply`, "Category Share"]}
                  contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }}
                />
                <Bar dataKey="oem_share_pct" radius={[0, 2, 2, 0]} maxBarSize={20} isAnimationActive={false}>
                  {data.component_categories.map((cat) => (
                    <Cell key={cat.code} fill={cat.client_target_default ? "#0E6B6B" : "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* SIAM Vehicle Segment Demand Table */}
      <SectionPanel
        title="Vehicle Segment Production, Domestic Sales & Component Share"
        subtitle="SIAM FY2024–25 verified domestic unit volumes with FY26 trajectory notes"
        noPadding
        actions={<ProvenanceBadge type="SOURCED" sourceId="SRC-02" compact />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2.5 px-4 font-semibold">Vehicle Segment</th>
                <th className="py-2.5 px-4 font-semibold text-right">FY25 Domestic Sales (Units)</th>
                <th className="py-2.5 px-4 font-semibold text-right">FY25 YoY</th>
                <th className="py-2.5 px-4 font-semibold text-right">OEM Component Share</th>
                <th className="py-2.5 px-4 font-semibold">FY26 Context & Structural Dynamics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2]">
              {data.vehicle_volumes.map((seg) => (
                <tr key={seg.segment_code} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F2942]">{seg.segment_name}</td>
                  <td className="py-2.5 px-4 text-right font-mono-num">{formatInteger(seg.domestic_sales_fy25)}</td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono-num font-medium ${
                      seg.yoy_growth_pct >= 0 ? "text-[#1B6B4A]" : "text-[#9B2C2C]"
                    }`}
                  >
                    {formatSignedPct(seg.yoy_growth_pct)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-[#0E6B6B]">
                    {formatPct(seg.oem_component_share_pct)}
                  </td>
                  <td className="py-2.5 px-4 text-[#334155] text-[12px]">{seg.fy26_milestone_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Demand Drivers with Segment Filter */}
      <SectionPanel
        title="Structural Demand Drivers & Industry Trends"
        subtitle="Filter by vehicle segment to isolate commercial catalysts"
        noPadding
        actions={
          <div className="inline-flex border border-[#CBD3DC] rounded-[3px] overflow-hidden bg-white">
            {["All", "PV", "CV", "EV"].map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  segmentFilter === seg ? "bg-[#0F2942] text-white" : "text-[#475569] hover:bg-[#F1F3F5]"
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2 px-4 font-semibold">Driver</th>
                <th className="py-2 px-4 font-semibold">Segment</th>
                <th className="py-2 px-4 font-semibold">Quantitative Indicator</th>
                <th className="py-2 px-4 font-semibold">Horizon</th>
                <th className="py-2 px-4 font-semibold">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2]">
              {filteredDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-[#FAFBFD] align-top">
                  <td className="py-2.5 px-4 font-semibold text-[#0F2942] w-[260px]">
                    {d.driver}
                    <div className="text-[11px] font-normal text-[#0E6B6B] mt-0.5">{d.impact_direction}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono-num text-[11px] px-1.5 py-0.5 bg-[#EEF2F6] text-[#0F2942] rounded-[2px]">
                      {d.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[#334155] text-[12px]">{d.indicator}</td>
                  <td className="py-2.5 px-4 font-mono-num text-[12px] text-[#52606D] whitespace-nowrap">{d.horizon}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <ProvenanceBadge type={d.provenance} sourceId={d.source_id} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Regulatory & Government Policy Matrix */}
      <SectionPanel
        title="Government Policies, Incentives & Regulatory Considerations"
        subtitle="MHI incentive programs, BEE CAFE-III norms, MoRTH safety mandates, and corporate tax statutes"
        noPadding
        actions={
          <select
            aria-label="Filter policies by category"
            value={policyCategory}
            onChange={(e) => setPolicyCategory(e.target.value)}
            className="h-[28px] px-2 text-[11.5px] bg-white border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
          >
            {policyCategories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Policy Categories" : c}
              </option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2 px-4 font-semibold">Policy / Regulation</th>
                <th className="py-2 px-4 font-semibold">Category & Window</th>
                <th className="py-2 px-4 font-semibold">Key Statutory Terms</th>
                <th className="py-2 px-4 font-semibold">Strategic Implication for Entrant</th>
                <th className="py-2 px-4 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2] align-top">
              {filteredPolicies.map((pol) => (
                <tr key={pol.policy_id} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F2942] w-[220px]">
                    {pol.name}
                    <div className="text-[11px] font-normal text-[#5C6B7A] mt-0.5">{pol.authority}</div>
                  </td>
                  <td className="py-2.5 px-4 w-[170px]">
                    <span className="inline-block text-[10.5px] font-semibold px-1.5 py-0.5 bg-[#EDF4F4] text-[#0E6B6B] rounded-[2px]">
                      {pol.category}
                    </span>
                    <div className="text-[11px] text-[#5C6B7A] mt-1">{pol.effective_window}</div>
                  </td>
                  <td className="py-2.5 px-4 text-[#334155]">{pol.key_terms}</td>
                  <td className="py-2.5 px-4 text-[#1F2937] bg-[#FAFBFD]">{pol.implication_for_entrant}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <ProvenanceBadge type="SOURCED" sourceId={pol.source_id} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Regional Automotive Clusters */}
      <SectionPanel
        title="India Automotive Manufacturing Clusters"
        subtitle="Comparative assessment of Tier-2 supplier depth, Japanese presence, export port logistics, and EV ecosystem readiness"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2 px-4 font-semibold">Cluster & Region</th>
                <th className="py-2 px-4 font-semibold">Anchor OEMs</th>
                <th className="py-2 px-4 font-semibold text-right">Tier-2 Depth</th>
                <th className="py-2 px-4 font-semibold text-right">EV Ready</th>
                <th className="py-2 px-4 font-semibold text-right">Export Port</th>
                <th className="py-2 px-4 font-semibold text-right">Japan Hub</th>
                <th className="py-2 px-4 font-semibold">State Incentives & Fit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2] align-top">
              {data.automotive_clusters.map((c) => (
                <tr key={c.cluster_id} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F2942] w-[210px]">
                    {c.name}
                    <div className="text-[11px] font-normal text-[#5C6B7A] mt-0.5">
                      {c.region} · {c.primary_segments.join(", ")}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-[#334155] w-[200px]">{c.anchor_oems.join(", ")}</td>
                  <td className="py-2.5 px-4 text-right font-mono-num font-semibold">{c.tier2_ecosystem_score.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-[#0E6B6B]">{c.ev_readiness_score.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-right font-mono-num">{c.export_logistics_score.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-right font-mono-num">{c.japanese_presence_score.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-[#334155]">
                    <div>{c.strategic_fit_note}</div>
                    <div className="text-[11px] text-[#5C6B7A] mt-1">{c.state_incentive_summary}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
};
