from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.entry_strategy import evaluate_entry_strategies, synthesize_executive_recommendation
from app.analytics.financial_model import run_financial_model
from app.analytics.market_sizing import compute_market_sizing
from app.analytics.risk_engine import analyze_risk_register
from app.data.baseline_models import (
    BASE_FINANCIAL_ASSUMPTIONS,
    CONSERVATIVE_FINANCIAL_ASSUMPTIONS,
    DEFAULT_MARKET_SIZING_ASSUMPTIONS,
    DEFAULT_STRATEGY_SCORES,
    DEFAULT_STRATEGY_WEIGHTS,
    OPTIMISTIC_FINANCIAL_ASSUMPTIONS,
)
from app.data.market_research import MACRO_BENCHMARKS
from app.db.database import ACTIVE_DB_ENGINE, get_db
from app.db.models import (
    EntryStrategyConfigRecord,
    FinancialScenarioRecord,
    MarketSizingConfigRecord,
    RiskItemRecord,
)

router = APIRouter(tags=["Overview & Executive Summary"])


def _risk_row_to_dict(r: RiskItemRecord) -> dict:
    return {
        "id": r.id,
        "risk_code": r.risk_code,
        "category": r.category,
        "title": r.title,
        "description": r.description,
        "probability": r.probability,
        "impact": r.impact,
        "residual_probability": r.residual_probability,
        "residual_impact": r.residual_impact,
        "mitigation_strategy": r.mitigation_strategy,
        "owner": r.owner,
        "early_warning_indicator": r.early_warning_indicator,
        "estimated_mitigation_cost_usd_m": r.estimated_mitigation_cost_usd_m,
        "provenance": r.provenance,
        "source_ref": r.source_ref,
        "is_custom": r.is_custom,
    }


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "database_engine": ACTIVE_DB_ENGINE,
        "service": "india-market-entry-intelligence",
    }


@router.get("/executive-summary")
def get_executive_summary(
    scenario_slug: str = Query("base", description="Scenario slug to highlight"),
    db: Session = Depends(get_db),
):
    ms_cfg = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    ms_assumptions = ms_cfg.assumptions_json if ms_cfg else DEFAULT_MARKET_SIZING_ASSUMPTIONS
    market_sizing = compute_market_sizing(ms_assumptions)

    scenarios = {
        rec.slug: rec for rec in db.query(FinancialScenarioRecord).all()
    }
    base_rec = scenarios.get("base")
    cons_rec = scenarios.get("conservative")
    opt_rec = scenarios.get("optimistic")
    active_rec = scenarios.get(scenario_slug) or base_rec

    base_fin = run_financial_model(base_rec.assumptions_json if base_rec else BASE_FINANCIAL_ASSUMPTIONS)
    cons_fin = run_financial_model(cons_rec.assumptions_json if cons_rec else CONSERVATIVE_FINANCIAL_ASSUMPTIONS)
    opt_fin = run_financial_model(opt_rec.assumptions_json if opt_rec else OPTIMISTIC_FINANCIAL_ASSUMPTIONS)
    active_fin = run_financial_model(active_rec.assumptions_json if active_rec else BASE_FINANCIAL_ASSUMPTIONS)

    strat_cfg = db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first()
    strategy_eval = evaluate_entry_strategies(
        strat_cfg.weights_json if strat_cfg else DEFAULT_STRATEGY_WEIGHTS,
        strat_cfg.scores_json if strat_cfg else DEFAULT_STRATEGY_SCORES,
    )

    risk_rows = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).all()]
    risk_analysis = analyze_risk_register(risk_rows)

    recommendation = synthesize_executive_recommendation(
        market_sizing=market_sizing,
        base_financials=base_fin,
        conservative_financials=cons_fin,
        optimistic_financials=opt_fin,
        strategy_eval=strategy_eval,
        risk_summary=risk_analysis["summary"],
    )

    return {
        "client_profile": {
            "name": "Nippon Precision Mobility Corp. (Illustrative Client)",
            "origin": "Aichi Prefecture, Japan",
            "focus_products": [
                "EV Battery Thermal & Heat-Pump Modules",
                "Power Electronics & e-Axle Sub-Assemblies",
                "Chassis & Regenerative Braking Mechatronics",
            ],
            "planning_horizon": "5-Year Financial Model (FY27–FY31) | 3-Year Entry Roadmap (2027–2029)",
            "provenance": "ASSUMPTION",
        },
        "active_scenario": {
            "slug": active_rec.slug if active_rec else "base",
            "name": active_rec.name if active_rec else "Base Case (Recommended)",
            "scenario_type": active_rec.scenario_type if active_rec else "base",
        },
        "macro_benchmarks": MACRO_BENCHMARKS,
        "recommendation": recommendation,
        "market_sizing_summary": market_sizing["summary"],
        "active_financials": active_fin,
        "strategy_evaluation": strategy_eval,
        "risk_summary": risk_analysis["summary"],
        "top_risks": risk_analysis["risks"][:5],
        "database_engine": ACTIVE_DB_ENGINE,
    }
