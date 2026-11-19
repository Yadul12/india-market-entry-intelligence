from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FinancialScenarioRecord(Base):
    __tablename__ = "financial_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String(32), nullable=False)  # conservative | base | optimistic | custom
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assumptions_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class MarketSizingConfigRecord(Base):
    __tablename__ = "market_sizing_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    assumptions_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class EntryStrategyConfigRecord(Base):
    __tablename__ = "entry_strategy_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    weights_json: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    scores_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class RiskItemRecord(Base):
    __tablename__ = "risk_register"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    risk_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    probability: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    impact: Mapped[int] = mapped_column(Integer, nullable=False)       # 1..5
    residual_probability: Mapped[int] = mapped_column(Integer, nullable=False)
    residual_impact: Mapped[int] = mapped_column(Integer, nullable=False)
    mitigation_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    owner: Mapped[str] = mapped_column(String(96), nullable=False)
    early_warning_indicator: Mapped[str] = mapped_column(String(200), nullable=False)
    estimated_mitigation_cost_usd_m: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    provenance: Mapped[str] = mapped_column(String(32), nullable=False, default="ASSUMPTION")
    source_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class CompetitorRecord(Base):
    __tablename__ = "competitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    origin_group: Mapped[str] = mapped_column(String(48), nullable=False)  # Indian Domestic | European MNC | Japanese Peer
    headquarters: Mapped[str] = mapped_column(String(120), nullable=False)
    fiscal_period: Mapped[str] = mapped_column(String(32), nullable=False)
    revenue_inr_cr: Mapped[float] = mapped_column(Float, nullable=False)
    revenue_usd_m: Mapped[float] = mapped_column(Float, nullable=False)
    margin_pct: Mapped[float] = mapped_column(Float, nullable=False)
    margin_metric: Mapped[str] = mapped_column(String(32), nullable=False)  # EBITDA | EBIT | OPM
    pricing_positioning: Mapped[str] = mapped_column(String(64), nullable=False)
    segments_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    product_portfolio_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    key_oems_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    clusters_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    ev_readiness_score: Mapped[int] = mapped_column(Integer, nullable=False)      # 1..10 (analytical benchmark)
    localization_score: Mapped[int] = mapped_column(Integer, nullable=False)      # 1..10
    cost_competitiveness_score: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..10
    tech_capability_score: Mapped[int] = mapped_column(Integer, nullable=False)   # 1..10
    strengths: Mapped[str] = mapped_column(Text, nullable=False)
    vulnerabilities: Mapped[str] = mapped_column(Text, nullable=False)
    source_id: Mapped[str] = mapped_column(String(32), nullable=False)


class SourceRegisterRecord(Base):
    __tablename__ = "source_register"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    publication_date: Mapped[str] = mapped_column(String(48), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    url: Mapped[str] = mapped_column(String(360), nullable=False)
    data_extracted: Mapped[str] = mapped_column(Text, nullable=False)
    reliability_tier: Mapped[str] = mapped_column(String(48), nullable=False)
    usage_pages_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
