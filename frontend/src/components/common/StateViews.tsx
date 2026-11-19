import React from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

export const LoadingPanel: React.FC<{ label?: string }> = ({ label = "Running analytical computations..." }) => (
  <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-8 flex flex-col items-center justify-center gap-3 min-h-[260px]">
    <div className="w-6 h-6 border-2 border-[#DCE1E7] border-t-[#0F2942] rounded-full animate-spin" />
    <p className="text-[12.5px] text-[#5C6B7A] font-medium">{label}</p>
  </div>
);

export const ErrorPanel: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-[#FDF0F0] border border-[#E6B8B8] rounded-[4px] p-5 flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-[#9B2C2C] shrink-0 mt-0.5" />
      <div>
        <h3 className="text-[13px] font-semibold text-[#9B2C2C]">Analytical Engine Connection Error</h3>
        <p className="text-[12px] text-[#6B2121] mt-0.5">{message}</p>
        <p className="text-[11px] text-[#7D3535] mt-1">
          Verify the FastAPI analytical backend is running on port 8000 and retry.
        </p>
      </div>
    </div>
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-white border border-[#D4A0A0] text-[#9B2C2C] rounded-[3px] hover:bg-[#FAF0F0] cursor-pointer shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    ) : null}
  </div>
);

export const EmptyPanel: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-8 text-center flex flex-col items-center gap-2">
    <Inbox className="w-5 h-5 text-[#8A97A6]" />
    <h3 className="text-[13px] font-semibold text-[#0F2942]">{title}</h3>
    <p className="text-[12px] text-[#5C6B7A] max-w-md">{description}</p>
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
