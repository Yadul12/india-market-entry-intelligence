"""Comprehensive unit tests for 5-year financial model, DCF/NPV/IRR/Payback/ROI, and sensitivity engine."""

from copy import deepcopy

import pytest

from app.analytics.financial_model import compute_irr, compute_payback_period, run_financial_model
from app.analytics.sensitivity import run_tornado_sensitivity, run_two_way_sensitivity
from app.data.baseline_models import (
    BASE_FINANCIAL_ASSUMPTIONS,
    CONSERVATIVE_FINANCIAL_ASSUMPTIONS,
    OPTIMISTIC_FINANCIAL_ASSUMPTIONS,
)


def test_irr_known_cash_flows():
    # -100 initial, +110 Year 1 -> exact 10% IRR
    irr = compute_irr([-100.0, 110.0])
    assert irr is not None
    assert abs(irr - 10.0) < 0.05

    # -100 initial, +40 for 4 years -> IRR ~21.86%
    irr_multi = compute_irr([-100.0, 40.0, 40.0, 40.0, 40.0])
    assert irr_multi is not None
    assert 21.5 < irr_multi < 22.2

    # All negative flows -> None (undefined)
    assert compute_irr([-50.0, -10.0, -5.0]) is None


def test_payback_period_exact_interpolation():
    # -100, +40, +40, +40 -> cumulative: -100, -60, -20, +20 -> payback = 2 + 20/40 = 2.50 years
    pb = compute_payback_period([-100.0, 40.0, 40.0, 40.0])
    assert pb == 2.5

    # Never pays back -> None
    assert compute_payback_period([-100.0, 10.0, 10.0]) is None


def test_base_financial_model_accounting_identities():
    result = run_financial_model(BASE_FINANCIAL_ASSUMPTIONS)
    pnl = result["income_statement"]
    cf = result["cash_flow_statement"]
    summary = result["summary"]

    assert len(pnl) == 5
    assert len(cf) == 5

    for p_row, c_row in zip(pnl, cf):
        # Revenue = Domestic + Export
        assert abs(p_row["revenue_usd_m"] - (p_row["domestic_revenue_usd_m"] + p_row["export_revenue_usd_m"])) <= 0.05
        # Gross Profit = Revenue - Total COGS
        assert abs(p_row["gross_profit_usd_m"] - (p_row["revenue_usd_m"] - p_row["total_cogs_usd_m"])) <= 0.05
        # EBIT = EBITDA - Depreciation
        assert abs(p_row["ebit_usd_m"] - (p_row["ebitda_usd_m"] - p_row["depreciation_usd_m"])) <= 0.05
        # Net Income = EBIT - Tax
        assert abs(p_row["net_income_usd_m"] - (p_row["ebit_usd_m"] - p_row["tax_usd_m"])) <= 0.05
        # FCFF = NOPAT + Depreciation - Delta NWC - CAPEX
        expected_fcff = (
            c_row["nopat_usd_m"]
            + c_row["depreciation_usd_m"]
            - c_row["change_nwc_usd_m"]
            - c_row["capex_usd_m"]
        )
        assert abs(c_row["fcff_usd_m"] - expected_fcff) <= 0.06
        # NWC = AR + Inventory - AP
        expected_nwc = c_row["ar_usd_m"] + c_row["inventory_usd_m"] - c_row["ap_usd_m"]
        assert abs(c_row["nwc_usd_m"] - expected_nwc) <= 0.06

    # Cumulative 5-year revenue matches sum of annual revenue
    assert abs(summary["cumulative_5yr_revenue_usd_m"] - sum(r["revenue_usd_m"] for r in pnl)) <= 0.1
    # Full NPV = Explicit 5-Yr NPV + PV of Terminal Value
    assert abs(summary["npv_usd_m"] - (summary["npv_5yr_explicit_usd_m"] + summary["pv_terminal_value_usd_m"])) <= 0.1
    # Base case should generate positive NPV and defined IRR > WACC
    assert summary["npv_usd_m"] > 0
    assert summary["irr_pct"] is not None
    assert summary["irr_pct"] > summary["wacc_pct"]


def test_scenario_monotonicity():
    cons = run_financial_model(CONSERVATIVE_FINANCIAL_ASSUMPTIONS)["summary"]
    base = run_financial_model(BASE_FINANCIAL_ASSUMPTIONS)["summary"]
    opt = run_financial_model(OPTIMISTIC_FINANCIAL_ASSUMPTIONS)["summary"]

    assert cons["cumulative_5yr_revenue_usd_m"] < base["cumulative_5yr_revenue_usd_m"] < opt["cumulative_5yr_revenue_usd_m"]
    assert cons["npv_usd_m"] < base["npv_usd_m"] < opt["npv_usd_m"]
    assert cons["year5_ebitda_margin_pct"] < base["year5_ebitda_margin_pct"] < opt["year5_ebitda_margin_pct"]


def test_tax_loss_carryforward_prevents_negative_tax():
    distressed = deepcopy(BASE_FINANCIAL_ASSUMPTIONS)
    distressed["year1_revenue_usd_m"] = 8.0
    distressed["cogs_pct_year1"] = 82.0
    res = run_financial_model(distressed)
    for row in res["income_statement"]:
        assert row["tax_usd_m"] >= 0.0


def test_pli_incentive_improves_ebitda_and_npv():
    no_pli = deepcopy(BASE_FINANCIAL_ASSUMPTIONS)
    no_pli["pli_incentive_enabled"] = False
    no_pli["pli_incentive_pct"] = 0.0

    with_pli = deepcopy(BASE_FINANCIAL_ASSUMPTIONS)
    with_pli["pli_incentive_enabled"] = True
    with_pli["pli_incentive_pct"] = 6.0

    r_no = run_financial_model(no_pli)
    r_yes = run_financial_model(with_pli)

    # Year 1 has no PLI (pre-DVA certification); Years 2-5 have strictly higher EBITDA
    assert r_yes["income_statement"][0]["pli_credit_usd_m"] == 0.0
    assert r_yes["income_statement"][1]["pli_credit_usd_m"] > 0.0
    assert r_yes["summary"]["npv_usd_m"] > r_no["summary"]["npv_usd_m"]


def test_sensitivity_tornado_and_two_way():
    tornado = run_tornado_sensitivity(BASE_FINANCIAL_ASSUMPTIONS)
    assert len(tornado["drivers"]) == 6
    # Sorted descending by spread
    spreads = [d["spread_usd_m"] for d in tornado["drivers"]]
    assert spreads == sorted(spreads, reverse=True)
    for d in tornado["drivers"]:
        assert d["upside_npv_usd_m"] >= d["downside_npv_usd_m"]

    grid = run_two_way_sensitivity(BASE_FINANCIAL_ASSUMPTIONS)
    assert len(grid["matrix"]) == 5
    assert all(len(row["cells"]) == 5 for row in grid["matrix"])
    # Higher WACC (bottom row) must produce strictly lower NPV than lower WACC (top row) at same COGS
    assert grid["matrix"][0]["cells"][2]["npv_usd_m"] > grid["matrix"][4]["cells"][2]["npv_usd_m"]
    # Higher COGS (right col) must produce strictly lower NPV than lower COGS (left col) at same WACC
    assert grid["matrix"][2]["cells"][0]["npv_usd_m"] > grid["matrix"][2]["cells"][4]["npv_usd_m"]
