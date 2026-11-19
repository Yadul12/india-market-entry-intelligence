"""
Weighted Multi-Criteria Decision Analysis (MCDA) Engine & Executive Recommendation Synthesizer.
"""

from typing import Any

from app.data.baseline_models import IMPLEMENTATION_ROADMAP
from app.data.market_research import AUTOMOTIVE_CLUSTERS

CRITERIA_METADATA: dict[str, dict[str, str]] = {
    "investment_efficiency": {
        "label": "Capital Investment Efficiency",
        "description": "Upfront capital discipline, CAPEX sharing, and balance-sheet exposure.",
    },
    "risk_mitigation": {
        "label": "Risk Profile & Downside Protection",
        "description": "Insulation from regulatory, permitting, OEM qualification, and execution delays.",
    },
    "ip_control": {
        "label": "IP Protection & Operational Control",
        "description": "Governance over proprietary EV thermal/electronics IP, TPS quality, and export pricing.",
    },
    "time_to_market": {
        "label": "Time to Market & OEM Qualification",
        "description": "Speed to secure Indian OEM vendor codes, IATF 16949 certification, and SOP.",
    },
    "scalability": {
        "label": "Long-Term Scalability & Export Hub",
        "description": "Ability to scale across multi-OEM platforms (PV/CV/EV) and global export mandates.",
    },
}


