export type DisplayCurrency = "USD" | "INR" | "JPY";
export type ProvenanceType = "SOURCED" | "ASSUMPTION" | "DERIVED";

export interface HistoricalTurnoverPoint {
  fiscal_year: string;
  turnover_usd_bn: number;
  turnover_inr_lakh_cr: number;
  yoy_growth_pct: number | null;
  ev_oem_share_pct: number;
  provenance: ProvenanceType;
  source_id: string;
}

export interface ChannelStructure {
  total_turnover_usd_bn: number;
  fy26_turnover_usd_bn: number;
  oem_supplies_usd_bn: number;
  exports_usd_bn: number;
  imports_usd_bn: number;
  trade_surplus_usd_m: number;
  aftermarket_usd_bn: number;
  export_destinations: { region: string; share_pct: number }[];
  provenance: ProvenanceType;
  source_id: string;
}

export interface VehicleVolumeItem {
  segment_code: string;
  segment_name: string;
  domestic_sales_fy25: number;
  yoy_growth_pct: number;
  fy26_milestone_note: string;
  oem_component_share_pct: number;
  provenance: ProvenanceType;
  source_id: string;
}

export interface ComponentCategoryItem {
  code: string;
  name: string;
  oem_share_pct: number;
  client_target_default: boolean;
  ev_transition_exposure: string;
  source_id: string;
  selected?: boolean;
}

export interface MacroBenchmarks {
  india_gdp_growth_2025_pct: number;
  india_gdp_growth_2026_proj_pct: number;
  auto_share_of_gdp_pct: number;
  auto_share_of_mfg_gdp_pct: number;
  rbi_repo_rate_pct: number;
  usd_inr_rate: number;
  jpy_inr_rate: number;
  ev_total_sales_fy26_m: number;
  ev_sales_yoy_growth_pct: number;
  total_vehicle_production_fy25_m: number;
  corporate_tax_sec_115baa_pct: number;
  fdi_automatic_limit_pct: number;
  source_ids: string[];
}

export interface DemandDriverItem {
  id: string;
  driver: string;
  segment: string;
  indicator: string;
  horizon: string;
  impact_direction: string;
  provenance: ProvenanceType;
  source_id: string;
}

export interface RegulatoryPolicyItem {
  policy_id: string;
  name: string;
  authority: string;
  category: string;
  effective_window: string;
  key_terms: string;
  implication_for_entrant: string;
  source_id: string;
}

export interface AutomotiveClusterItem {
  cluster_id: string;
  name: string;
  region: string;
  primary_segments: string[];
  anchor_oems: string[];
  tier2_ecosystem_score: number;
  japanese_presence_score: number;
  export_logistics_score: number;
  ev_readiness_score: number;
  state_incentive_summary: string;
  strategic_fit_note: string;
  composite_fit_score?: number;
}

export interface MarketIntelligenceResponse {
  historical_turnover: HistoricalTurnoverPoint[];
  channel_structure: ChannelStructure;
  vehicle_volumes: VehicleVolumeItem[];
  component_categories: ComponentCategoryItem[];
  macro_benchmarks: MacroBenchmarks;
  demand_drivers: DemandDriverItem[];
  regulatory_policies: RegulatoryPolicyItem[];
  automotive_clusters: AutomotiveClusterItem[];
}

export interface MarketSizingAssumptions {
  base_year: string;
  base_tam_usd_bn: number;
  oem_domestic_share_pct: number;
  pv_cagr_pct: number;
  cv_cagr_pct: number;
  ev_cagr_pct: number;
  other_cagr_pct: number;
  include_suspension_braking: boolean;
  include_drive_transmission: boolean;
  include_electrical_electronics: boolean;
  include_engine: boolean;
  include_body_chassis: boolean;
  include_interiors: boolean;
  include_cooling_misc: boolean;
  tier1_addressable_factor_pct: number;
  export_hub_adder_pct: number;
  som_year1_share_pct: number;
  som_year5_share_pct: number;
  ramp_curve: "linear" | "s_curve" | "backloaded";
}

