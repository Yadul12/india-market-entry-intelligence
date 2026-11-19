import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { DisplayCurrency, FinancialScenario } from "../types/consulting";

interface WorkspaceContextValue {
  activeScenarioSlug: string;
  setActiveScenarioSlug: (slug: string) => void;
  scenarios: FinancialScenario[];
  refreshScenarios: () => Promise<void>;
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  dbEngine: string;
  exportingPdf: boolean;
  pdfError: string | null;
  triggerPdfExport: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScenarioSlug, setActiveScenarioSlug] = useState<string>("base");
  const [scenarios, setScenarios] = useState<FinancialScenario[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [dbEngine, setDbEngine] = useState<string>("connecting");
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const refreshScenarios = useCallback(async () => {
    try {
      const [scRes, healthRes] = await Promise.all([api.listScenarios(), api.getHealth()]);
      setScenarios(scRes.scenarios);
      setDbEngine(healthRes.database_engine);
    } catch {
      setDbEngine("offline");
    }
  }, []);

  useEffect(() => {
    void refreshScenarios();
  }, [refreshScenarios]);

  const triggerPdfExport = useCallback(async () => {
    setExportingPdf(true);
    setPdfError(null);
    try {
      await api.exportExecutivePdf(activeScenarioSlug, displayCurrency);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to generate executive PDF.");
    } finally {
      setExportingPdf(false);
    }
  }, [activeScenarioSlug, displayCurrency]);

  return (
    <WorkspaceContext.Provider
      value={{
        activeScenarioSlug,
        setActiveScenarioSlug,
        scenarios,
        refreshScenarios,
        displayCurrency,
        setDisplayCurrency,
        dbEngine,
        exportingPdf,
        pdfError,
        triggerPdfExport,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
