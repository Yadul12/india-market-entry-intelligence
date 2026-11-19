import React from "react";
import { ProvenanceType } from "../../types/consulting";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  provenance?: ProvenanceType;
  sourceId?: string;
  tone?: "default" | "positive" | "warning" | "negative" | "teal";
}

const VALUE_TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-[#0F2942]",
  positive: "text-[#1B6B4A]",
  warning: "text-[#9A6314]",
  negative: "text-[#9B2C2C]",
  teal: "text-[#0E6B6B]",
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  provenance,
  sourceId,
  tone = "default",
}) => {
  return (
    <div className="bg-white border border-[#DCE1E7] rounded-[4px] px-3.5 py-3 flex flex-col justify-between min-h-[96px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5C6B7A] leading-tight">
          {label}
        </span>
        {provenance ? <ProvenanceBadge type={provenance} sourceId={sourceId} compact /> : null}
      </div>
      <div
        className={`font-mono-num font-semibold tracking-tight mt-1.5 leading-snug ${
          value.length > 14 ? "text-[16px]" : "text-[20px]"
        } ${VALUE_TONE[tone]}`}
      >
        {value}
      </div>
      {subtext ? <div className="text-[11.5px] text-[#5C6B7A] mt-1 leading-snug">{subtext}</div> : null}
    </div>
  );
};
