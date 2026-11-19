import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { CompetitorsPage } from "./pages/CompetitorsPage";
import { EntryStrategyPage } from "./pages/EntryStrategyPage";
import { ExecutiveSummaryPage } from "./pages/ExecutiveSummaryPage";
import { FinancialModelPage } from "./pages/FinancialModelPage";
import { MarketIntelligencePage } from "./pages/MarketIntelligencePage";
import { MarketSizingPage } from "./pages/MarketSizingPage";
import { RiskAssessmentPage } from "./pages/RiskAssessmentPage";
import { ScenarioAnalysisPage } from "./pages/ScenarioAnalysisPage";
import { SourcesMethodologyPage } from "./pages/SourcesMethodologyPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<ExecutiveSummaryPage />} />
            <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
            <Route path="/market-sizing" element={<MarketSizingPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/financial-model" element={<FinancialModelPage />} />
            <Route path="/scenarios" element={<ScenarioAnalysisPage />} />
            <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
            <Route path="/entry-strategy" element={<EntryStrategyPage />} />
            <Route path="/sources-methodology" element={<SourcesMethodologyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </WorkspaceProvider>
    </BrowserRouter>
  );
};

export default App;
