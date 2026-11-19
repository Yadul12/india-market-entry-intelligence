import {
  CompetitorsResponse,
  DisplayCurrency,
  ExecutiveRecommendation,
  ExecutiveSummaryResponse,
  FinancialAssumptions,
  FinancialModelOutput,
  FinancialScenario,
  MarketIntelligenceResponse,
  MarketSizingAssumptions,
  MarketSizingResponse,
  RiskAssessmentResponse,
  SensitivityResponse,
  SourcesMethodologyResponse,
  StrategyDecisionMatrix,
} from "../types/consulting";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody?.detail) {
        detail = typeof errBody.detail === "string" ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {
      // ignore non-json error body
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => requestJson<{ status: string; database_engine: string; service: string }>("/health"),

  getExecutiveSummary: (scenarioSlug = "base") =>
    requestJson<ExecutiveSummaryResponse>(`/executive-summary?scenario_slug=${encodeURIComponent(scenarioSlug)}`),

  getMarketIntelligence: () => requestJson<MarketIntelligenceResponse>("/market/intelligence"),

  getMarketSizing: () => requestJson<MarketSizingResponse>("/market/sizing"),

  calculateMarketSizing: (assumptions: MarketSizingAssumptions) =>
    requestJson<MarketSizingResponse>("/market/sizing/calculate", {
      method: "POST",
      body: JSON.stringify(assumptions),
    }),

  saveMarketSizing: (assumptions: MarketSizingAssumptions) =>
    requestJson<MarketSizingResponse>("/market/sizing", {
      method: "PUT",
      body: JSON.stringify(assumptions),
    }),

  resetMarketSizing: () =>
    requestJson<MarketSizingResponse>("/market/sizing/reset", {
      method: "POST",
    }),

  getCompetitors: (params?: { origin?: string; segment?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.origin && params.origin !== "All") query.set("origin", params.origin);
    if (params?.segment && params.segment !== "All") query.set("segment", params.segment);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return requestJson<CompetitorsResponse>(`/competitors${qs ? `?${qs}` : ""}`);
  },

  listScenarios: () => requestJson<{ scenarios: FinancialScenario[] }>("/financials/scenarios"),

  calculateFinancials: (assumptions: FinancialAssumptions) =>
    requestJson<FinancialModelOutput>("/financials/calculate", {
      method: "POST",
      body: JSON.stringify(assumptions),
    }),

  createScenario: (payload: { name: string; description: string; assumptions: FinancialAssumptions }) =>
    requestJson<FinancialScenario>("/financials/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateScenario: (slug: string, payload: { name?: string; description?: string; assumptions: FinancialAssumptions }) =>
    requestJson<FinancialScenario>(`/financials/scenarios/${encodeURIComponent(slug)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  resetScenario: (slug: string) =>
    requestJson<FinancialScenario>(`/financials/scenarios/${encodeURIComponent(slug)}/reset`, {
      method: "POST",
    }),

  deleteScenario: (slug: string) =>
    requestJson<{ deleted: string }>(`/financials/scenarios/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    }),

  getSensitivity: (scenarioSlug = "base") =>
    requestJson<SensitivityResponse>(`/financials/sensitivity?scenario_slug=${encodeURIComponent(scenarioSlug)}`),

  calculateSensitivityCustom: (assumptions: FinancialAssumptions) =>
    requestJson<SensitivityResponse>("/financials/sensitivity", {
      method: "POST",
      body: JSON.stringify(assumptions),
    }),

  getStrategy: () =>
    requestJson<{ decision_matrix: StrategyDecisionMatrix; recommendation: ExecutiveRecommendation }>("/strategy"),

  updateStrategyMatrix: (payload: {
    weights: Record<string, number>;
    score_overrides?: Record<string, Record<string, number>>;
  }) =>
    requestJson<{ decision_matrix: StrategyDecisionMatrix; recommendation: ExecutiveRecommendation }>(
      "/strategy/matrix",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  resetStrategyMatrix: () =>
    requestJson<{ decision_matrix: StrategyDecisionMatrix; recommendation: ExecutiveRecommendation }>(
      "/strategy/matrix/reset",
      { method: "POST" }
    ),

  getRisks: (category?: string) => {
    const qs = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    return requestJson<RiskAssessmentResponse>(`/risks${qs}`);
  },

  createRisk: (payload: {
    category: "Regulatory" | "Competitive" | "Supply-Chain" | "Currency" | "Demand" | "Operational";
    title: string;
    description: string;
    probability: number;
    impact: number;
    residual_probability: number;
    residual_impact: number;
    mitigation_strategy: string;
    owner: string;
    early_warning_indicator: string;
    estimated_mitigation_cost_usd_m: number;
  }) =>
    requestJson<RiskAssessmentResponse>("/risks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRisk: (
    riskCode: string,
    payload: {
      probability?: number;
      impact?: number;
      residual_probability?: number;
      residual_impact?: number;
      mitigation_strategy?: string;
      owner?: string;
      estimated_mitigation_cost_usd_m?: number;
    }
  ) =>
    requestJson<RiskAssessmentResponse>(`/risks/${encodeURIComponent(riskCode)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteRisk: (riskCode: string) =>
    requestJson<RiskAssessmentResponse>(`/risks/${encodeURIComponent(riskCode)}`, {
      method: "DELETE",
    }),

  resetRisks: () =>
    requestJson<RiskAssessmentResponse>("/risks/reset", {
      method: "POST",
    }),

  getSources: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "All") query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return requestJson<SourcesMethodologyResponse>(`/sources${qs ? `?${qs}` : ""}`);
  },

  exportExecutivePdf: async (scenarioSlug: string, displayCurrency: DisplayCurrency): Promise<void> => {
    const response = await fetch(`${API_BASE}/reports/executive-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_slug: scenarioSlug,
        display_currency: displayCurrency,
      }),
    });
    if (!response.ok) {
      throw new Error(`PDF export failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `India_Market_Entry_Executive_Report_${scenarioSlug}_${displayCurrency}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
