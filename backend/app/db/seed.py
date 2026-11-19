from sqlalchemy.orm import Session

from app.data.baseline_models import (
    DEFAULT_MARKET_SIZING_ASSUMPTIONS,
    DEFAULT_STRATEGY_SCORES,
    DEFAULT_STRATEGY_WEIGHTS,
    INITIAL_RISK_REGISTER,
    SYSTEM_SCENARIOS,
)
from app.data.competitors import COMPETITORS_DATA
from app.data.sources import SOURCE_REGISTER
from app.db.models import (
    CompetitorRecord,
    EntryStrategyConfigRecord,
    FinancialScenarioRecord,
    MarketSizingConfigRecord,
    RiskItemRecord,
    SourceRegisterRecord,
)


def seed_database(db: Session) -> None:
    """Idempotently seed verified public datasets and baseline consulting models."""
    # 1. Source Register
    if db.query(SourceRegisterRecord).count() == 0:
        for src in SOURCE_REGISTER:
            db.add(
                SourceRegisterRecord(
                    source_id=src["source_id"],
                    organization=src["organization"],
                    title=src["title"],
                    publication_date=src["publication_date"],
                    category=src["category"],
                    url=src["url"],
                    data_extracted=src["data_extracted"],
                    reliability_tier=src["reliability_tier"],
                    usage_pages_json=src["usage_pages"],
                )
            )

    # 2. Competitors
    if db.query(CompetitorRecord).count() == 0:
        for comp in COMPETITORS_DATA:
            db.add(
                CompetitorRecord(
                    company_code=comp["company_code"],
                    name=comp["name"],
                    origin_group=comp["origin_group"],
                    headquarters=comp["headquarters"],
                    fiscal_period=comp["fiscal_period"],
                    revenue_inr_cr=comp["revenue_inr_cr"],
                    revenue_usd_m=comp["revenue_usd_m"],
                    margin_pct=comp["margin_pct"],
                    margin_metric=comp["margin_metric"],
                    pricing_positioning=comp["pricing_positioning"],
                    segments_json=comp["segments"],
                    product_portfolio_json=comp["product_portfolio"],
                    key_oems_json=comp["key_oems"],
                    clusters_json=comp["clusters"],
                    ev_readiness_score=comp["ev_readiness_score"],
                    localization_score=comp["localization_score"],
                    cost_competitiveness_score=comp["cost_competitiveness_score"],
                    tech_capability_score=comp["tech_capability_score"],
                    strengths=comp["strengths"],
                    vulnerabilities=comp["vulnerabilities"],
                    source_id=comp["source_id"],
                )
            )

    # 3. Financial Scenarios (Conservative, Base, Optimistic)
    for sc in SYSTEM_SCENARIOS:
        exists = db.query(FinancialScenarioRecord).filter_by(slug=sc["slug"]).first()
        if not exists:
            db.add(
                FinancialScenarioRecord(
                    slug=sc["slug"],
                    name=sc["name"],
                    scenario_type=sc["scenario_type"],
                    description=sc["description"],
                    is_system=sc["is_system"],
                    assumptions_json=sc["assumptions"],
                )
            )

    # 4. Market Sizing Config
    if not db.query(MarketSizingConfigRecord).filter_by(config_key="default").first():
        db.add(
            MarketSizingConfigRecord(
                config_key="default",
                assumptions_json=DEFAULT_MARKET_SIZING_ASSUMPTIONS,
            )
        )

    # 5. Entry Strategy Decision Matrix Config
    if not db.query(EntryStrategyConfigRecord).filter_by(config_key="default").first():
        db.add(
            EntryStrategyConfigRecord(
                config_key="default",
                weights_json=DEFAULT_STRATEGY_WEIGHTS,
                scores_json=DEFAULT_STRATEGY_SCORES,
            )
        )

    # 6. Risk Register
    if db.query(RiskItemRecord).count() == 0:
        for item in INITIAL_RISK_REGISTER:
            db.add(
                RiskItemRecord(
                    risk_code=item["risk_code"],
                    category=item["category"],
                    title=item["title"],
                    description=item["description"],
                    probability=item["probability"],
                    impact=item["impact"],
                    residual_probability=item["residual_probability"],
                    residual_impact=item["residual_impact"],
                    mitigation_strategy=item["mitigation_strategy"],
                    owner=item["owner"],
                    early_warning_indicator=item["early_warning_indicator"],
                    estimated_mitigation_cost_usd_m=item["estimated_mitigation_cost_usd_m"],
                    provenance=item["provenance"],
                    source_ref=item["source_ref"],
                    is_custom=False,
                )
            )

    db.commit()
