"""
TAM / SAM / SOM Market Sizing Engine (Pandas + NumPy).
Separates verified ACMA/SIAM baseline figures (SOURCED) from adjustable client assumptions (ASSUMPTION)
to compute 5-year forward projections (DERIVED).
"""

from typing import Any

import numpy as np
import pandas as pd

from app.data.market_research import COMPONENT_CATEGORIES, HISTORICAL_TURNOVER


def calculate_cagr(start_val: float, end_val: float, periods: int) -> float:
    if start_val <= 0 or end_val <= 0 or periods <= 0:
        return 0.0
    return float(((end_val / start_val) ** (1.0 / periods) - 1.0) * 100.0)


def _ramp_weights(steps: int, curve: str) -> np.ndarray:
    """Return normalized [0..1] progress fractions across `steps` forecast years."""
    if steps <= 1:
        return np.array([1.0])
    t = np.linspace(0.0, 1.0, steps)
    if curve == "linear":
        return t
    if curve == "backloaded":
        return np.power(t, 1.65)
    # Default: smooth S-curve (logistic-like cubic Hermite smoothstep)
    return t * t * (3.0 - 2.0 * t)


def compute_market_sizing(assumptions: dict[str, Any]) -> dict[str, Any]:
    """Run full historical + 5-year forward TAM/SAM/SOM model using Pandas & NumPy."""
    hist_df = pd.DataFrame(HISTORICAL_TURNOVER)
    hist_cagr = calculate_cagr(
        float(hist_df.iloc[0]["turnover_usd_bn"]),
        float(hist_df.iloc[-1]["turnover_usd_bn"]),
        len(hist_df) - 1,
    )

    base_tam = float(assumptions["base_tam_usd_bn"])
    oem_share = float(assumptions["oem_domestic_share_pct"]) / 100.0

    # Baseline FY26 segment decomposition anchored to ACMA structure (SRC-01):
    # Domestic OEM split: EV ~4.6% of OEM; remaining non-EV OEM split across PV (46%), CV (23%), Other OEM (31%)
    # Non-OEM aftermarket/other fills remainder up to total TAM.
    ev_base = base_tam * oem_share * 0.046
    non_ev_oem = base_tam * oem_share * (1.0 - 0.046)
    pv_base = non_ev_oem * 0.46
    cv_base = non_ev_oem * 0.23
    other_base = base_tam - (ev_base + pv_base + cv_base)

    # Selected product categories for SAM
    category_flags = {
        "engine": bool(assumptions.get("include_engine", False)),
        "suspension_braking": bool(assumptions.get("include_suspension_braking", True)),
        "drive_transmission": bool(assumptions.get("include_drive_transmission", True)),
        "electrical_electronics": bool(assumptions.get("include_electrical_electronics", True)),
        "body_chassis": bool(assumptions.get("include_body_chassis", False)),
        "interiors": bool(assumptions.get("include_interiors", False)),
        "cooling_misc": bool(assumptions.get("include_cooling_misc", False)),
    }

    selected_categories = [
        cat for cat in COMPONENT_CATEGORIES if category_flags.get(cat["code"], False)
    ]
    selected_cat_share_pct = sum(float(cat["oem_share_pct"]) for cat in selected_categories)
    # Guard against zero categories selected
    effective_cat_share = selected_cat_share_pct / 100.0

    tier1_factor = float(assumptions["tier1_addressable_factor_pct"]) / 100.0
    export_adder = 1.0 + float(assumptions["export_hub_adder_pct"]) / 100.0

    # Effective SAM ratio applied to total TAM (capped safely at 1.0)
    sam_ratio = min(1.0, oem_share * effective_cat_share * tier1_factor * export_adder)

    pv_g = float(assumptions["pv_cagr_pct"]) / 100.0
    cv_g = float(assumptions["cv_cagr_pct"]) / 100.0
    ev_g = float(assumptions["ev_cagr_pct"]) / 100.0
    other_g = float(assumptions["other_cagr_pct"]) / 100.0

    years = np.arange(1, 6)  # FY27 .. FY31
    fiscal_labels = [f"FY{26 + int(y)}" for y in years]

    pv_proj = pv_base * np.power(1.0 + pv_g, years)
    cv_proj = cv_base * np.power(1.0 + cv_g, years)
    ev_proj = ev_base * np.power(1.0 + ev_g, years)
    other_proj = other_base * np.power(1.0 + other_g, years)

    tam_proj = pv_proj + cv_proj + ev_proj + other_proj

    # EV components have higher Tier-1 precision addressability (+25% premium factor, capped at 100%)
    ev_sam_ratio = min(1.0, sam_ratio * 1.25) if effective_cat_share > 0 else 0.0
    sam_proj = (tam_proj - ev_proj) * sam_ratio + ev_proj * ev_sam_ratio

    som_y1 = float(assumptions["som_year1_share_pct"]) / 100.0
    som_y5 = float(assumptions["som_year5_share_pct"]) / 100.0
    curve = str(assumptions.get("ramp_curve", "s_curve"))
    weights = _ramp_weights(len(years), curve)
    som_share_series = som_y1 + (som_y5 - som_y1) * weights
    som_proj_bn = sam_proj * som_share_series
    som_proj_m = som_proj_bn * 1000.0

    proj_df = pd.DataFrame(
        {
            "fiscal_year": fiscal_labels,
            "pv_usd_bn": np.round(pv_proj, 2),
            "cv_usd_bn": np.round(cv_proj, 2),
            "ev_usd_bn": np.round(ev_proj, 2),
            "other_usd_bn": np.round(other_proj, 2),
            "tam_usd_bn": np.round(tam_proj, 2),
            "sam_usd_bn": np.round(sam_proj, 2),
            "som_share_of_sam_pct": np.round(som_share_series * 100.0, 3),
            "som_usd_m": np.round(som_proj_m, 2),
            "ev_share_of_tam_pct": np.round((ev_proj / tam_proj) * 100.0, 2),
            "provenance": "DERIVED",
        }
    )

    forward_tam_cagr = calculate_cagr(base_tam, float(tam_proj[-1]), 5)
    forward_sam_cagr = calculate_cagr(float(sam_proj[0]), float(sam_proj[-1]), 4)
    forward_som_cagr = calculate_cagr(float(som_proj_m[0]), float(som_proj_m[-1]), 4)

    # Funnel breakdown for FY27 (Year 1) and FY31 (Year 5)
    fy31_tam = float(tam_proj[-1])
    fy31_oem = fy31_tam * oem_share
    fy31_cat = fy31_oem * effective_cat_share
    fy31_sam = float(sam_proj[-1])
    fy31_som_bn = float(som_proj_bn[-1])

    funnel_fy31 = [
        {
            "stage": "Total Addressable Market (TAM)",
            "value_usd_bn": round(fy31_tam, 2),
            "pct_of_tam": 100.0,
            "note": "Total Indian auto components market (FY31 projected from ACMA FY26 $85.9B base)",
            "provenance": "DERIVED",
        },
        {
            "stage": "Domestic OEM Supply Channel",
            "value_usd_bn": round(fy31_oem, 2),
            "pct_of_tam": round(oem_share * 100.0, 1),
            "note": "Excludes unorganized aftermarket; anchored to ACMA OEM channel share (84.5%)",
            "provenance": "SOURCED",
        },
        {
            "stage": "Selected Product Categories",
            "value_usd_bn": round(fy31_cat, 2),
            "pct_of_tam": round(oem_share * effective_cat_share * 100.0, 1),
            "note": f"{len(selected_categories)} active categories totaling {selected_cat_share_pct:.1f}% of OEM supply",
            "provenance": "ASSUMPTION",
        },
        {
            "stage": "Serviceable Available Market (SAM)",
            "value_usd_bn": round(fy31_sam, 2),
            "pct_of_tam": round((fy31_sam / fy31_tam) * 100.0, 1) if fy31_tam > 0 else 0.0,
            "note": f"Tier-1 precision filter ({assumptions['tier1_addressable_factor_pct']:.0f}%) + export hub uplift (+{assumptions['export_hub_adder_pct']:.0f}%)",
            "provenance": "DERIVED",
        },
        {
            "stage": "Serviceable Obtainable Market (SOM — FY31)",
            "value_usd_bn": round(fy31_som_bn, 3),
            "pct_of_tam": round((fy31_som_bn / fy31_tam) * 100.0, 3) if fy31_tam > 0 else 0.0,
            "note": f"Target {assumptions['som_year5_share_pct']:.2f}% share of FY31 SAM (~${som_proj_m[-1]:.1f}M annual revenue)",
            "provenance": "DERIVED",
        },
    ]

    return {
        "assumptions": assumptions,
        "summary": {
            "historical_cagr_fy20_fy26_pct": round(hist_cagr, 2),
            "forward_tam_cagr_fy26_fy31_pct": round(forward_tam_cagr, 2),
            "forward_sam_cagr_fy27_fy31_pct": round(forward_sam_cagr, 2),
            "forward_som_cagr_fy27_fy31_pct": round(forward_som_cagr, 2),
            "fy26_tam_usd_bn": round(base_tam, 2),
            "fy27_tam_usd_bn": round(float(tam_proj[0]), 2),
            "fy31_tam_usd_bn": round(fy31_tam, 2),
            "fy27_sam_usd_bn": round(float(sam_proj[0]), 2),
            "fy31_sam_usd_bn": round(fy31_sam, 2),
            "fy27_som_usd_m": round(float(som_proj_m[0]), 2),
            "fy31_som_usd_m": round(float(som_proj_m[-1]), 2),
            "cumulative_5yr_som_usd_m": round(float(np.sum(som_proj_m)), 2),
            "selected_category_oem_share_pct": round(selected_cat_share_pct, 1),
            "effective_sam_pct_of_tam": round((fy31_sam / fy31_tam) * 100.0, 2) if fy31_tam > 0 else 0.0,
        },
        "historical_series": HISTORICAL_TURNOVER,
        "forecast_series": proj_df.to_dict(orient="records"),
        "funnel_fy31": funnel_fy31,
        "categories": [
            {**cat, "selected": category_flags.get(cat["code"], False)}
            for cat in COMPONENT_CATEGORIES
        ],
    }
