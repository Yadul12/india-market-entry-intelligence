"""
Five-Year Institutional Financial & Valuation Model (Pandas + NumPy).
Computes P&L, Working Capital, Free Cash Flow to Firm (FCFF), DCF NPV (with & without terminal value),
IRR, Simple & Discounted Payback Period, ROI, ROCE, and Operating Break-Even.
"""

from typing import Any

import numpy as np
import pandas as pd


def compute_irr(cash_flows: list[float] | np.ndarray) -> float | None:
    """
    Compute Internal Rate of Return (as percentage, e.g. 18.4) using robust bisection + Newton refinement.
    Returns None if cash flows have no sign change (IRR mathematically undefined).
    """
    cf = np.asarray(cash_flows, dtype=float)
    if cf.size < 2:
        return None
    if not (np.any(cf < 0) and np.any(cf > 0)):
        return None

    t = np.arange(cf.size, dtype=float)

    def npv_at(rate: float) -> float:
        return float(np.sum(cf / np.power(1.0 + rate, t)))

    # Bracket root on [-0.95, 5.0]
    low, high = -0.95, 5.0
    f_low, f_high = npv_at(low), npv_at(high)

    # Scan intermediate grid if standard bounds have same sign
    if f_low * f_high > 0:
        grid = np.concatenate([np.linspace(-0.90, 0.50, 71), np.linspace(0.55, 5.0, 90)])
        vals = [npv_at(float(r)) for r in grid]
        found = False
        for i in range(len(grid) - 1):
            if vals[i] == 0.0:
                return round(float(grid[i]) * 100.0, 2)
            if vals[i] * vals[i + 1] < 0:
                low, high = float(grid[i]), float(grid[i + 1])
                f_low, f_high = vals[i], vals[i + 1]
                found = True
                break
        if not found:
            return None

    for _ in range(100):
        mid = 0.5 * (low + high)
        f_mid = npv_at(mid)
        if abs(f_mid) < 1e-9 or abs(high - low) < 1e-9:
            return round(mid * 100.0, 2)
        if f_low * f_mid <= 0:
            high, f_high = mid, f_mid
        else:
            low, f_low = mid, f_mid

    return round(0.5 * (low + high) * 100.0, 2)


def compute_payback_period(cash_flows: list[float] | np.ndarray) -> float | None:
    """
    Compute fractional payback period in years from cash flows [CF_0, CF_1, ..., CF_n].
    Returns None if cumulative cash flow never reaches >= 0 within the forecast horizon.
    """
    cf = np.asarray(cash_flows, dtype=float)
    if cf.size < 2:
        return None
    cum = np.cumsum(cf)
    if cum[0] >= 0:
        return 0.0
    for idx in range(1, len(cum)):
        if cum[idx] >= 0:
            prev_cum = cum[idx - 1]
            year_cf = cf[idx]
            if year_cf <= 0:
                return float(idx)
            fraction = -prev_cum / year_cf
            return round((idx - 1) + fraction, 2)
    return None