def evaluate_entry_strategies(
    weights: dict[str, float],
    strategies: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Compute normalized weighted scores and rankings across all 4 market entry modes."""
    criteria_keys = list(CRITERIA_METADATA.keys())
    raw_weights = {k: max(0.0, float(weights.get(k, 0.0))) for k in criteria_keys}
    total_w = sum(raw_weights.values())
    if total_w <= 0:
        norm_weights = {k: 100.0 / len(criteria_keys) for k in criteria_keys}
    else:
        norm_weights = {k: (raw_weights[k] / total_w) * 100.0 for k in criteria_keys}

    ranked: list[dict[str, Any]] = []
    for strat_key, strat in strategies.items():
        scores = strat["scores"]
        contributions: dict[str, float] = {}
        weighted_total = 0.0
        for ck in criteria_keys:
            raw_score = max(1.0, min(10.0, float(scores.get(ck, 5.0))))
            contrib = raw_score * (norm_weights[ck] / 100.0)
            contributions[ck] = round(contrib, 2)
            weighted_total += contrib

        ranked.append(
            {
                "strategy_key": strat_key,
                "name": strat["name"],
                "typical_capex_usd_m": strat["typical_capex_usd_m"],
                "time_to_sop_months": strat["time_to_sop_months"],
                "ownership_structure": strat["ownership_structure"],
                "scores": {ck: round(float(scores.get(ck, 5.0)), 1) for ck in criteria_keys},
                "weighted_contributions": contributions,
                "weighted_score": round(weighted_total, 2),
                "pros": strat["pros"],
                "cons": strat["cons"],
            }
        )

    ranked.sort(key=lambda r: r["weighted_score"], reverse=True)
    for idx, item in enumerate(ranked):
        item["rank"] = idx + 1

    margin_over_runner_up = (
        round(ranked[0]["weighted_score"] - ranked[1]["weighted_score"], 2)
        if len(ranked) >= 2
        else 0.0
    )

    return {
        "criteria": [
            {
                "key": ck,
                "label": CRITERIA_METADATA[ck]["label"],
                "description": CRITERIA_METADATA[ck]["description"],
                "input_weight": round(raw_weights[ck], 1),
                "normalized_weight_pct": round(norm_weights[ck], 1),
            }
            for ck in criteria_keys
        ],
        "ranked_strategies": ranked,
        "recommended_strategy": ranked[0] if ranked else None,
        "score_lead_over_second": margin_over_runner_up,
    }


def synthesize_executive_recommendation(
    market_sizing: dict[str, Any],
    base_financials: dict[str, Any],
    conservative_financials: dict[str, Any],
    optimistic_financials: dict[str, Any],
    strategy_eval: dict[str, Any],
    risk_summary: dict[str, Any],
) -> dict[str, Any]:
    """
    Dynamically synthesize a consulting-grade Go / Conditional Go / Defer verdict
    from live model calculations (zero hardcoded financial results).
    """
    base_s = base_financials["summary"]
    cons_s = conservative_financials["summary"]
    opt_s = optimistic_financials["summary"]
    top_strategy = strategy_eval["recommended_strategy"]

    base_npv = float(base_s["npv_usd_m"])
    base_irr = base_s["irr_pct"]
    wacc = float(base_s["wacc_pct"])
    cons_npv = float(cons_s["npv_usd_m"])

    def _fmt_usd(val: float) -> str:
        return f"-${abs(val):.1f}M" if val < 0 else f"${val:.1f}M"

    # Deterministic, transparent decision thresholds
    if base_npv > 25.0 and (base_irr is not None and base_irr >= wacc + 3.5) and cons_npv >= -5.0:
        verdict = "GO — PHASED ENTRY RECOMMENDED"
        verdict_code = "GO"
        verdict_rationale = (
            f"Base-case NPV of {_fmt_usd(base_npv)} and IRR of {base_irr:.1f}% clear the {wacc:.1f}% hurdle rate "
            f"by {base_irr - wacc:.1f} percentage points, while Conservative downside remains bounded "
            f"(NPV {_fmt_usd(cons_npv)}). Market scale (FY31 TAM ${market_sizing['summary']['fy31_tam_usd_bn']:.1f}B) "
            f"and CAFE-III / PM E-DRIVE localization mandates create an actionable 2027–2029 entry window."
        )
    elif base_npv > 0 and (base_irr is not None and base_irr >= wacc):
        verdict = "CONDITIONAL GO — STAGE-GATED ENTRY"
        verdict_code = "CONDITIONAL_GO"
        verdict_rationale = (
            f"Base-case NPV is positive ({_fmt_usd(base_npv)}, IRR {base_irr:.1f}% vs {wacc:.1f}% WACC), "
            f"but downside sensitivity (Conservative NPV {_fmt_usd(cons_npv)}) warrants strict stage-gate controls "
            f"on anchor OEM Letters of Intent and DVA localization prior to Phase-2 CAPEX commitment."
        )
    else:
        verdict = "DEFER / RESTRUCTURE ENTRY MODEL"
        verdict_code = "DEFER"
        verdict_rationale = (
            f"Under current assumptions, Base-case NPV ({_fmt_usd(base_npv)}) fails to clear the {wacc:.1f}% hurdle rate. "
            f"Recommend lowering initial CAPEX via contract assembly or securing binding export/PLI commitments before entry."
        )

    # Rank clusters dynamically using weighted suitability score
    ranked_clusters = []
    for clu in AUTOMOTIVE_CLUSTERS:
        composite = round(
            clu["tier2_ecosystem_score"] * 0.30
            + clu["ev_readiness_score"] * 0.30
            + clu["export_logistics_score"] * 0.25
            + clu["japanese_presence_score"] * 0.15,
            2,
        )
        ranked_clusters.append({**clu, "composite_fit_score": composite})
    ranked_clusters.sort(key=lambda c: c["composite_fit_score"], reverse=True)

    return {
        "verdict": verdict,
        "verdict_code": verdict_code,
        "verdict_rationale": verdict_rationale,
        "recommended_entry_mode": top_strategy,
        "preferred_customer_segments": [
            {
                "priority": "Tier 1 (Immediate Anchor)",
                "segment": "Japanese PV & Hybrid OEMs in India (Maruti Suzuki, Toyota Kirloskar)",
                "rationale": "Existing Japan HQ quality approvals accelerate Indian PPAP qualification by 6–9 months; CAFE-III drives immediate hybrid/BEV thermal demand.",
                "target_revenue_mix_pct": 45,
            },
            {
                "priority": "Tier 1 (High-Growth EV Scale)",
                "segment": "Indian Domestic PV/EV & SUV Leaders (Tata Motors EV, Mahindra & Mahindra)",
                "rationale": "Command leading Indian 4W EV volumes; actively seeking localized Tier-1 precision thermal, regenerative braking & power electronics to satisfy PM E-DRIVE PMP norms.",
                "target_revenue_mix_pct": 37,
            },
            {
                "priority": "Tier 2 (FX Hedge & Scale)",
                "segment": "Global Export Platforms ('China Plus One' — ASEAN, EU, Japan Sister Plants) & e-CV",
                "rationale": "Provides natural USD/JPY currency hedge (18–25% export mix) while utilizing Chennai/JNPT port gateways and improving plant capacity utilization.",
                "target_revenue_mix_pct": 18,
            },
        ],
        "target_regions": ranked_clusters,
        "investment_envelope": {
            "initial_capex_usd_m": base_s["initial_capex_usd_m"],
            "initial_nwc_usd_m": base_s["initial_nwc_usd_m"],
            "total_initial_investment_usd_m": base_s["total_initial_investment_usd_m"],
            "total_5yr_capex_usd_m": base_s["total_5yr_capex_usd_m"],
            "peak_funding_requirement_usd_m": base_s["peak_funding_requirement_usd_m"],
            "mitigation_budget_usd_m": risk_summary["total_mitigation_cost_usd_m"],
        },
        "expected_financial_performance": {
            "conservative": {
                "year5_revenue_usd_m": cons_s["year5_revenue_usd_m"],
                "year5_ebitda_margin_pct": cons_s["year5_ebitda_margin_pct"],
                "npv_usd_m": cons_s["npv_usd_m"],
                "irr_pct": cons_s["irr_pct"],
                "roi_5yr_pct": cons_s["roi_5yr_pct"],
                "simple_payback_years": cons_s["simple_payback_years"],
            },
            "base": {
                "year5_revenue_usd_m": base_s["year5_revenue_usd_m"],
                "year5_ebitda_margin_pct": base_s["year5_ebitda_margin_pct"],
                "npv_usd_m": base_s["npv_usd_m"],
                "irr_pct": base_s["irr_pct"],
                "roi_5yr_pct": base_s["roi_5yr_pct"],
                "simple_payback_years": base_s["simple_payback_years"],
            },
            "optimistic": {
                "year5_revenue_usd_m": opt_s["year5_revenue_usd_m"],
                "year5_ebitda_margin_pct": opt_s["year5_ebitda_margin_pct"],
                "npv_usd_m": opt_s["npv_usd_m"],
                "irr_pct": opt_s["irr_pct"],
                "roi_5yr_pct": opt_s["roi_5yr_pct"],
                "simple_payback_years": opt_s["simple_payback_years"],
            },
        },
        "roadmap": IMPLEMENTATION_ROADMAP,
    }
