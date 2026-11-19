from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class MarketSizingAssumptionsInput(BaseModel):
    base_year: str = "FY26"
    base_tam_usd_bn: float = Field(85.9, ge=10.0, le=500.0)
    oem_domestic_share_pct: float = Field(84.5, ge=20.0, le=100.0)
    pv_cagr_pct: float = Field(9.5, ge=-10.0, le=40.0)
    cv_cagr_pct: float = Field(7.5, ge=-10.0, le=40.0)
    ev_cagr_pct: float = Field(24.0, ge=0.0, le=60.0)
    other_cagr_pct: float = Field(8.0, ge=-10.0, le=35.0)
    include_suspension_braking: bool = True
    include_drive_transmission: bool = True
    include_electrical_electronics: bool = True
    include_engine: bool = False
    include_body_chassis: bool = False
    include_interiors: bool = False
    include_cooling_misc: bool = False
    tier1_addressable_factor_pct: float = Field(42.0, ge=5.0, le=100.0)
    export_hub_adder_pct: float = Field(12.0, ge=0.0, le=60.0)
    som_year1_share_pct: float = Field(0.14, ge=0.01, le=15.0)
    som_year5_share_pct: float = Field(0.68, ge=0.02, le=25.0)
    ramp_curve: Literal["linear", "s_curve", "backloaded"] = "s_curve"


class FinancialAssumptionsInput(BaseModel):
    horizon_years: int = Field(5, ge=5, le=5)
    start_fiscal_year: int = Field(2027, ge=2026, le=2035)
    year1_revenue_usd_m: float = Field(28.0, ge=1.0, le=500.0)
    revenue_growth_rates_pct: list[float] = Field(default=[95.0, 58.0, 36.0, 24.0], min_length=4, max_length=4)
    export_revenue_share_pct: float = Field(18.0, ge=0.0, le=80.0)
    cogs_pct_year1: float = Field(71.0, ge=40.0, le=90.0)
    cogs_localization_stepdown_bps: float = Field(160.0, ge=0.0, le=500.0)
    direct_labor_overhead_pct: float = Field(8.5, ge=2.0, le=25.0)
    sga_pct: float = Field(7.5, ge=2.0, le=25.0)
    rd_engineering_pct: float = Field(3.0, ge=0.5, le=15.0)
    royalty_tech_fee_pct: float = Field(2.5, ge=0.0, le=10.0)
    pli_incentive_enabled: bool = False
    pli_incentive_pct: float = Field(0.0, ge=0.0, le=18.0)
    initial_capex_usd_m: float = Field(48.0, ge=5.0, le=300.0)
    maintenance_capex_pct_rev: float = Field(3.5, ge=0.5, le=15.0)
    expansion_capex_y3_usd_m: float = Field(14.0, ge=0.0, le=150.0)
    depreciation_years: float = Field(10.0, ge=5.0, le=25.0)
    dso_days: float = Field(58.0, ge=15.0, le=150.0)
    dio_days: float = Field(52.0, ge=10.0, le=150.0)
    dpo_days: float = Field(55.0, ge=15.0, le=150.0)
    corporate_tax_rate_pct: float = Field(25.17, ge=0.0, le=45.0)
    wacc_pct: float = Field(12.5, ge=5.0, le=28.0)
    terminal_growth_pct: float = Field(4.0, ge=0.0, le=8.0)
    usd_inr_rate: float = Field(94.0, ge=60.0, le=140.0)
    jpy_inr_rate: float = Field(0.59, ge=0.30, le=1.20)
    entry_mode_label: str = "Majority Joint Venture (51:49)"

    @field_validator("revenue_growth_rates_pct")
    @classmethod
    def validate_growth_rates(cls, v: list[float]) -> list[float]:
        for rate in v:
            if rate < -50.0 or rate > 250.0:
                raise ValueError("Annual growth rates must be between -50% and 250%.")
        return v


class ScenarioCreateInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str = Field("", max_length=500)
    assumptions: FinancialAssumptionsInput


class ScenarioUpdateInput(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    description: str | None = Field(None, max_length=500)
    assumptions: FinancialAssumptionsInput


class StrategyMatrixUpdateInput(BaseModel):
    weights: dict[str, float]
    score_overrides: dict[str, dict[str, float]] | None = None

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, v: dict[str, float]) -> dict[str, float]:
        if not v or sum(max(0.0, val) for val in v.values()) <= 0:
            raise ValueError("At least one criterion weight must be greater than zero.")
        return v


class RiskCreateInput(BaseModel):
    category: Literal["Regulatory", "Competitive", "Supply-Chain", "Currency", "Demand", "Operational"]
    title: str = Field(..., min_length=4, max_length=160)
    description: str = Field(..., min_length=8, max_length=1200)
    probability: int = Field(..., ge=1, le=5)
    impact: int = Field(..., ge=1, le=5)
    residual_probability: int = Field(..., ge=1, le=5)
    residual_impact: int = Field(..., ge=1, le=5)
    mitigation_strategy: str = Field(..., min_length=6, max_length=1200)
    owner: str = Field(..., min_length=2, max_length=96)
    early_warning_indicator: str = Field(..., min_length=4, max_length=200)
    estimated_mitigation_cost_usd_m: float = Field(0.5, ge=0.0, le=50.0)


class RiskUpdateInput(BaseModel):
    probability: int | None = Field(None, ge=1, le=5)
    impact: int | None = Field(None, ge=1, le=5)
    residual_probability: int | None = Field(None, ge=1, le=5)
    residual_impact: int | None = Field(None, ge=1, le=5)
    mitigation_strategy: str | None = Field(None, min_length=6, max_length=1200)
    owner: str | None = Field(None, min_length=2, max_length=96)
    estimated_mitigation_cost_usd_m: float | None = Field(None, ge=0.0, le=50.0)


class ExecutivePdfRequest(BaseModel):
    scenario_slug: str = "base"
    display_currency: Literal["USD", "INR", "JPY"] = "USD"
    custom_assumptions: dict[str, Any] | None = None
