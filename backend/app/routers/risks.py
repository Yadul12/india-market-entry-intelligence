from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.analytics.risk_engine import analyze_risk_register
from app.data.baseline_models import INITIAL_RISK_REGISTER
from app.db.database import get_db
from app.db.models import RiskItemRecord
from app.routers.overview import _risk_row_to_dict
from app.schemas.api_schemas import RiskCreateInput, RiskUpdateInput

router = APIRouter(prefix="/risks", tags=["Risk Assessment"])


@router.get("")
def get_risk_assessment(
    category: str | None = Query(None, description="Filter by risk category"),
    db: Session = Depends(get_db),
):
    rows = db.query(RiskItemRecord).order_by(RiskItemRecord.id.asc()).all()
    risk_dicts = [_risk_row_to_dict(r) for r in rows]
    full_analysis = analyze_risk_register(risk_dicts)

    if category and category != "All":
        filtered_risks = [r for r in full_analysis["risks"] if r["category"] == category]
        return {
            **full_analysis,
            "risks": filtered_risks,
        }
    return full_analysis


@router.post("")
def create_risk(payload: RiskCreateInput, db: Session = Depends(get_db)):
    existing_codes = [r.risk_code for r in db.query(RiskItemRecord).all()]
    next_num = len(existing_codes) + 1
    while f"R-{next_num:02d}" in existing_codes:
        next_num += 1
    code = f"R-{next_num:02d}"

    rec = RiskItemRecord(
        risk_code=code,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        probability=payload.probability,
        impact=payload.impact,
        residual_probability=payload.residual_probability,
        residual_impact=payload.residual_impact,
        mitigation_strategy=payload.mitigation_strategy,
        owner=payload.owner,
        early_warning_indicator=payload.early_warning_indicator,
        estimated_mitigation_cost_usd_m=payload.estimated_mitigation_cost_usd_m,
        provenance="ASSUMPTION",
        source_ref=None,
        is_custom=True,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    all_rows = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).order_by(RiskItemRecord.id.asc()).all()]
    return analyze_risk_register(all_rows)


@router.patch("/{risk_code}")
def update_risk(risk_code: str, payload: RiskUpdateInput, db: Session = Depends(get_db)):
    rec = db.query(RiskItemRecord).filter_by(risk_code=risk_code).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Risk '{risk_code}' not found.")

    update_data = payload.model_dump(exclude_none=True)
    for field, val in update_data.items():
        setattr(rec, field, val)
    db.commit()

    all_rows = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).order_by(RiskItemRecord.id.asc()).all()]
    return analyze_risk_register(all_rows)


@router.delete("/{risk_code}")
def delete_custom_risk(risk_code: str, db: Session = Depends(get_db)):
    rec = db.query(RiskItemRecord).filter_by(risk_code=risk_code).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Risk '{risk_code}' not found.")
    if not rec.is_custom:
        raise HTTPException(status_code=400, detail="Baseline consulting risks cannot be deleted; edit their scores instead.")
    db.delete(rec)
    db.commit()
    all_rows = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).order_by(RiskItemRecord.id.asc()).all()]
    return analyze_risk_register(all_rows)


@router.post("/reset")
def reset_risk_register(db: Session = Depends(get_db)):
    db.query(RiskItemRecord).delete()
    for item in INITIAL_RISK_REGISTER:
        db.add(
            RiskItemRecord(
                risk_code=item["risk_code"],
                category=item["category"],
                title=item["title"],
                description=item["description"],
                probability=item["probability"],
                impact=item["impact"],
                residual_probability=item["residual_probability"],
                residual_impact=item["residual_impact"],
                mitigation_strategy=item["mitigation_strategy"],
                owner=item["owner"],
                early_warning_indicator=item["early_warning_indicator"],
                estimated_mitigation_cost_usd_m=item["estimated_mitigation_cost_usd_m"],
                provenance=item["provenance"],
                source_ref=item["source_ref"],
                is_custom=False,
            )
        )
    db.commit()
    all_rows = [_risk_row_to_dict(r) for r in db.query(RiskItemRecord).order_by(RiskItemRecord.id.asc()).all()]
    return analyze_risk_register(all_rows)
