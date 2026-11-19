import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.analytics.financial_model import run_financial_model
from app.analytics.sensitivity import run_tornado_sensitivity, run_two_way_sensitivity
from app.data.baseline_models import SYSTEM_SCENARIOS
from app.db.database import get_db
from app.db.models import FinancialScenarioRecord
from app.schemas.api_schemas import (
    FinancialAssumptionsInput,
    ScenarioCreateInput,
    ScenarioUpdateInput,
)

router = APIRouter(prefix="/financials", tags=["Financial Modelling & Scenarios"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug[:56] or "custom-scenario"


def _serialize_scenario(rec: FinancialScenarioRecord) -> dict:
    model_out = run_financial_model(rec.assumptions_json)
    return {
        "id": rec.id,
        "slug": rec.slug,
        "name": rec.name,
        "scenario_type": rec.scenario_type,
        "description": rec.description,
        "is_system": rec.is_system,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
        **model_out,
    }


@router.get("/scenarios")
def list_scenarios(db: Session = Depends(get_db)):
    records = db.query(FinancialScenarioRecord).order_by(FinancialScenarioRecord.id.asc()).all()
    return {
        "scenarios": [_serialize_scenario(r) for r in records],
    }


@router.get("/scenarios/{slug}")
def get_scenario(slug: str, db: Session = Depends(get_db)):
    rec = db.query(FinancialScenarioRecord).filter_by(slug=slug).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scenario '{slug}' not found.")
    return _serialize_scenario(rec)


@router.post("/calculate")
def calculate_financials_ephemeral(payload: FinancialAssumptionsInput):
    return run_financial_model(payload.model_dump())


@router.post("/scenarios")
def create_scenario(payload: ScenarioCreateInput, db: Session = Depends(get_db)):
    base_slug = _slugify(payload.name)
    slug = base_slug
    counter = 1
    while db.query(FinancialScenarioRecord).filter_by(slug=slug).first():
        counter += 1
        slug = f"{base_slug}-{counter}"

    rec = FinancialScenarioRecord(
        slug=slug,
        name=payload.name,
        scenario_type="custom",
        description=payload.description,
        is_system=False,
        assumptions_json=payload.assumptions.model_dump(),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _serialize_scenario(rec)


@router.put("/scenarios/{slug}")
def update_scenario(slug: str, payload: ScenarioUpdateInput, db: Session = Depends(get_db)):
    rec = db.query(FinancialScenarioRecord).filter_by(slug=slug).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scenario '{slug}' not found.")
    if payload.name and not rec.is_system:
        rec.name = payload.name
    if payload.description is not None:
        rec.description = payload.description
    rec.assumptions_json = payload.assumptions.model_dump()
    db.commit()
    db.refresh(rec)
    return _serialize_scenario(rec)


@router.post("/scenarios/{slug}/reset")
def reset_system_scenario(slug: str, db: Session = Depends(get_db)):
    default_match = next((s for s in SYSTEM_SCENARIOS if s["slug"] == slug), None)
    if not default_match:
        raise HTTPException(status_code=400, detail="Only system scenarios (conservative, base, optimistic) can be reset.")
    rec = db.query(FinancialScenarioRecord).filter_by(slug=slug).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scenario '{slug}' not found.")
    rec.assumptions_json = default_match["assumptions"]
    db.commit()
    db.refresh(rec)
    return _serialize_scenario(rec)


@router.delete("/scenarios/{slug}")
def delete_scenario(slug: str, db: Session = Depends(get_db)):
    rec = db.query(FinancialScenarioRecord).filter_by(slug=slug).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scenario '{slug}' not found.")
    if rec.is_system:
        raise HTTPException(status_code=400, detail="System scenarios cannot be deleted.")
    db.delete(rec)
    db.commit()
    return {"deleted": slug}


@router.get("/sensitivity")
def get_sensitivity_analysis(
    scenario_slug: str = Query("base", description="Scenario slug for sensitivity baseline"),
    db: Session = Depends(get_db),
):
    rec = db.query(FinancialScenarioRecord).filter_by(slug=scenario_slug).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_slug}' not found.")
    return {
        "scenario_slug": rec.slug,
        "scenario_name": rec.name,
        "tornado": run_tornado_sensitivity(rec.assumptions_json),
        "two_way": run_two_way_sensitivity(rec.assumptions_json),
    }


@router.post("/sensitivity")
def calculate_sensitivity_custom(payload: FinancialAssumptionsInput):
    assumptions = payload.model_dump()
    return {
        "scenario_slug": "custom-live",
        "scenario_name": "Live Model Assumptions",
        "tornado": run_tornado_sensitivity(assumptions),
        "two_way": run_two_way_sensitivity(assumptions),
    }
