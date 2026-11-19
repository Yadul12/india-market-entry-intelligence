from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.data.competitors import FY25_REPORTING_FX_INR_PER_USD, MARKET_GAPS_AND_ADVANTAGES
from app.db.database import get_db
from app.db.models import CompetitorRecord

router = APIRouter(prefix="/competitors", tags=["Competitor Intelligence"])


def _serialize_competitor(c: CompetitorRecord) -> dict:
    return {
        "id": c.id,
        "company_code": c.company_code,
        "name": c.name,
        "origin_group": c.origin_group,
        "headquarters": c.headquarters,
        "fiscal_period": c.fiscal_period,
        "revenue_inr_cr": c.revenue_inr_cr,
        "revenue_usd_m": c.revenue_usd_m,
        "margin_pct": c.margin_pct,
        "margin_metric": c.margin_metric,
        "pricing_positioning": c.pricing_positioning,
        "segments": c.segments_json,
        "product_portfolio": c.product_portfolio_json,
        "key_oems": c.key_oems_json,
        "clusters": c.clusters_json,
        "ev_readiness_score": c.ev_readiness_score,
        "localization_score": c.localization_score,
        "cost_competitiveness_score": c.cost_competitiveness_score,
        "tech_capability_score": c.tech_capability_score,
        "strengths": c.strengths,
        "vulnerabilities": c.vulnerabilities,
        "source_id": c.source_id,
    }


@router.get("")
def list_competitors(
    origin: str | None = Query(None, description="Filter by origin group"),
    segment: str | None = Query(None, description="Filter by vehicle segment (PV, CV, EV, 2W)"),
    search: str | None = Query(None, description="Search by company name or product"),
    db: Session = Depends(get_db),
):
    rows = db.query(CompetitorRecord).order_by(CompetitorRecord.revenue_inr_cr.desc()).all()
    items = [_serialize_competitor(r) for r in rows]

    if origin and origin != "All":
        items = [x for x in items if x["origin_group"] == origin]
    if segment and segment != "All":
        items = [x for x in items if segment in x["segments"]]
    if search:
        q = search.strip().lower()
        items = [
            x
            for x in items
            if q in x["name"].lower()
            or any(q in p.lower() for p in x["product_portfolio"])
            or any(q in o.lower() for o in x["key_oems"])
        ]

    # Group capability benchmark averages by origin vs Japanese Entrant target profile
    all_serialized = [_serialize_competitor(r) for r in rows]
    origin_groups = ["Indian Domestic", "European MNC", "Japanese Peer"]
    group_benchmarks = []
    for grp in origin_groups:
        subset = [x for x in all_serialized if x["origin_group"] == grp]
        if subset:
            group_benchmarks.append(
                {
                    "group": grp,
                    "count": len(subset),
                    "avg_margin_pct": round(sum(x["margin_pct"] for x in subset) / len(subset), 1),
                    "ev_readiness": round(sum(x["ev_readiness_score"] for x in subset) / len(subset), 1),
                    "localization": round(sum(x["localization_score"] for x in subset) / len(subset), 1),
                    "cost_competitiveness": round(sum(x["cost_competitiveness_score"] for x in subset) / len(subset), 1),
                    "tech_capability": round(sum(x["tech_capability_score"] for x in subset) / len(subset), 1),
                }
            )
    # Add target profile for the Japanese entrant via 51:49 JV (clearly marked ASSUMPTION)
    group_benchmarks.append(
        {
            "group": "Client Target (51:49 JV)",
            "count": 1,
            "avg_margin_pct": 14.5,
            "ev_readiness": 9.2,
            "localization": 8.0,
            "cost_competitiveness": 8.2,
            "tech_capability": 9.5,
            "provenance": "ASSUMPTION",
        }
    )

    return {
        "reporting_fx_note": f"FY25 audited INR Cr converted to USD Mn at FY25 average FX ({FY25_REPORTING_FX_INR_PER_USD} INR/USD) for historical peer comparability.",
        "competitors": items,
        "total_peer_count": len(all_serialized),
        "group_benchmarks": group_benchmarks,
        "market_gaps": MARKET_GAPS_AND_ADVANTAGES,
    }