def run_financial_model(assumptions: dict[str, Any]) -> dict[str, Any]:
    """
    Execute 5-year P&L, Working Capital, Cash Flow, and Valuation model.
    All monetary outputs are in USD Millions.
    """
    horizon = int(assumptions.get("horizon_years", 5))
    start_fy = int(assumptions.get("start_fiscal_year", 2027))
    y1_rev = float(assumptions["year1_revenue_usd_m"])
    growth_rates = [float(g) for g in assumptions["revenue_growth_rates_pct"]]
    if len(growth_rates) < horizon - 1:
        growth_rates = growth_rates + [growth_rates[-1]] * (horizon - 1 - len(growth_rates))

    export_share = float(assumptions["export_revenue_share_pct"]) / 100.0
    cogs_y1_pct = float(assumptions["cogs_pct_year1"]) / 100.0
    cogs_stepdown = float(assumptions["cogs_localization_stepdown_bps"]) / 10000.0
    labor_oh_pct = float(assumptions["direct_labor_overhead_pct"]) / 100.0
    sga_pct = float(assumptions["sga_pct"]) / 100.0
    rd_pct = float(assumptions["rd_engineering_pct"]) / 100.0
    royalty_pct = float(assumptions["royalty_tech_fee_pct"]) / 100.0
    pli_enabled = bool(assumptions.get("pli_incentive_enabled", False))
    pli_pct = (float(assumptions.get("pli_incentive_pct", 0.0)) / 100.0) if pli_enabled else 0.0

    initial_capex = float(assumptions["initial_capex_usd_m"])
    maint_capex_pct = float(assumptions["maintenance_capex_pct_rev"]) / 100.0
    expansion_capex_y3 = float(assumptions.get("expansion_capex_y3_usd_m", 0.0))
    dep_years = max(3.0, float(assumptions["depreciation_years"]))

    dso = float(assumptions["dso_days"])
    dio = float(assumptions["dio_days"])
    dpo = float(assumptions["dpo_days"])

    tax_rate = float(assumptions["corporate_tax_rate_pct"]) / 100.0
    wacc = float(assumptions["wacc_pct"]) / 100.0
    terminal_g = float(assumptions["terminal_growth_pct"]) / 100.0
    if terminal_g >= wacc - 0.005:
        terminal_g = max(0.0, wacc - 0.01)

    # 1. Revenue vector
    revenues = np.zeros(horizon, dtype=float)
    revenues[0] = y1_rev
    for i in range(1, horizon):
        revenues[i] = revenues[i - 1] * (1.0 + growth_rates[i - 1] / 100.0)

    domestic_rev = revenues * (1.0 - export_share)
    export_rev = revenues * export_share

    # 2. Cost of Goods Sold (Material localization improves annually; floor at 52% to preserve realism)
    year_idx = np.arange(horizon, dtype=float)
    material_cogs_pct = np.maximum(0.52, cogs_y1_pct - year_idx * cogs_stepdown)
    material_cogs = revenues * material_cogs_pct
    direct_labor_oh = revenues * labor_oh_pct
    total_cogs = material_cogs + direct_labor_oh
    gross_profit = revenues - total_cogs
    gross_margin_pct = np.where(revenues > 0, (gross_profit / revenues) * 100.0, 0.0)

    # 3. Operating Expenses & PLI Credit
    # Model modest fixed-cost base in SG&A/R&D so operating leverage and break-even are realistic
    fixed_sga_floor = 1.6  # USD M minimum corporate/JV overhead
    fixed_rd_floor = 0.7   # USD M minimum local application engineering
    sga = np.maximum(fixed_sga_floor, revenues * sga_pct)
    rd = np.maximum(fixed_rd_floor, revenues * rd_pct)
    royalty = revenues * royalty_pct
    pli_credit = np.zeros(horizon, dtype=float)
    if pli_enabled and pli_pct > 0:
        # Eligible from Year 2 onwards once >=50% DVA threshold is certified
        pli_credit[1:] = revenues[1:] * pli_pct

    total_opex = sga + rd + royalty - pli_credit
    ebitda = gross_profit - total_opex
    ebitda_margin_pct = np.where(revenues > 0, (ebitda / revenues) * 100.0, 0.0)

    # 4. CAPEX & Straight-Line Depreciation Schedule
    annual_capex = revenues * maint_capex_pct
    if horizon >= 3:
        annual_capex[2] += expansion_capex_y3

    gross_ppe = np.zeros(horizon, dtype=float)
    depreciation = np.zeros(horizon, dtype=float)
    net_ppe = np.zeros(horizon, dtype=float)
    accum_dep = 0.0
    curr_gross = initial_capex
    for i in range(horizon):
        curr_gross += annual_capex[i]
        gross_ppe[i] = curr_gross
        # Half-year convention on in-year additions
        dep_base = (curr_gross - annual_capex[i]) + 0.5 * annual_capex[i]
        dep = dep_base / dep_years
        depreciation[i] = dep
        accum_dep += dep
        net_ppe[i] = max(0.0, curr_gross - accum_dep)

    ebit = ebitda - depreciation
    ebit_margin_pct = np.where(revenues > 0, (ebit / revenues) * 100.0, 0.0)

    # 5. Corporate Tax with Loss Carryforward (Sec 115BAA)
    tax_expense = np.zeros(horizon, dtype=float)
    nopat = np.zeros(horizon, dtype=float)
    loss_carryforward = 0.0
    for i in range(horizon):
        if ebit[i] <= 0:
            loss_carryforward += -ebit[i]
            tax_expense[i] = 0.0
        else:
            taxable_income = max(0.0, ebit[i] - loss_carryforward)
            loss_carryforward = max(0.0, loss_carryforward - ebit[i])
            tax_expense[i] = taxable_income * tax_rate
        nopat[i] = ebit[i] - tax_expense[i]

    net_margin_pct = np.where(revenues > 0, (nopat / revenues) * 100.0, 0.0)

    # 6. Working Capital Schedule
    ar = revenues * (dso / 365.0)
    inventory = total_cogs * (dio / 365.0)
    ap = total_cogs * (dpo / 365.0)
    nwc = ar + inventory - ap
    change_nwc = np.zeros(horizon, dtype=float)
    change_nwc[0] = nwc[0]
    for i in range(1, horizon):
        change_nwc[i] = nwc[i] - nwc[i - 1]

    # 7. Free Cash Flow to Firm (FCFF)
    fcff = nopat + depreciation - change_nwc - annual_capex
    cash_flows_no_tv = np.concatenate([np.array([-initial_capex]), fcff])
    cum_cash_flow = np.cumsum(cash_flows_no_tv)[1:]  # Years 1..5 cumulative

    # Discount Factors & Present Values
    t_years = np.arange(1, horizon + 1, dtype=float)
    discount_factors = 1.0 / np.power(1.0 + wacc, t_years)
    pv_fcff = fcff * discount_factors

    # Terminal Value (Gordon Growth Model on Year 5 steady-state FCF, normalizing out one-time growth NWC spike)
    steady_state_fcff_y5 = max(0.0, nopat[-1] + depreciation[-1] - revenues[-1] * maint_capex_pct - (nwc[-1] * terminal_g))
    terminal_value = (
        steady_state_fcff_y5 * (1.0 + terminal_g) / (wacc - terminal_g)
        if steady_state_fcff_y5 > 0 and wacc > terminal_g
        else 0.0
    )
    pv_terminal_value = terminal_value * discount_factors[-1]

    npv_explicit_5yr = float(-initial_capex + np.sum(pv_fcff))
    npv_with_tv = float(npv_explicit_5yr + pv_terminal_value)

    # Discounted cash flows for discounted payback (with explicit cash flows)
    disc_cf_series = np.concatenate([np.array([-initial_capex]), pv_fcff])

    # IRR (Total Project including Terminal Value at Year 5) & 5-Year Explicit IRR
    cf_with_tv = cash_flows_no_tv.copy()
    cf_with_tv[-1] += terminal_value
    irr_with_tv = compute_irr(cf_with_tv)
    irr_5yr_explicit = compute_irr(cash_flows_no_tv)

    # Payback periods
    simple_payback = compute_payback_period(cash_flows_no_tv)
    discounted_payback = compute_payback_period(disc_cf_series)

    # Total Capital Invested & Returns
    initial_nwc = float(nwc[0])
    total_initial_investment = initial_capex + initial_nwc
    total_capex_5yr = initial_capex + float(np.sum(annual_capex))
    cumulative_5yr_revenue = float(np.sum(revenues))
    cumulative_5yr_ebitda = float(np.sum(ebitda))
    cumulative_5yr_pat = float(np.sum(nopat))
    cumulative_5yr_fcff = float(np.sum(fcff))

    # 5-Year ROI % = (Cumulative 5-Yr Net Profit / Total Capital Invested incl. Expansion CAPEX & Initial NWC) * 100
    total_capital_deployed = initial_capex + expansion_capex_y3 + initial_nwc
    roi_5yr_pct = (cumulative_5yr_pat / total_capital_deployed * 100.0) if total_capital_deployed > 0 else 0.0

    # Capital Employed & ROCE
    capital_employed = net_ppe + np.maximum(0.0, nwc)
    roce_pct = np.where(capital_employed > 0, (ebit / capital_employed) * 100.0, 0.0)

    # Operating Break-Even (Year 2 normalized structure or average steady state)
    # Fixed Costs = Fixed SG&A + Fixed R&D + Year-1 Depreciation; Variable Contribution Margin = 1 - (COGS + Labor + Royalty + Var OpEx)
    avg_contrib_margin_ratio = max(
        0.05,
        1.0 - (float(np.mean(material_cogs_pct)) + labor_oh_pct + royalty_pct + sga_pct * 0.5 + rd_pct * 0.4),
    )
    annual_fixed_cost_base = (fixed_sga_floor + fixed_rd_floor + float(depreciation[0]) + (revenues[1] * (sga_pct * 0.5 + rd_pct * 0.6)))
    breakeven_revenue_usd_m = annual_fixed_cost_base / avg_contrib_margin_ratio

    # First year with positive EBITDA and positive EBIT
    ebitda_positive_year = next((f"FY{start_fy + i}" for i in range(horizon) if ebitda[i] > 0), "Post-FY31")
    ebit_positive_year = next((f"FY{start_fy + i}" for i in range(horizon) if ebit[i] > 0), "Post-FY31")

    # Peak cumulative cash outflow (funding envelope)
    cum_all = np.cumsum(cash_flows_no_tv)
    peak_funding_usd_m = float(abs(np.min(cum_all)))

    # Assemble structured Pandas DataFrames -> clean JSON records
    fiscal_labels = [f"FY{start_fy + i}" for i in range(horizon)]
    yoy_growth_out = [None] + [
        round(((revenues[i] / revenues[i - 1]) - 1.0) * 100.0, 1) if revenues[i - 1] > 0 else 0.0
        for i in range(1, horizon)
    ]

    pnl_df = pd.DataFrame(
        {
            "fiscal_year": fiscal_labels,
            "revenue_usd_m": np.round(revenues, 2),
            "domestic_revenue_usd_m": np.round(domestic_rev, 2),
            "export_revenue_usd_m": np.round(export_rev, 2),
            "yoy_growth_pct": yoy_growth_out,
            "material_cogs_usd_m": np.round(material_cogs, 2),
            "material_cogs_pct": np.round(material_cogs_pct * 100.0, 2),
            "direct_labor_oh_usd_m": np.round(direct_labor_oh, 2),
            "total_cogs_usd_m": np.round(total_cogs, 2),
            "gross_profit_usd_m": np.round(gross_profit, 2),
            "gross_margin_pct": np.round(gross_margin_pct, 2),
            "sga_usd_m": np.round(sga, 2),
            "rd_usd_m": np.round(rd, 2),
            "royalty_usd_m": np.round(royalty, 2),
            "pli_credit_usd_m": np.round(pli_credit, 2),
            "ebitda_usd_m": np.round(ebitda, 2),
            "ebitda_margin_pct": np.round(ebitda_margin_pct, 2),
            "depreciation_usd_m": np.round(depreciation, 2),
            "ebit_usd_m": np.round(ebit, 2),
            "ebit_margin_pct": np.round(ebit_margin_pct, 2),
            "tax_usd_m": np.round(tax_expense, 2),
            "net_income_usd_m": np.round(nopat, 2),
            "net_margin_pct": np.round(net_margin_pct, 2),
        }
    )

    cashflow_df = pd.DataFrame(
        {
            "fiscal_year": fiscal_labels,
            "nopat_usd_m": np.round(nopat, 2),
            "depreciation_usd_m": np.round(depreciation, 2),
            "change_nwc_usd_m": np.round(change_nwc, 2),
            "capex_usd_m": np.round(annual_capex, 2),
            "fcff_usd_m": np.round(fcff, 2),
            "cumulative_fcf_usd_m": np.round(cum_cash_flow, 2),
            "discount_factor": np.round(discount_factors, 4),
            "pv_fcff_usd_m": np.round(pv_fcff, 2),
            "ar_usd_m": np.round(ar, 2),
            "inventory_usd_m": np.round(inventory, 2),
            "ap_usd_m": np.round(ap, 2),
            "nwc_usd_m": np.round(nwc, 2),
            "nwc_pct_rev": np.round(np.where(revenues > 0, (nwc / revenues) * 100.0, 0.0), 2),
            "roce_pct": np.round(roce_pct, 2),
        }
    )

    return {
        "assumptions": assumptions,
        "summary": {
            "cumulative_5yr_revenue_usd_m": round(cumulative_5yr_revenue, 2),
            "year5_revenue_usd_m": round(float(revenues[-1]), 2),
            "revenue_cagr_5yr_pct": round(((revenues[-1] / revenues[0]) ** (1.0 / (horizon - 1)) - 1.0) * 100.0, 2),
            "cumulative_5yr_ebitda_usd_m": round(cumulative_5yr_ebitda, 2),
            "year5_ebitda_usd_m": round(float(ebitda[-1]), 2),
            "year5_ebitda_margin_pct": round(float(ebitda_margin_pct[-1]), 2),
            "avg_ebitda_margin_pct": round((cumulative_5yr_ebitda / cumulative_5yr_revenue) * 100.0, 2)
            if cumulative_5yr_revenue > 0
            else 0.0,
            "cumulative_5yr_pat_usd_m": round(cumulative_5yr_pat, 2),
            "cumulative_5yr_fcff_usd_m": round(cumulative_5yr_fcff, 2),
            "initial_capex_usd_m": round(initial_capex, 2),
            "initial_nwc_usd_m": round(initial_nwc, 2),
            "total_initial_investment_usd_m": round(total_initial_investment, 2),
            "total_5yr_capex_usd_m": round(total_capex_5yr, 2),
            "peak_funding_requirement_usd_m": round(peak_funding_usd_m, 2),
            "npv_usd_m": round(npv_with_tv, 2),
            "npv_5yr_explicit_usd_m": round(npv_explicit_5yr, 2),
            "terminal_value_usd_m": round(terminal_value, 2),
            "pv_terminal_value_usd_m": round(pv_terminal_value, 2),
            "irr_pct": irr_with_tv,
            "irr_5yr_explicit_pct": irr_5yr_explicit,
            "roi_5yr_pct": round(roi_5yr_pct, 2),
            "year5_roce_pct": round(float(roce_pct[-1]), 2),
            "simple_payback_years": simple_payback,
            "discounted_payback_years": discounted_payback,
            "breakeven_revenue_usd_m": round(breakeven_revenue_usd_m, 2),
            "ebitda_positive_year": ebitda_positive_year,
            "ebit_positive_year": ebit_positive_year,
            "wacc_pct": round(wacc * 100.0, 2),
            "hurdle_spread_pct": round((irr_with_tv - wacc * 100.0), 2) if irr_with_tv is not None else None,
        },
        "income_statement": pnl_df.replace({np.nan: None}).to_dict(orient="records"),
        "cash_flow_statement": cashflow_df.replace({np.nan: None}).to_dict(orient="records"),
        "year0_outflow_usd_m": round(-initial_capex, 2),
    }
