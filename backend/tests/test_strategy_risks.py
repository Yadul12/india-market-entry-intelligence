"""Unit tests for Weighted Entry Strategy MCDA & Risk Register Engine."""

from app.analytics.entry_strategy import evaluate_entry_strategies
from app.analytics.risk_engine import analyze_risk_register, classify_severity
from app.data.baseline_models import (
    DEFAULT_STRATEGY_SCORES,
    DEFAULT_STRATEGY_WEIGHTS,
    INITIAL_RISK_REGISTER,
)


def test_entry_strategy_weights_auto_normalize_and_rank():
    res = evaluate_entry_strategies(DEFAULT_STRATEGY_WEIGHTS, DEFAULT_STRATEGY_SCORES)
    total_norm = sum(c["normalized_weight_pct"] for c in res["criteria"])
    assert abs(total_norm - 100.0) < 0.2
    assert len(res["ranked_strategies"]) == 4
    # Baseline weights favor Majority JV
    assert res["recommended_strategy"]["strategy_key"] == "joint_venture"

    # Shifting 90% weight to IP Control should make Greenfield rank #1
    ip_heavy = {
        "investment_efficiency": 2.5,
        "risk_mitigation": 2.5,
        "ip_control": 90.0,
        "time_to_market": 2.5,
        "scalability": 2.5,
    }
    res_ip = evaluate_entry_strategies(ip_heavy, DEFAULT_STRATEGY_SCORES)
    assert res_ip["recommended_strategy"]["strategy_key"] == "greenfield"


def test_risk_engine_scoring_and_reduction():
    assert classify_severity(20) == "Critical"
    assert classify_severity(12) == "High"
    assert classify_severity(6) == "Moderate"
    assert classify_severity(3) == "Low"

    analysis = analyze_risk_register(INITIAL_RISK_REGISTER)
    assert analysis["summary"]["total_risks"] == 12
    assert len(analysis["category_summary"]) == 6
    assert analysis["summary"]["avg_residual_score"] < analysis["summary"]["avg_inherent_score"]
    assert analysis["summary"]["avg_risk_reduction_pct"] > 30.0
