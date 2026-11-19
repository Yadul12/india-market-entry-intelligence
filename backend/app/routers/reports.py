from fastapi import APIRouter, Depends
from fastapi.responses import Response
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
from app.db.database import get_db
from app.db.models import (
    CompetitorRecord,
    EntryStrategyConfigRecord,
    FinancialScenarioRecord,
    MarketSizingConfigRecord,
    RiskItemRecord,
    SourceRegisterRecord,
)
from app.reports.pdf_generator import generate_executive_pdf
from app.routers.competitors import _serialize_competitor
from app.routers.overview import _risk_row_to_dict
from app.schemas.api_schemas import ExecutivePdfRequest

router = APIRouter(prefix="/reports", tags=["Executive Report Export"])


@router.post("/executive-pdf")
def export_executive_pdf(payload: ExecutivePdfRequest, db: Session = Depends(get_db)):
    ms_cfg = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    market_sizing = compute_market_sizing(ms_cfg.assumptions_json if ms_cfg else DEFAULT_MARKET_SIZING_ASSUMPTIONS)

    scenario_records = db.query(FinancialScenarioRecord).order_by(FinancialScenarioRecord.id.asc()).all()
    scenario_map = {r.slug: r for r in scenario_records}

    base_fin = run_financial_model(
        scenario_map["base"].assumptions_json if "base" in scenario_map else BASE_FINANCIAL_ASSUMPTIONS
    )
    cons_fin = run_financial_model(
        scenario_map["conservative"].assumptions_json
        if "conservative" in scenario_map
        else CONSERVATIVE_FINANCIAL_ASSUMPTIONS
    )
    opt_fin = run_financial_model(
        scenario_map["optimistic"].assumptions_json
        if "optimistic" in scenario_map
        else OPTIMISTIC_FINANCIAL_ASSUMPTIONS
    )

    if payload.custom_assumptions:
        active_fin = run_financial_model(payload.custom_assumptions)
        scenario_name = "Custom Live Assumptions"
    else:
        active_rec = scenario_map.get(payload.scenario_slug) or scenario_map.get("base")
        active_fin = run_financial_model(active_rec.assumptions_json if active_rec else BASE_FINANCIAL_ASSUMPTIONS)
        scenario_name = active_rec.name if active_rec else "Base Case (Recommended)"

    scenarios_comp = [
        {"name": r.name, **run_financial_model(r.assumptions_json)} for r in scenario_records
    ]

    strat_cfg = db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first()
    strategy_eval = evaluate_entry_strategies(
        strat_cfg.weights_json if strat_cfg else DEFAULT_STRATEGY_WEIGHTS,
        strat_cfg.scores_json if strat_cfg else DEFAULT_STRATEGY_SCORES,
    )

    risks = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).all()]
    risk_analysis = analyze_risk_register(risks)

    recommendation = synthesize_executive_recommendation(
        market_sizing=market_sizing,
        base_financials=base_fin,
        conservative_financials=cons_fin,
        optimistic_financials=opt_fin,
        strategy_eval=strategy_eval,
        risk_summary=risk_analysis["summary"],
    )

    competitors = [
        _serialize_competitor(c)
        for c in db.query(CompetitorRecord).order_by(CompetitorRecord.revenue_inr_cr.desc()).all()
    ]
    sources = [
        {
            "source_id": s.source_id,
            "organization": s.organization,
            "title": s.title,
            "publication_date": s.publication_date,
            "url": s.url,
        }
        for s in db.query(SourceRegisterRecord).order_by(SourceRegisterRecord.source_id.asc()).all()
    ]

    pdf_bytes = generate_executive_pdf(
        recommendation=recommendation,
        market_sizing=market_sizing,
        active_financials=active_fin,
        scenarios_comparison=scenarios_comp,
        strategy_eval=strategy_eval,
        risk_analysis=risk_analysis,
        competitors=competitors,
        sources=sources,
        scenario_name=scenario_name,
        display_currency=payload.display_currency,
    )

    filename = f"India_Market_Entry_Executive_Report_{payload.scenario_slug}_{payload.display_currency}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
