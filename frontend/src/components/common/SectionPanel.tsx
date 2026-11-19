import React from "react";

interface SectionPanelProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export const SectionPanel: React.FC<SectionPanelProps> = ({
  title,
  subtitle,
  actions,
  children,
  noPadding = false,
  className = "",
}) => {
  return (
    <section className={`bg-white border border-[#DCE1E7] rounded-[4px] ${className}`}>
      <div className="px-4 py-2.5 border-b border-[#E5E9EE] flex flex-wrap items-center justify-between gap-2 bg-[#FAFBFD]">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[#0F2942] leading-tight">{title}</h2>
          {subtitle ? <p className="text-[11.5px] text-[#5C6B7A] mt-0.5 leading-snug">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className={noPadding ? "" : "p-4"}>{children}</div>
    </section>
  );
};
