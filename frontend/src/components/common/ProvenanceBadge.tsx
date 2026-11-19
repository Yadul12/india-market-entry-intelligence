import React from "react";
import { ProvenanceType } from "../../types/consulting";

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  sourceId?: string | null;
  compact?: boolean;
}

const STYLES: Record<ProvenanceType, { bg: string; text: string; border: string; label: string }> = {
  SOURCED: {
    bg: "bg-[#EDF4F4]",
    text: "text-[#0E6B6B]",
    border: "border-[#B8D8D8]",
    label: "SOURCED",
  },
  ASSUMPTION: {
    bg: "bg-[#FDF6E9]",
    text: "text-[#8A5610]",
    border: "border-[#E6CE9E]",
    label: "ASSUMPTION",
  },
  DERIVED: {
    bg: "bg-[#EEF2F6]",
    text: "text-[#0F2942]",
    border: "border-[#C7D3DF]",
    label: "DERIVED",
  },
};

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ type, sourceId, compact = false }) => {
  const style = STYLES[type];
  return (
    <span
      className={`inline-flex items-center gap-1 border font-mono-num uppercase tracking-wider font-medium rounded-[2px] whitespace-nowrap shrink-0 ${style.bg} ${style.text} ${style.border} ${
        compact ? "px-1 py-0 text-[9px] leading-[14px]" : "px-1.5 py-0.5 text-[10px] leading-[14px]"
      }`}
    >
      <span>{style.label}</span>
      {sourceId ? <span className="opacity-80">· {sourceId}</span> : null}
    </span>
  );
};
