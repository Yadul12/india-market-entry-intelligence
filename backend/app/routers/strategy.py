from copy import deepcopy

from fastapi import APIRouter, Depends
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
    EntryStrategyConfigRecord,
    FinancialScenarioRecord,
    MarketSizingConfigRecord,
    RiskItemRecord,
)
from app.routers.overview import _risk_row_to_dict
from app.schemas.api_schemas import StrategyMatrixUpdateInput

router = APIRouter(prefix="/strategy", tags=["Market Entry Strategy & Recommendation"])


def _build_strategy_response(db: Session, weights: dict, scores: dict) -> dict:
    strategy_eval = evaluate_entry_strategies(weights, scores)

    ms_cfg = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    market_sizing = compute_market_sizing(ms_cfg.assumptions_json if ms_cfg else DEFAULT_MARKET_SIZING_ASSUMPTIONS)

    scenarios = {r.slug: r for r in db.query(FinancialScenarioRecord).all()}
    base_fin = run_financial_model(scenarios["base"].assumptions_json if "base" in scenarios else BASE_FINANCIAL_ASSUMPTIONS)
    cons_fin = run_financial_model(
        scenarios["conservative"].assumptions_json if "conservative" in scenarios else CONSERVATIVE_FINANCIAL_ASSUMPTIONS
    )
    opt_fin = run_financial_model(
        scenarios["optimistic"].assumptions_json if "optimistic" in scenarios else OPTIMISTIC_FINANCIAL_ASSUMPTIONS
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

    return {
        "decision_matrix": strategy_eval,
        "recommendation": recommendation,
    }


@router.get("")
def get_entry_strategy(db: Session = Depends(get_db)):
    cfg = db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first()
    weights = cfg.weights_json if cfg else DEFAULT_STRATEGY_WEIGHTS
    scores = cfg.scores_json if cfg else DEFAULT_STRATEGY_SCORES
    return _build_strategy_response(db, weights, scores)


@router.put("/matrix")
def update_strategy_matrix(payload: StrategyMatrixUpdateInput, db: Session = Depends(get_db)):
    cfg = db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first()
    current_scores = deepcopy(cfg.scores_json if cfg else DEFAULT_STRATEGY_SCORES)

    if payload.score_overrides:
        for strat_key, crit_map in payload.score_overrides.items():
            if strat_key in current_scores:
                for ck, val in crit_map.items():
                    if ck in current_scores[strat_key]["scores"]:
                        current_scores[strat_key]["scores"][ck] = max(1.0, min(10.0, float(val)))

    if cfg:
        cfg.weights_json = payload.weights
        cfg.scores_json = current_scores
    else:
        db.add(
            EntryStrategyConfigRecord(
                config_key="default",
                weights_json=payload.weights,
                scores_json=current_scores,
            )
        )
    db.commit()
    return _build_strategy_response(db, payload.weights, current_scores)


@router.post("/matrix/reset")
def reset_strategy_matrix(db: Session = Depends(get_db)):
    cfg = db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first()
    if cfg:
        cfg.weights_json = DEFAULT_STRATEGY_WEIGHTS
        cfg.scores_json = DEFAULT_STRATEGY_SCORES
    else:
        db.add(
            EntryStrategyConfigRecord(
                config_key="default",
                weights_json=DEFAULT_STRATEGY_WEIGHTS,
                scores_json=DEFAULT_STRATEGY_SCORES,
            )
        )
    db.commit()
    return _build_strategy_response(db, DEFAULT_STRATEGY_WEIGHTS, DEFAULT_STRATEGY_SCORES)
