import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  Compass,
  Download,
  FileText,
  GitBranch,
  Globe2,
  Menu,
  ShieldAlert,
  X,
} from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { DisplayCurrency } from "../../types/consulting";

const NAV_ITEMS = [
  { code: "A", path: "/", label: "Executive Summary", icon: FileText },
  { code: "B", path: "/market-intelligence", label: "Market Intelligence", icon: Globe2 },
  { code: "C", path: "/market-sizing", label: "TAM / SAM / SOM", icon: BarChart3 },
  { code: "D", path: "/competitors", label: "Competitor Benchmarking", icon: Building2 },
  { code: "E", path: "/financial-model", label: "Financial Modelling", icon: Calculator },
  { code: "F", path: "/scenarios", label: "Scenario & Sensitivity", icon: GitBranch },
  { code: "G", path: "/risk-assessment", label: "Risk Assessment", icon: ShieldAlert },
  { code: "H", path: "/entry-strategy", label: "Entry Recommendation", icon: Compass },
  { code: "I", path: "/sources-methodology", label: "Sources & Methodology", icon: BookOpen },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeScenarioSlug,
    setActiveScenarioSlug,
    scenarios,
    displayCurrency,
    setDisplayCurrency,
    dbEngine,
    exportingPdf,
    pdfError,
    triggerPdfExport,
  } = useWorkspace();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navContent = (
    <div className="flex flex-col h-full bg-[#F2F4F7] border-r border-[#DCE1E7]">
      {/* Brand header */}
      <div className="px-4 py-3.5 border-b border-[#DCE1E7] bg-[#0F2942] text-white">
        <div className="text-[10px] font-mono-num uppercase tracking-[0.12em] text-[#9FB8CE]">
          STRATEGY PRACTICE · INDIA AUTO
        </div>
        <div className="text-[13.5px] font-semibold leading-snug mt-0.5 text-white">
          India Market Entry Intelligence
        </div>
        <div className="text-[10.5px] text-[#C5D5E4] mt-1 truncate">
          Client: Nippon Precision Mobility
        </div>
      </div>

      {/* Section links */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5" aria-label="Analysis Sections">
        <div className="px-2 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#687787]">
          Consulting Dossier
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-[12.5px] transition-colors border-l-2 ${
                  isActive
                    ? "bg-white text-[#0F2942] font-semibold border-[#0F2942] shadow-[inset_0_0_0_1px_#DCE1E7]"
                    : "text-[#334155] border-transparent hover:bg-[#E7EBF0] hover:text-[#0F2942]"
                }`
              }
            >
              <span className="font-mono-num text-[10px] font-semibold w-4 text-center text-[#687787]">
                {item.code}
              </span>
              <Icon className="w-3.5 h-3.5 shrink-0 text-[#475569]" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Metadata */}
      <div className="p-3 border-t border-[#DCE1E7] bg-[#EAECEF] text-[10.5px] text-[#52606D] space-y-1">
        <div className="flex items-center justify-between">
          <span>Analytical Engine</span>
          <span className="font-mono-num font-medium text-[#0E6B6B]">Pandas / NumPy</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Persistence</span>
          <span className="font-mono-num font-medium text-[#0F2942] uppercase">{dbEngine}</span>
        </div>
        <div className="pt-1 border-t border-[#D5DCE2] text-[10px] text-[#687787]">
          Data basis: ACMA FY26 · SIAM FY25 · MHI · RBI
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F7F8]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[236px] shrink-0 fixed inset-y-0 left-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[250px] h-full shadow-lg">{navContent}</div>
          <button
            type="button"
            aria-label="Close navigation"
            className="flex-1 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[236px] flex flex-col min-w-0">
        {/* Compact Enterprise Utility Topbar */}
        <header className="sticky top-0 z-20 h-[50px] bg-white border-b border-[#DCE1E7] px-4 lg:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="lg:hidden p-1.5 rounded-[3px] border border-[#DCE1E7] text-[#0F2942]"
              aria-label="Toggle Menu"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[11.5px] text-[#5C6B7A] truncate">
              <span className="font-semibold text-[#0F2942]">Decision Support Platform</span>
              <span>/</span>
              <span>FY2027–FY2031 Entry Evaluation</span>
            </div>
          </div>

          {/* Right Global Controls: Active Scenario, Currency Toggle, PDF Export */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Active Scenario Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="global-scenario-select" className="hidden md:inline text-[11px] font-medium text-[#5C6B7A]">
                Case:
              </label>
              <select
                id="global-scenario-select"
                value={activeScenarioSlug}
                onChange={(e) => setActiveScenarioSlug(e.target.value)}
                className="h-[30px] px-2 text-[12px] font-medium bg-[#F8F9FA] border border-[#CBD3DC] rounded-[3px] text-[#0F2942] focus:outline-none focus:border-[#0F2942]"
              >
                {scenarios.length > 0 ? (
                  scenarios.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="conservative">Conservative Case</option>
                    <option value="base">Base Case (Recommended)</option>
                    <option value="optimistic">Optimistic Case</option>
                  </>
                )}
              </select>
            </div>

            {/* Currency Switcher */}
            <div className="inline-flex border border-[#CBD3DC] rounded-[3px] overflow-hidden bg-[#F8F9FA]">
              {(["USD", "INR", "JPY"] as DisplayCurrency[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-2 h-[28px] text-[11px] font-mono-num font-medium cursor-pointer transition-colors ${
                    displayCurrency === curr
                      ? "bg-[#0F2942] text-white"
                      : "text-[#475569] hover:bg-[#E7EBF0]"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            {/* Executive Report PDF Export */}
            <button
              type="button"
              onClick={() => void triggerPdfExport()}
              disabled={exportingPdf}
              className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[11.5px] font-medium bg-[#0E6B6B] hover:bg-[#0B5757] disabled:opacity-60 text-white rounded-[3px] cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{exportingPdf ? "Generating PDF..." : "Export Executive PDF"}</span>
            </button>
          </div>
        </header>

        {pdfError ? (
          <div className="mx-4 lg:mx-6 mt-3 px-3 py-2 bg-[#FDF0F0] border border-[#E6B8B8] text-[#9B2C2C] text-[12px] rounded-[3px]">
            PDF Export Error: {pdfError}
          </div>
        ) : null}

        {/* Page Outlet */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
