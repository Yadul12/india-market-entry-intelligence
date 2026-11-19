from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import SourceRegisterRecord

router = APIRouter(prefix="/sources", tags=["Sources & Methodology"])


METHODOLOGY_SECTIONS = [
    {
        "id": "METH-01",
        "domain": "TAM / SAM / SOM Market Sizing",
        "formula": "TAM_t = Sum_s(Base_s * (1 + CAGR_s)^t);  SAM_t = TAM_t * OEM% * Sum(TargetCat%) * Tier1Factor * (1 + ExportAdder%);  SOM_t = SAM_t * CaptureShare_t",
        "explanation": (
            "Anchored to ACMA FY2026 verified industry turnover ($85.9B [SRC-01]). Segment baselines decompose FY26 TAM "
            "using ACMA OEM channel (84.5%), EV non-battery share (4.6%), PV (46%), CV (23%), and Other segments. "
            "Forward 5-year TAM compounds segment-by-segment; SAM isolates Tier-1 addressable precision categories; "
            "SOM applies an S-curve, linear, or back-loaded OEM nomination ramp."
        ),
        "provenance_split": "FY20–FY26 historicals & category shares = SOURCED; Forward CAGRs, Tier-1 filter & capture shares = ASSUMPTION; FY27–FY31 values = DERIVED.",
    },
    {
        "id": "METH-02",
        "domain": "5-Year DCF Valuation (NPV, IRR & Terminal Value)",
        "formula": "FCFF_t = NOPAT_t + D&A_t - DeltaNWC_t - CAPEX_t;  NPV = -CAPEX_0 + Sum(FCFF_t / (1+WACC)^t) + [FCF_5*(1+g)/(WACC-g)] / (1+WACC)^5",
        "explanation": (
            "Unlevered Free Cash Flow to Firm (FCFF) is modeled annually across FY27–FY31 in Pandas/NumPy. "
            "Indian corporate tax follows Section 115BAA (25.17% effective rate [SRC-09]) with statutory operating loss carryforward. "
            "Both 5-year explicit NPV (excluding terminal value) and full DCF NPV (including Gordon Growth Terminal Value) "
            "are surfaced to prevent terminal-value distortion. IRR solves NPV(r)=0 via bounded bisection."
        ),
        "provenance_split": "Corporate tax (25.17%) & FX rates (94.0 INR/USD, 0.59 INR/JPY) = SOURCED; CAPEX, COGS localization, WACC & ramp = ASSUMPTION; P&L/FCF/NPV/IRR = DERIVED.",
    },
    {
        "id": "METH-03",
        "domain": "Working Capital, Payback, ROI & Operating Break-Even",
        "formula": "NWC = (DSO/365)*Rev + (DIO/365)*COGS - (DPO/365)*COGS;  5Y ROI = (Sum PAT_1..5 / Total Capital Deployed) * 100;  BreakEvenRev = FixedCostBase / ContributionMarginRatio",
        "explanation": (
            "Accounts Receivable, Inventory, and Payables scale dynamically with OEM credit terms (DSO), CKD/local inventory "
            "buffer (DIO), and supplier credit (DPO). Simple and discounted payback interpolate the exact fractional year "
            "cumulative cash flow crosses zero. Peak funding measures the maximum cumulative cash trough."
        ),
        "provenance_split": "DSO/DIO/DPO & fixed overhead floors = ASSUMPTION; NWC, Payback, ROI & ROCE = DERIVED.",
    },
    {
        "id": "METH-04",
        "domain": "Entry Mode Weighted MCDA & Go/No-Go Synthesis",
        "formula": "WeightedScore_j = Sum_k(Score_{j,k} * (Weight_k / Sum(Weight)));  Verdict = f(Base NPV, Base IRR - WACC, Conservative NPV)",
        "explanation": (
            "Four entry archetypes (Greenfield WOS, Majority JV, Brownfield Acquisition, Strategic Partnership) are evaluated "
            "on a 1–10 scale across 5 weighted criteria normalized automatically to 100%. Executive Go / Conditional Go / Defer "
            "status recalculates dynamically whenever scenario assumptions change."
        ),
        "provenance_split": "Strategic rationale benchmarks (Subros/Uno Minda JV precedents) = SOURCED; Criteria weights & scores = ASSUMPTION (editable); Rankings & verdict = DERIVED.",
    },
    {
        "id": "METH-05",
        "domain": "Risk Scoring & Probability–Impact Matrix",
        "formula": "InherentScore = P * I (1..25);  ResidualScore = P_res * I_res (1..25);  Reduction% = (Inherent - Residual) / Inherent",
        "explanation": (
            "Risks across Regulatory, Competitive, Supply-Chain, Currency, Demand, and Operational domains are plotted on a "
            "5x5 matrix (Low: 1–4, Moderate: 5–9, High: 10–15, Critical: 16–25) both before and after budgeted mitigation actions."
        ),
        "provenance_split": "Regulatory/FX/market triggers = SOURCED where cited; Probability/impact ratings & mitigation costs = ASSUMPTION (editable).",
    },
]

PROVENANCE_LEGEND = [
    {
        "tag": "SOURCED",
        "meaning": "Verified public statistic extracted directly from an institutional publication or audited filing listed in the Source Register.",
        "examples": "ACMA FY20–FY26 turnover ($85.9B), SIAM FY25 sales (4.30M PV), MHI PLI-Auto (INR 25,938 Cr), Sec 115BAA tax (25.17%), FY25 competitor filings.",
    },
    {
        "tag": "ASSUMPTION",
        "meaning": "Illustrative client parameter, modeling input, or consulting assessment that users can inspect, modify, and persist to test sensitivities.",
        "examples": "Nippon Precision Mobility Corp. Year-1 revenue ($28M), COGS localization curve, initial CAPEX ($48M), WACC (12.5%), MCDA weights, risk scores.",
    },
    {
        "tag": "DERIVED",
        "meaning": "Calculated deterministically on the Python (Pandas + NumPy) analytical backend from SOURCED baselines combined with active ASSUMPTION parameters.",
        "examples": "FY27–FY31 TAM/SAM/SOM projections, 5-year P&L, FCFF, NPV, IRR, Payback, Sensitivity Tornado/2D Grid, Entry Mode Rankings, Go/No-Go Verdict.",
    },
]


@router.get("")
def get_sources_and_methodology(
    category: str | None = Query(None, description="Filter source register by category"),
    search: str | None = Query(None, description="Search organizations or extracted data"),
    db: Session = Depends(get_db),
):
    rows = db.query(SourceRegisterRecord).order_by(SourceRegisterRecord.source_id.asc()).all()
    items = [
        {
            "source_id": r.source_id,
            "organization": r.organization,
            "title": r.title,
            "publication_date": r.publication_date,
            "category": r.category,
            "url": r.url,
            "data_extracted": r.data_extracted,
            "reliability_tier": r.reliability_tier,
            "usage_pages": r.usage_pages_json,
        }
        for r in rows
    ]

    all_categories = sorted(list({item["category"] for item in items}))

    if category and category != "All":
        items = [x for x in items if x["category"] == category]
    if search:
        q = search.strip().lower()
        items = [
            x
            for x in items
            if q in x["organization"].lower()
            or q in x["title"].lower()
            or q in x["data_extracted"].lower()
            or q in x["source_id"].lower()
        ]

    return {
        "sources": items,
        "categories": all_categories,
        "total_sources": len(rows),
        "provenance_legend": PROVENANCE_LEGEND,
        "methodology": METHODOLOGY_SECTIONS,
    }
