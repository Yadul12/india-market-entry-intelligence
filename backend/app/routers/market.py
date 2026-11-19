from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.analytics.market_sizing import compute_market_sizing
from app.data.baseline_models import DEFAULT_MARKET_SIZING_ASSUMPTIONS
from app.data.market_research import (
    AUTOMOTIVE_CLUSTERS,
    COMPONENT_CATEGORIES,
    DEMAND_DRIVERS,
    FY25_CHANNEL_STRUCTURE,
    HISTORICAL_TURNOVER,
    MACRO_BENCHMARKS,
    REGULATORY_POLICIES,
    SIAM_VEHICLE_VOLUMES,
)
from app.db.database import get_db
from app.db.models import MarketSizingConfigRecord
from app.schemas.api_schemas import MarketSizingAssumptionsInput

router = APIRouter(prefix="/market", tags=["Market Intelligence & Sizing"])


@router.get("/intelligence")
def get_market_intelligence():
    return {
        "historical_turnover": HISTORICAL_TURNOVER,
        "channel_structure": FY25_CHANNEL_STRUCTURE,
        "vehicle_volumes": SIAM_VEHICLE_VOLUMES,
        "component_categories": COMPONENT_CATEGORIES,
        "macro_benchmarks": MACRO_BENCHMARKS,
        "demand_drivers": DEMAND_DRIVERS,
        "regulatory_policies": REGULATORY_POLICIES,
        "automotive_clusters": AUTOMOTIVE_CLUSTERS,
    }


@router.get("/sizing")
def get_market_sizing(db: Session = Depends(get_db)):
    rec = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    assumptions = rec.assumptions_json if rec else DEFAULT_MARKET_SIZING_ASSUMPTIONS
    return compute_market_sizing(assumptions)


@router.post("/sizing/calculate")
def calculate_market_sizing_ephemeral(payload: MarketSizingAssumptionsInput):
    return compute_market_sizing(payload.model_dump())


@router.put("/sizing")
def save_market_sizing(payload: MarketSizingAssumptionsInput, db: Session = Depends(get_db)):
    data = payload.model_dump()
    rec = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    if rec:
        rec.assumptions_json = data
    else:
        db.add(MarketSizingConfigRecord(config_key="default", assumptions_json=data))
    db.commit()
    return compute_market_sizing(data)


@router.post("/sizing/reset")
def reset_market_sizing(db: Session = Depends(get_db)):
    rec = db.query(MarketSizingConfigRecord).filter_by(config_key="default").first()
    if rec:
        rec.assumptions_json = DEFAULT_MARKET_SIZING_ASSUMPTIONS
    else:
        db.add(
            MarketSizingConfigRecord(
                config_key="default",
                assumptions_json=DEFAULT_MARKET_SIZING_ASSUMPTIONS,
            )
        )
    db.commit()
    return compute_market_sizing(DEFAULT_MARKET_SIZING_ASSUMPTIONS)
