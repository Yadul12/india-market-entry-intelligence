"""Unit tests for TAM/SAM/SOM Market Sizing Engine."""

from copy import deepcopy

from app.analytics.market_sizing import calculate_cagr, compute_market_sizing
from app.data.baseline_models import DEFAULT_MARKET_SIZING_ASSUMPTIONS


def test_cagr_formula():
    # 100 -> 161.051 over 5 years = exact 10.0%
    assert abs(calculate_cagr(100.0, 161.051, 5) - 10.0) < 0.01
    assert calculate_cagr(0.0, 100.0, 5) == 0.0


def test_market_sizing_hierarchy_and_growth():
    res = compute_market_sizing(DEFAULT_MARKET_SIZING_ASSUMPTIONS)
    summary = res["summary"]
    forecast = res["forecast_series"]

    assert len(forecast) == 5
    assert summary["fy26_tam_usd_bn"] == 85.9
    assert summary["historical_cagr_fy20_fy26_pct"] > 9.0

    for row in forecast:
        # Strict hierarchy: TAM > SAM > SOM (converted to Bn)
        assert row["tam_usd_bn"] > row["sam_usd_bn"] > (row["som_usd_m"] / 1000.0) > 0
        # Segment sum equals TAM
        seg_sum = row["pv_usd_bn"] + row["cv_usd_bn"] + row["ev_usd_bn"] + row["other_usd_bn"]
        assert abs(seg_sum - row["tam_usd_bn"]) <= 0.08


def test_market_sizing_category_toggle_changes_sam():
    narrow = deepcopy(DEFAULT_MARKET_SIZING_ASSUMPTIONS)
    narrow["include_drive_transmission"] = False

    broad = deepcopy(DEFAULT_MARKET_SIZING_ASSUMPTIONS)
    broad["include_engine"] = True

    r_narrow = compute_market_sizing(narrow)
    r_base = compute_market_sizing(DEFAULT_MARKET_SIZING_ASSUMPTIONS)
    r_broad = compute_market_sizing(broad)

    assert r_narrow["summary"]["fy31_sam_usd_bn"] < r_base["summary"]["fy31_sam_usd_bn"] < r_broad["summary"]["fy31_sam_usd_bn"]