export interface MarketSizingForecastRow {
  fiscal_year: string;
  pv_usd_bn: number;
  cv_usd_bn: number;
  ev_usd_bn: number;
  other_usd_bn: number;
  tam_usd_bn: number;
  sam_usd_bn: number;
  som_share_of_sam_pct: number;
  som_usd_m: number;
  ev_share_of_tam_pct: number;
  provenance: ProvenanceType;
}

export interface MarketSizingResponse {
  assumptions: MarketSizingAssumptions;
  summary: {
    historical_cagr_fy20_fy26_pct: number;
    forward_tam_cagr_fy26_fy31_pct: number;
    forward_sam_cagr_fy27_fy31_pct: number;
    forward_som_cagr_fy27_fy31_pct: number;
    fy26_tam_usd_bn: number;
    fy27_tam_usd_bn: number;
    fy31_tam_usd_bn: number;
    fy27_sam_usd_bn: number;
    fy31_sam_usd_bn: number;
    fy27_som_usd_m: number;
    fy31_som_usd_m: number;
    cumulative_5yr_som_usd_m: number;
    selected_category_oem_share_pct: number;
    effective_sam_pct_of_tam: number;
  };
  historical_series: HistoricalTurnoverPoint[];
  forecast_series: MarketSizingForecastRow[];
  funnel_fy31: {
    stage: string;
    value_usd_bn: number;
    pct_of_tam: number;
    note: string;
    provenance: ProvenanceType;
  }[];
  categories: ComponentCategoryItem[];
}

export interface CompetitorItem {
  id: number;
  company_code: string;
  name: string;
  origin_group: string;
  headquarters: string;
  fiscal_period: string;
  revenue_inr_cr: number;
  revenue_usd_m: number;
  margin_pct: number;
  margin_metric: string;
  pricing_positioning: string;
  segments: string[];
  product_portfolio: string[];
  key_oems: string[];
  clusters: string[];
  ev_readiness_score: number;
  localization_score: number;
  cost_competitiveness_score: number;
  tech_capability_score: number;
  strengths: string;
  vulnerabilities: string;
  source_id: string;
}

export interface CompetitorsResponse {
  reporting_fx_note: string;
  competitors: CompetitorItem[];
  total_peer_count: number;
  group_benchmarks: {
    group: string;
    count: number;
    avg_margin_pct: number;
    ev_readiness: number;
    localization: number;
    cost_competitiveness: number;
    tech_capability: number;
    provenance?: ProvenanceType;
  }[];
  market_gaps: {
    gap_id: string;
    white_space: string;
    current_market_pain: string;
    japanese_entrant_advantage: string;
    target_segments: string[];
  }[];
}

export interface FinancialAssumptions {
  horizon_years: number;
  start_fiscal_year: number;
  year1_revenue_usd_m: number;
  revenue_growth_rates_pct: [number, number, number, number];
  export_revenue_share_pct: number;
  cogs_pct_year1: number;
  cogs_localization_stepdown_bps: number;
  direct_labor_overhead_pct: number;
  sga_pct: number;
  rd_engineering_pct: number;
  royalty_tech_fee_pct: number;
  pli_incentive_enabled: boolean;
  pli_incentive_pct: number;
  initial_capex_usd_m: number;
  maintenance_capex_pct_rev: number;
  expansion_capex_y3_usd_m: number;
  depreciation_years: number;
  dso_days: number;
  dio_days: number;
  dpo_days: number;
  corporate_tax_rate_pct: number;
  wacc_pct: number;
  terminal_growth_pct: number;
  usd_inr_rate: number;
  jpy_inr_rate: number;
  entry_mode_label: string;
}

