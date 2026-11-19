import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { SectionPanel } from "../components/common/SectionPanel";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "../components/common/StateViews";
import { PageHeader } from "../components/layout/PageHeader";
import { api } from "../services/api";
import { SourcesMethodologyResponse } from "../types/consulting";

export const SourcesMethodologyPage: React.FC = () => {
  const [data, setData] = useState<SourcesMethodologyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSources({ category, search });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load source register.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) return <LoadingPanel label="Loading verified source register & methodology documentation..." />;
  if (error || !data) return <ErrorPanel message={error || "No sources loaded."} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        sectionCode="SECTION I"
        title="Sources Register, Data Provenance & Analytical Methodology"
        subtitle="Complete audit trail distinguishing verified public benchmarks (ACMA, SIAM, MHI, IBEF, RBI, World Bank, filings) from adjustable model assumptions."
        rightSlot={<ProvenanceBadge type="SOURCED" sourceId={`${data.total_sources} Verified Institutional Sources`} />}
      />

      {/* Data Provenance Classification */}
      <SectionPanel
        title="Data Integrity & Provenance Governance Standard"
        subtitle="Every quantitative figure in this platform is tagged with one of three transparent provenance levels"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
          {data.provenance_legend.map((item) => (
            <div key={item.tag} className="border border-[#E5E9EE] rounded-[3px] p-3 bg-[#FAFBFD] space-y-1.5">
              <ProvenanceBadge type={item.tag} />
              <p className="text-[#1F2937] font-medium leading-snug">{item.meaning}</p>
              <p className="text-[11px] text-[#5C6B7A] leading-snug">
                <strong>Examples:</strong> {item.examples}
              </p>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Transparent Source Register */}
      <SectionPanel
        title={`Verified Source Register (${data.sources.length} of ${data.total_sources} citations)`}
        subtitle="Click external links to inspect primary institutional portals and audited investor relations filings"
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter sources by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-[28px] px-2 text-[11.5px] bg-white border border-[#CBD3DC] rounded-[3px] text-[#0F2942]"
            >
              <option value="All">All Categories</option>
              {data.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#687787] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search source or metric..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-[28px] pl-7 pr-2 text-[11.5px] bg-white border border-[#CBD3DC] rounded-[3px] w-[190px]"
              />
            </div>
          </div>
        }
      >
        {data.sources.length === 0 ? (
          <div className="p-4">
            <EmptyPanel
              title="No Sources Match Filter"
              description="Clear the search box or category selector to view all institutional references."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setCategory("All");
                    setSearch("");
                  }}
                  className="px-3 py-1 text-[12px] bg-[#0F2942] text-white rounded-[3px] cursor-pointer"
                >
                  Reset Filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F6F8] border-b border-[#DCE1E7] text-[10.5px] uppercase tracking-wider text-[#52606D]">
                  <th className="py-2.5 px-3 font-semibold">ID</th>
                  <th className="py-2.5 px-3 font-semibold w-[220px]">Organization &amp; Report</th>
                  <th className="py-2.5 px-3 font-semibold w-[130px]">Date &amp; Tier</th>
                  <th className="py-2.5 px-3 font-semibold">Key Verified Data Extracted</th>
                  <th className="py-2.5 px-3 font-semibold w-[130px]">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEEF2] align-top">
                {data.sources.map((src) => (
                  <tr key={src.source_id} className="hover:bg-[#FAFBFD]">
                    <td className="py-2.5 px-3 font-mono-num font-semibold text-[#0E6B6B] whitespace-nowrap">
                      {src.source_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#0F2942]">{src.organization}</div>
                      <div className="text-[11.5px] text-[#334155] mt-0.5">{src.title}</div>
                      <div className="text-[10.5px] text-[#5C6B7A] mt-0.5">{src.category}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div className="font-mono-num font-medium text-[#0F2942]">{src.publication_date}</div>
                      <div className="text-[#5C6B7A] mt-0.5">{src.reliability_tier}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155] text-[11.5px] leading-relaxed">
                      <div>{src.data_extracted}</div>
                      <div className="text-[10.5px] text-[#687787] mt-1">
                        Used in: {src.usage_pages.join(" · ")}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#0E6B6B] hover:underline break-all"
                      >
                        <span>{src.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>

      {/* Analytical & Mathematical Methodology Specifications */}
      <SectionPanel
        title="Analytical & Corporate Finance Calculation Methodology"
        subtitle="Deterministic formulas implemented in Python (Pandas + NumPy) and validated by automated unit tests"
      >
        <div className="space-y-3">
          {data.methodology.map((m) => (
            <div key={m.id} className="border border-[#E5E9EE] rounded-[3px] p-3.5 bg-[#FAFBFD]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[#0F2942]">
                  <span className="font-mono-num text-[#0E6B6B] mr-1.5">{m.id}</span>
                  {m.domain}
                </h3>
              </div>
              <div className="mt-2 px-3 py-2 bg-white border border-[#DCE1E7] rounded-[2px] font-mono-num text-[11.5px] text-[#0F2942] overflow-x-auto">
                {m.formula}
              </div>
              <p className="text-[12px] text-[#334155] mt-2 leading-relaxed">{m.explanation}</p>
              <div className="text-[11px] text-[#5C6B7A] mt-1.5 pt-1.5 border-t border-[#E5E9EE]">
                <strong>Provenance Split:</strong> {m.provenance_split}
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
};
