"""
Risk Assessment & Probability-Impact Matrix Engine.
"""

from typing import Any


def classify_severity(score: int) -> str:
    if score >= 16:
        return "Critical"
    if score >= 10:
        return "High"
    if score >= 5:
        return "Moderate"
    return "Low"


def analyze_risk_register(risk_items: list[dict[str, Any]]) -> dict[str, Any]:
    enriched: list[dict[str, Any]] = []
    category_buckets: dict[str, dict[str, Any]] = {}

    inherent_scores: list[int] = []
    residual_scores: list[int] = []
    total_mitigation_cost = 0.0

    for r in risk_items:
        inh = int(r["probability"]) * int(r["impact"])
        res = int(r["residual_probability"]) * int(r["residual_impact"])
        reduction_pct = round(((inh - res) / inh) * 100.0, 1) if inh > 0 else 0.0

        item = {
            **r,
            "inherent_score": inh,
            "inherent_severity": classify_severity(inh),
            "residual_score": res,
            "residual_severity": classify_severity(res),
            "risk_reduction_pct": reduction_pct,
        }
        enriched.append(item)
        inherent_scores.append(inh)
        residual_scores.append(res)
        total_mitigation_cost += float(r.get("estimated_mitigation_cost_usd_m", 0.0))

        cat = r["category"]
        if cat not in category_buckets:
            category_buckets[cat] = {
                "category": cat,
                "count": 0,
                "avg_inherent_score": 0.0,
                "avg_residual_score": 0.0,
                "mitigation_cost_usd_m": 0.0,
                "_inh_sum": 0,
                "_res_sum": 0,
            }
        b = category_buckets[cat]
        b["count"] += 1
        b["_inh_sum"] += inh
        b["_res_sum"] += res
        b["mitigation_cost_usd_m"] = round(
            b["mitigation_cost_usd_m"] + float(r.get("estimated_mitigation_cost_usd_m", 0.0)), 2
        )

    category_summary = []
    for b in category_buckets.values():
        c = b["count"]
        category_summary.append(
            {
                "category": b["category"],
                "count": c,
                "avg_inherent_score": round(b["_inh_sum"] / c, 2),
                "avg_residual_score": round(b["_res_sum"] / c, 2),
                "mitigation_cost_usd_m": b["mitigation_cost_usd_m"],
            }
        )
    category_summary.sort(key=lambda x: x["avg_inherent_score"], reverse=True)

    enriched.sort(key=lambda x: (x["inherent_score"], x["residual_score"]), reverse=True)

    avg_inh = round(sum(inherent_scores) / len(inherent_scores), 2) if inherent_scores else 0.0
    avg_res = round(sum(residual_scores) / len(residual_scores), 2) if residual_scores else 0.0
    overall_reduction = round(((avg_inh - avg_res) / avg_inh) * 100.0, 1) if avg_inh > 0 else 0.0

    return {
        "summary": {
            "total_risks": len(enriched),
            "critical_inherent_count": sum(1 for x in enriched if x["inherent_severity"] == "Critical"),
            "high_inherent_count": sum(1 for x in enriched if x["inherent_severity"] == "High"),
            "critical_residual_count": sum(1 for x in enriched if x["residual_severity"] == "Critical"),
            "high_residual_count": sum(1 for x in enriched if x["residual_severity"] == "High"),
            "avg_inherent_score": avg_inh,
            "avg_residual_score": avg_res,
            "avg_risk_reduction_pct": overall_reduction,
            "total_mitigation_cost_usd_m": round(total_mitigation_cost, 2),
        },
        "category_summary": category_summary,
        "risks": enriched,
    }