export interface FinancialSummaryMetrics {
  cumulative_5yr_revenue_usd_m: number;
  year5_revenue_usd_m: number;
  revenue_cagr_5yr_pct: number;
  cumulative_5yr_ebitda_usd_m: number;
  year5_ebitda_usd_m: number;
  year5_ebitda_margin_pct: number;
  avg_ebitda_margin_pct: number;
  cumulative_5yr_pat_usd_m: number;
  cumulative_5yr_fcff_usd_m: number;
  initial_capex_usd_m: number;
  initial_nwc_usd_m: number;
  total_initial_investment_usd_m: number;
  total_5yr_capex_usd_m: number;
  peak_funding_requirement_usd_m: number;
  npv_usd_m: number;
  npv_5yr_explicit_usd_m: number;
  terminal_value_usd_m: number;
  pv_terminal_value_usd_m: number;
  irr_pct: number | null;
  irr_5yr_explicit_pct: number | null;
  roi_5yr_pct: number;
  year5_roce_pct: number;
  simple_payback_years: number | null;
  discounted_payback_years: number | null;
  breakeven_revenue_usd_m: number;
  ebitda_positive_year: string;
  ebit_positive_year: string;
  wacc_pct: number;
  hurdle_spread_pct: number | null;
}

export interface IncomeStatementRow {
  fiscal_year: string;
  revenue_usd_m: number;
  domestic_revenue_usd_m: number;
  export_revenue_usd_m: number;
  yoy_growth_pct: number | null;
  material_cogs_usd_m: number;
  material_cogs_pct: number;
  direct_labor_oh_usd_m: number;
  total_cogs_usd_m: number;
  gross_profit_usd_m: number;
  gross_margin_pct: number;
  sga_usd_m: number;
  rd_usd_m: number;
  royalty_usd_m: number;
  pli_credit_usd_m: number;
  ebitda_usd_m: number;
  ebitda_margin_pct: number;
  depreciation_usd_m: number;
  ebit_usd_m: number;
  ebit_margin_pct: number;
  tax_usd_m: number;
  net_income_usd_m: number;
  net_margin_pct: number;
}

export interface CashFlowRow {
  fiscal_year: string;
  nopat_usd_m: number;
  depreciation_usd_m: number;
  change_nwc_usd_m: number;
  capex_usd_m: number;
  fcff_usd_m: number;
  cumulative_fcf_usd_m: number;
  discount_factor: number;
  pv_fcff_usd_m: number;
  ar_usd_m: number;
  inventory_usd_m: number;
  ap_usd_m: number;
  nwc_usd_m: number;
  nwc_pct_rev: number;
  roce_pct: number;
}

export interface FinancialModelOutput {
  assumptions: FinancialAssumptions;
  summary: FinancialSummaryMetrics;
  income_statement: IncomeStatementRow[];
  cash_flow_statement: CashFlowRow[];
  year0_outflow_usd_m: number;
}

export interface FinancialScenario extends FinancialModelOutput {
  id: number;
  slug: string;
  name: string;
  scenario_type: "conservative" | "base" | "optimistic" | "custom";
  description: string;
  is_system: boolean;
  updated_at: string | null;
}

export interface SensitivityResponse {
  scenario_slug: string;
  scenario_name: string;
  tornado: {
    base_npv_usd_m: number;
    drivers: {
      driver: string;
      shock_range: string;
      downside_npv_usd_m: number;
      upside_npv_usd_m: number;
      downside_delta_usd_m: number;
      upside_delta_usd_m: number;
      spread_usd_m: number;
    }[];
  };
  two_way: {
    row_label: string;
    col_label: string;
    wacc_values: number[];
    cogs_values: number[];
    base_wacc_pct: number;
    base_cogs_pct: number;
    matrix: {
      wacc_pct: number;
      cells: {
        wacc_pct: number;
        cogs_pct: number;
        npv_usd_m: number;
        irr_pct: number | null;
      }[];
    }[];
  };
}

export interface RankedStrategyItem {
  strategy_key: string;
  rank: number;
  name: string;
  typical_capex_usd_m: string;
  time_to_sop_months: string;
  ownership_structure: string;
  scores: Record<string, number>;
  weighted_contributions: Record<string, number>;
  weighted_score: number;
  pros: string[];
  cons: string[];
}

