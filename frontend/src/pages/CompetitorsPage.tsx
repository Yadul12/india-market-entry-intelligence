import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Search } from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { api } from "../services/api";
import { CompetitorItem, CompetitorsResponse } from "../types/consulting";
import { formatInteger, formatPct } from "../utils/formatters";

const ORIGIN_COLORS: Record<string, string> = {
  "Indian Domestic": "#0F2942",
  "European MNC": "#9A6314",
  "Japanese Peer": "#0E6B6B",
};

export const CompetitorsPage: React.FC = () => {
  const [data, setData] = useState<CompetitorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("All");
  const [segment, setSegment] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>("UNO-MINDA");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCompetitors({ origin, segment, search });
      setData(res);
      if (res.competitors.length > 0 && !res.competitors.some((c) => c.company_code === selectedCode)) {
        setSelectedCode(res.competitors[0].company_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competitor intelligence.");
    } finally {
      setLoading(false);
    }
  }, [origin, segment, search, selectedCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) return <LoadingPanel label="Loading verified Indian & global competitor benchmarks..." />;
  if (error || !data) return <ErrorPanel message={error || "Failed to load competitors."} onRetry={() => void loadData()} />;

  const selected: CompetitorItem | undefined =
    data.competitors.find((c) => c.company_code === selectedCode) || data.competitors[0];

  // Exclude SAMIL ($13.5B global outlier) from scatter plot axis scale toggle OR cap smoothly with label
  const scatterGroups = ["Indian Domestic", "European MNC", "Japanese Peer"].map((grp) => ({
    group: grp,
    color: ORIGIN_COLORS[grp],
    points: data.competitors
      .filter((c) => c.origin_group === grp)
      .map((c) => ({
        name: c.name,
        revenue_usd_m: Math.min(c.revenue_usd_m, 2600), // visual cap for SAMIL global scale with actual noted in tooltip
        actual_revenue_usd_m: c.revenue_usd_m,
        margin_pct: c.margin_pct,
        ev_readiness: c.ev_readiness_score * 32,
      })),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION D"
        title="Competitor Intelligence & Benchmarking Matrix"
        subtitle="Audited FY2025 / CY2025 performance of 12 Indian conglomerates, European MNCs, and Japanese Tier-1 peers operating in India."
        rightSlot={
          <div className="flex items-center gap-2">
            <ProvenanceBadge type="SOURCED" sourceId="SRC-10 .. SRC-16" />
            <ProvenanceBadge type="ASSUMPTION" sourceId="Capability Scores" />
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex border border-[#CBD3DC] rounded-[3px] overflow-hidden bg-white">
            {["All", "Indian Domestic", "European MNC", "Japanese Peer"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOrigin(opt)}
                className={`px-2.5 py-1 text-[11.5px] font-medium cursor-pointer ${
                  origin === opt ? "bg-[#0F2942] text-white" : "text-[#475569] hover:bg-[#F1F3F5]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="h-[30px] px-2.5 text-[12px] bg-[#FAFBFD] border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
          >
            <option value="All">All Vehicle Segments</option>
            <option value="PV">Passenger Vehicles (PV)</option>
            <option value="CV">Commercial Vehicles (CV)</option>
            <option value="EV">Electric Vehicles (EV)</option>
            <option value="2W">Two-Wheelers (2W)</option>
          </select>
        </div>

        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-[#687787] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter company, product, or OEM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[30px] pl-8 pr-2.5 text-[12px] bg-[#FAFBFD] border border-[#CBD3DC] rounded-[3px] text-[#1F2937] focus:outline-none focus:border-[#0F2942]"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          className="xl:col-span-6"
          title="Scale vs. Profitability Positioning Map"
          subtitle="FY25 Revenue (USD M, x-axis capped at $2.6B for readability; SAMIL $13.5B plotted at right edge) vs Margin (%)"
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis
                  type="number"
                  dataKey="revenue_usd_m"
                  name="Revenue"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickFormatter={(v) => `$${v}M`}
                  domain={[0, 2700]}
                />
                <YAxis
                  type="number"
                  dataKey="margin_pct"
                  name="Margin"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 30]}
                />
                <ZAxis type="number" dataKey="ev_readiness" range={[60, 280]} name="EV Readiness" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#CBD3DC] rounded-[3px] px-2.5 py-2 text-[11.5px] shadow-sm">
                        <div className="font-semibold text-[#0F2942]">{p.name}</div>
                        <div className="font-mono-num text-[#334155] mt-0.5">
                          Revenue: ${Number(p.actual_revenue_usd_m).toLocaleString()}M · Margin: {p.margin_pct}%
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                {scatterGroups.map((g) => (
                  <Scatter key={g.group} name={g.group} data={g.points} fill={g.color} fillOpacity={0.85} isAnimationActive={false} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel
          className="xl:col-span-6"
          title="Peer Archetype Capability Benchmark (1–10 Scale)"
          subtitle="Analytical comparison across competitor archetypes vs. Japanese entrant 51:49 JV target profile"
          actions={<ProvenanceBadge type="ASSUMPTION" compact />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.group_benchmarks} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="group" tick={{ fontSize: 10.5, fill: "#334155" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderColor: "#CBD3DC", borderRadius: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ev_readiness" name="EV Readiness" fill="#0E6B6B" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="localization" name="Localization" fill="#0F2942" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="cost_competitiveness" name="Cost Position" fill="#64748B" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="tech_capability" name="Tech & IP" fill="#9A6314" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </div>

      {/* Competitor Matrix Table + Selected Profile Inspector */}
      {data.competitors.length === 0 ? (
        <EmptyPanel
          title="No Competitors Match Current Filters"
          description="Try resetting the origin group, segment filter, or search query to inspect the full 12-company peer universe."
          action={
            <button
              type="button"
              onClick={() => {
                setOrigin("All");
                setSegment("All");
                setSearch("");
              }}
              className="px-3 py-1.5 text-[12px] font-medium bg-[#0F2942] text-white rounded-[3px] cursor-pointer"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <SectionPanel
            className="xl:col-span-8"
            title={`Competitor Benchmarking Matrix (${data.competitors.length} of ${data.total_peer_count} peers)`}
            subtitle={data.reporting_fx_note}
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                    <th className="py-2 px-3 font-semibold">Company</th>
                    <th className="py-2 px-3 font-semibold">Origin</th>
                    <th className="py-2 px-3 font-semibold text-right">FY25 Rev (₹ Cr)</th>
                    <th className="py-2 px-3 font-semibold text-right">Rev ($M)</th>
                    <th className="py-2 px-3 font-semibold text-right">Margin</th>
                    <th className="py-2 px-3 font-semibold text-center">EV / Loc / Tech</th>
                    <th className="py-2 px-3 font-semibold">Src</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEEF2]">
                  {data.competitors.map((c) => {
                    const isSelected = selected?.company_code === c.company_code;
                    return (
                      <tr
                        key={c.company_code}
                        onClick={() => setSelectedCode(c.company_code)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-[#EDF5F5]" : "hover:bg-[#FAFBFD]"
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="font-semibold text-[#0F2942]">{c.name}</div>
                          <div className="text-[11px] text-[#5C6B7A]">{c.pricing_positioning}</div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="inline-block px-1.5 py-0.5 text-[10.5px] font-medium rounded-[2px] border"
                            style={{
                              borderColor: `${ORIGIN_COLORS[c.origin_group]}40`,
                              color: ORIGIN_COLORS[c.origin_group],
                              backgroundColor: `${ORIGIN_COLORS[c.origin_group]}10`,
                            }}
                          >
                            {c.origin_group}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num">{formatInteger(c.revenue_inr_cr)}</td>
                        <td className="py-2 px-3 text-right font-mono-num">${formatInteger(c.revenue_usd_m)}</td>
                        <td className="py-2 px-3 text-right font-mono-num font-semibold text-[#0F2942]">
                          {formatPct(c.margin_pct)}
                          <span className="block text-[9.5px] font-normal text-[#5C6B7A]">{c.margin_metric}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono-num text-[11px] text-[#334155]">
                          {c.ev_readiness_score} / {c.localization_score} / {c.tech_capability_score}
                        </td>
                        <td className="py-2 px-3 font-mono-num text-[10.5px] text-[#0E6B6B]">{c.source_id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          {/* Selected Company Deep-Dive Dossier */}
          {selected ? (
            <SectionPanel
              className="xl:col-span-4"
              title={selected.name}
              subtitle={`${selected.origin_group} · ${selected.headquarters} · ${selected.fiscal_period}`}
              actions={<ProvenanceBadge type="SOURCED" sourceId={selected.source_id} compact />}
            >
              <div className="space-y-3 text-[12px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#FAFBFD] border border-[#E5E9EE] rounded-[3px]">
                    <div className="text-[10px] uppercase text-[#5C6B7A] font-semibold">Audited Revenue</div>
                    <div className="font-mono-num text-[14px] font-semibold text-[#0F2942] mt-0.5">
                      ₹{formatInteger(selected.revenue_inr_cr)} Cr
                    </div>
                    <div className="font-mono-num text-[11px] text-[#5C6B7A]">(${formatInteger(selected.revenue_usd_m)}M)</div>
                  </div>
                  <div className="p-2 bg-[#FAFBFD] border border-[#E5E9EE] rounded-[3px]">
                    <div className="text-[10px] uppercase text-[#5C6B7A] font-semibold">{selected.margin_metric} Margin</div>
                    <div className="font-mono-num text-[14px] font-semibold text-[#0E6B6B] mt-0.5">
                      {formatPct(selected.margin_pct)}
                    </div>
                    <div className="text-[10.5px] text-[#5C6B7A] truncate">{selected.pricing_positioning}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-1">
                    Core Product Portfolio
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[#1F2937]">
                    {selected.product_portfolio.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5C6B7A] mb-1">
                    Key OEM Accounts & Clusters
                  </div>
                  <div className="text-[#334155]">
                    <strong>OEMs:</strong> {selected.key_oems.join(", ")}
                  </div>
                  <div className="text-[#5C6B7A] mt-0.5">
                    <strong>Hubs:</strong> {selected.clusters.join(", ")}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E9EE] space-y-2">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#1B6B4A]">
                      Competitive Advantages
                    </div>
                    <p className="text-[#1F2937] mt-0.5 leading-snug">{selected.strengths}</p>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9B2C2C]">
                      Strategic Vulnerabilities
                    </div>
                    <p className="text-[#1F2937] mt-0.5 leading-snug">{selected.vulnerabilities}</p>
                  </div>
                </div>
              </div>
            </SectionPanel>
          ) : null}
        </div>
      )}

      {/* Strategic Market Gaps & White-Space Opportunities */}
      <SectionPanel
        title="Identified Competitive White-Space & Entrant Positioning Gaps"
        subtitle="Actionable product and commercial gaps exploitable by a precision Japanese Tier-1 entering India"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[11px] uppercase tracking-wider text-[#52606D]">
                <th className="py-2 px-4 font-semibold">White-Space Opportunity</th>
                <th className="py-2 px-4 font-semibold">Incumbent Market Gap / OEM Pain Point</th>
                <th className="py-2 px-4 font-semibold">Japanese Entrant Right-to-Win</th>
                <th className="py-2 px-4 font-semibold">Segments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEEF2] align-top">
              {data.market_gaps.map((g) => (
                <tr key={g.gap_id} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F2942] w-[240px]">{g.white_space}</td>
                  <td className="py-2.5 px-4 text-[#334155]">{g.current_market_pain}</td>
                  <td className="py-2.5 px-4 text-[#1F2937] bg-[#F7FAFA]">{g.japanese_entrant_advantage}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap font-mono-num text-[11px] text-[#0E6B6B]">
                    {g.target_segments.join(" · ")}
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
