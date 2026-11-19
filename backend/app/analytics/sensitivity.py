"""
Sensitivity Analysis Engine (One-Way Tornado + 2D WACC vs COGS Heatmap).
All sensitivity evaluations execute the exact production Pandas/NumPy financial engine.
"""

from copy import deepcopy
from typing import Any

from app.analytics.financial_model import run_financial_model


def run_tornado_sensitivity(base_assumptions: dict[str, Any]) -> dict[str, Any]:
    """Compute one-way NPV sensitivity across 6 material value drivers."""
    base_res = run_financial_model(base_assumptions)
    base_npv = float(base_res["summary"]["npv_usd_m"])

    drivers: list[dict[str, Any]] = []

    def _eval(mutator_low, mutator_high, label: str, param_range: str) -> dict[str, Any]:
        low_a = deepcopy(base_assumptions)
        high_a = deepcopy(base_assumptions)
        mutator_low(low_a)
        mutator_high(high_a)
        low_npv = float(run_financial_model(low_a)["summary"]["npv_usd_m"])
        high_npv = float(run_financial_model(high_a)["summary"]["npv_usd_m"])
        return {
            "driver": label,
            "shock_range": param_range,
            "downside_npv_usd_m": round(min(low_npv, high_npv), 2),
            "upside_npv_usd_m": round(max(low_npv, high_npv), 2),
            "downside_delta_usd_m": round(min(low_npv, high_npv) - base_npv, 2),
            "upside_delta_usd_m": round(max(low_npv, high_npv) - base_npv, 2),
            "spread_usd_m": round(abs(high_npv - low_npv), 2),
        }

    # 1. Revenue Volume / Year-1 Ramp (+/- 20%)
    drivers.append(
        _eval(
            lambda a: a.update({"year1_revenue_usd_m": a["year1_revenue_usd_m"] * 0.80}),
            lambda a: a.update({"year1_revenue_usd_m": a["year1_revenue_usd_m"] * 1.20}),
            "Revenue Scale & Ramp Volume",
            "-20% / +20% Revenue Base",
        )
    )

    # 2. COGS / Localization Efficiency (+250 bps / -250 bps)
    drivers.append(
        _eval(
            lambda a: a.update({"cogs_pct_year1": a["cogs_pct_year1"] + 2.5}),
            lambda a: a.update({"cogs_pct_year1": max(52.0, a["cogs_pct_year1"] - 2.5)}),
            "Material COGS & Localization",
            "+250 bps / -250 bps COGS",
        )
    )

    # 3. Discount Rate / WACC (+200 bps / -200 bps)
    drivers.append(
        _eval(
            lambda a: a.update({"wacc_pct": a["wacc_pct"] + 2.0}),
            lambda a: a.update({"wacc_pct": max(6.5, a["wacc_pct"] - 2.0)}),
            "WACC / India Risk Premium",
            "+200 bps / -200 bps WACC",
        )
    )

    # 4. Initial CAPEX Outlay (+25% / -25%)
    drivers.append(
        _eval(
            lambda a: a.update({"initial_capex_usd_m": a["initial_capex_usd_m"] * 1.25}),
            lambda a: a.update({"initial_capex_usd_m": a["initial_capex_usd_m"] * 0.75}),
            "Initial CAPEX Outlay",
            "+25% / -25% Initial CAPEX",
        )
    )

    # 5. Operating Leverage (SG&A + Direct Labor +/- 150 bps)
    drivers.append(
        _eval(
            lambda a: a.update({"direct_labor_overhead_pct": a["direct_labor_overhead_pct"] + 1.5}),
            lambda a: a.update({"direct_labor_overhead_pct": max(2.0, a["direct_labor_overhead_pct"] - 1.5)}),
            "Plant Overhead & Labor Efficiency",
            "+150 bps / -150 bps Overhead",
        )
    )

    # 6. Working Capital Cycle (DSO + DIO +/- 15 days)
    drivers.append(
        _eval(
            lambda a: a.update({"dso_days": a["dso_days"] + 15, "dio_days": a["dio_days"] + 15}),
            lambda a: a.update({"dso_days": max(20, a["dso_days"] - 15), "dio_days": max(15, a["dio_days"] - 15)}),
            "Working Capital Cycle (DSO & DIO)",
            "+15 Days / -15 Days Cycle",
        )
    )

    drivers.sort(key=lambda d: d["spread_usd_m"], reverse=True)
    return {
        "base_npv_usd_m": round(base_npv, 2),
        "drivers": drivers,
    }


def run_two_way_sensitivity(base_assumptions: dict[str, Any]) -> dict[str, Any]:
    """Compute 5x5 NPV matrix across WACC (rows) and Year-1 COGS % (columns)."""
    base_wacc = float(base_assumptions["wacc_pct"])
    base_cogs = float(base_assumptions["cogs_pct_year1"])

    wacc_axis = [round(base_wacc + delta, 2) for delta in (-2.0, -1.0, 0.0, 1.0, 2.0)]
    cogs_axis = [round(base_cogs + delta, 2) for delta in (-3.0, -1.5, 0.0, 1.5, 3.0)]

    rows: list[dict[str, Any]] = []
    for w in wacc_axis:
        cells: list[dict[str, Any]] = []
        for c in cogs_axis:
            sim = deepcopy(base_assumptions)
            sim["wacc_pct"] = max(5.5, w)
            sim["cogs_pct_year1"] = max(52.0, c)
            res = run_financial_model(sim)
            cells.append(
                {
                    "wacc_pct": w,
                    "cogs_pct": c,
                    "npv_usd_m": res["summary"]["npv_usd_m"],
                    "irr_pct": res["summary"]["irr_pct"],
                }
            )
        rows.append({"wacc_pct": w, "cells": cells})

    return {
        "row_label": "WACC (%)",
        "col_label": "Year-1 Material COGS (% of Revenue)",
        "wacc_values": wacc_axis,
        "cogs_values": cogs_axis,
        "base_wacc_pct": base_wacc,
        "base_cogs_pct": base_cogs,
        "matrix": rows,
    }