export interface StrategyDecisionMatrix {
  criteria: {
    key: string;
    label: string;
    description: string;
    input_weight: number;
    normalized_weight_pct: number;
  }[];
  ranked_strategies: RankedStrategyItem[];
  recommended_strategy: RankedStrategyItem;
  score_lead_over_second: number;
}

export interface ExecutiveRecommendation {
  verdict: string;
  verdict_code: "GO" | "CONDITIONAL_GO" | "DEFER";
  verdict_rationale: string;
  recommended_entry_mode: RankedStrategyItem;
  preferred_customer_segments: {
    priority: string;
    segment: string;
    rationale: string;
    target_revenue_mix_pct: number;
  }[];
  target_regions: AutomotiveClusterItem[];
  investment_envelope: {
    initial_capex_usd_m: number;
    initial_nwc_usd_m: number;
    total_initial_investment_usd_m: number;
    total_5yr_capex_usd_m: number;
    peak_funding_requirement_usd_m: number;
    mitigation_budget_usd_m: number;
  };
  expected_financial_performance: Record<
    "conservative" | "base" | "optimistic",
    {
      year5_revenue_usd_m: number;
      year5_ebitda_margin_pct: number;
      npv_usd_m: number;
      irr_pct: number | null;
      roi_5yr_pct: number;
      simple_payback_years: number | null;
    }
  >;
  roadmap: {
    phase: string;
    window: string;
    workstream: string;
    key_milestones: string[];
    stage_gate: string;
  }[];
}

export interface RiskItem {
  id: number;
  risk_code: string;
  category: "Regulatory" | "Competitive" | "Supply-Chain" | "Currency" | "Demand" | "Operational";
  title: string;
  description: string;
  probability: number;
  impact: number;
  residual_probability: number;
  residual_impact: number;
  inherent_score: number;
  inherent_severity: "Low" | "Moderate" | "High" | "Critical";
  residual_score: number;
  residual_severity: "Low" | "Moderate" | "High" | "Critical";
  risk_reduction_pct: number;
  mitigation_strategy: string;
  owner: string;
  early_warning_indicator: string;
  estimated_mitigation_cost_usd_m: number;
  provenance: ProvenanceType;
  source_ref: string | null;
  is_custom: boolean;
}

export interface RiskAssessmentResponse {
  summary: {
    total_risks: number;
    critical_inherent_count: number;
    high_inherent_count: number;
    critical_residual_count: number;
    high_residual_count: number;
    avg_inherent_score: number;
    avg_residual_score: number;
    avg_risk_reduction_pct: number;
    total_mitigation_cost_usd_m: number;
  };
  category_summary: {
    category: string;
    count: number;
    avg_inherent_score: number;
    avg_residual_score: number;
    mitigation_cost_usd_m: number;
  }[];
  risks: RiskItem[];
}

export interface SourceRegisterItem {
  source_id: string;
  organization: string;
  title: string;
  publication_date: string;
  category: string;
  url: string;
  data_extracted: string;
  reliability_tier: string;
  usage_pages: string[];
}

export interface SourcesMethodologyResponse {
  sources: SourceRegisterItem[];
  categories: string[];
  total_sources: number;
  provenance_legend: { tag: ProvenanceType; meaning: string; examples: string }[];
  methodology: {
    id: string;
    domain: string;
    formula: string;
    explanation: string;
    provenance_split: string;
  }[];
}

export interface ExecutiveSummaryResponse {
  client_profile: {
    name: string;
    origin: string;
    focus_products: string[];
    planning_horizon: string;
    provenance: ProvenanceType;
  };
  active_scenario: {
    slug: string;
    name: string;
    scenario_type: string;
  };
  macro_benchmarks: MacroBenchmarks;
  recommendation: ExecutiveRecommendation;
  market_sizing_summary: MarketSizingResponse["summary"];
  active_financials: FinancialModelOutput;
  strategy_evaluation: StrategyDecisionMatrix;
  risk_summary: RiskAssessmentResponse["summary"];
  top_risks: RiskItem[];
  database_engine: string;
}
