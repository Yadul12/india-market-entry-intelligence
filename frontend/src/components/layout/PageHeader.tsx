import React from "react";

interface PageHeaderProps {
  sectionCode: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ sectionCode, title, subtitle, rightSlot }) => {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-3.5 mb-4 border-b border-[#DCE1E7]">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono-num text-[10.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-[#0F2942] text-white rounded-[2px]">
            {sectionCode}
          </span>
          <h1 className="text-[18px] font-semibold text-[#0F2942] leading-tight">{title}</h1>
        </div>
        <p className="text-[12.5px] text-[#5C6B7A] mt-1 max-w-3xl">{subtitle}</p>
      </div>
      {rightSlot ? <div className="flex items-center gap-2 flex-wrap">{rightSlot}</div> : null}
    </div>
  );
};
