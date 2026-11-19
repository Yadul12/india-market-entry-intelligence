"""
Baseline Consulting Assumptions (Illustrative Client Model Inputs for Nippon Precision Mobility Corp.)
Every parameter here is explicitly tagged ASSUMPTION in the UI and user-modifiable with live recalculation.
Baseline macro figures (FY26 TAM $85.9B, tax 25.17%, USD/INR 94.0, JPY/INR 0.59) are anchored to SOURCED benchmarks.
"""

from typing import Any

# Default TAM / SAM / SOM Market Sizing Assumptions
DEFAULT_MARKET_SIZING_ASSUMPTIONS: dict[str, Any] = {
    "base_year": "FY26",
    "base_tam_usd_bn": 85.9,              # SOURCED: ACMA FY26 turnover
    "oem_domestic_share_pct": 84.5,       # SOURCED: ACMA OEM share (~67.9/80.2)
    "pv_cagr_pct": 9.5,                   # ASSUMPTION: PV component growth (UV mix + CAFE-III/BNCAP content)
    "cv_cagr_pct": 7.5,                   # ASSUMPTION: CV component growth (infra + e-bus/e-truck)
    "ev_cagr_pct": 24.0,                  # ASSUMPTION: EV non-battery component CAGR (from 4.6% base)
    "other_cagr_pct": 8.0,                # ASSUMPTION: 2W/3W/Tractor/Aftermarket growth
    # Addressable Product Categories (SAM filters)
    "include_suspension_braking": True,   # 16% of OEM
    "include_drive_transmission": True,   # 15% of OEM
    "include_electrical_electronics": True,  # 13% of OEM
    "include_engine": False,
    "include_body_chassis": False,
    "include_interiors": False,
    "include_cooling_misc": False,
    # Tier-1 Localization & Specification Addressability (% of target categories addressable by Japanese precision Tier-1)
    "tier1_addressable_factor_pct": 42.0,  # ASSUMPTION: filters out commoditized/low-spec Tier-2/3 parts
    "export_hub_adder_pct": 12.0,          # ASSUMPTION: India-as-export-hub uplift to SAM
    # Client SOM Target Capture (% of SAM)
    "som_year1_share_pct": 0.14,           # ASSUMPTION: FY27 initial launch (~$25M-$30M rev)
    "som_year5_share_pct": 0.68,           # ASSUMPTION: FY31 scaled multi-OEM share (~$195M-$215M rev)
    "ramp_curve": "s_curve",               # linear | s_curve | backloaded
}

# Financial Model Scenario Baselines (5-Year Horizon: FY2027 - FY2031)
# All monetary inputs in USD Millions; currency display converts dynamically using FX rates.
BASE_FINANCIAL_ASSUMPTIONS: dict[str, Any] = {
    "horizon_years": 5,
    "start_fiscal_year": 2027,
    "year1_revenue_usd_m": 28.0,
    "revenue_growth_rates_pct": [95.0, 58.0, 36.0, 24.0],  # Y2, Y3, Y4, Y5 ramp rates as OEM SOP lines scale
    "export_revenue_share_pct": 18.0,
    "cogs_pct_year1": 71.0,                 # Higher initial CKD/imported sub-component content (DVA ~45%)
    "cogs_localization_stepdown_bps": 160,  # -1.6% COGS/yr as DVA scales to ~75% by Y5
    "direct_labor_overhead_pct": 8.5,
    "sga_pct": 7.5,
    "rd_engineering_pct": 3.0,
    "royalty_tech_fee_pct": 2.5,
    "pli_incentive_enabled": False,         # Conservative default: off unless entering via approved PLI JV partner
    "pli_incentive_pct": 0.0,               # Up to 8.0% on eligible AAT incremental revenue if JV-linked
    "initial_capex_usd_m": 48.0,            # Land/plant lease buildout, automated lines, testing lab, tooling (JV 51% or standalone)
    "maintenance_capex_pct_rev": 3.5,
    "expansion_capex_y3_usd_m": 14.0,       # Phase-2 EV thermal & e-axle line expansion in Year 3
    "depreciation_years": 10,
    "dso_days": 58,                         # OEM receivable days in India
    "dio_days": 52,                         # Imported + localized raw material & WIP inventory days
    "dpo_days": 55,                         # Supplier payable days
    "corporate_tax_rate_pct": 25.17,        # SOURCED: Section 115BAA effective rate
    "wacc_pct": 12.5,                       # ASSUMPTION: India USD hurdle rate (risk-free + India ERP + FX risk)
    "terminal_growth_pct": 4.0,             # ASSUMPTION: Long-term steady-state USD nominal growth
    "usd_inr_rate": 94.0,                   # SOURCED: 2026 RBI/market reference
    "jpy_inr_rate": 0.59,                   # SOURCED: 2026 RBI/market reference
    "entry_mode_label": "Majority Joint Venture (51:49)",
}

CONSERVATIVE_FINANCIAL_ASSUMPTIONS: dict[str, Any] = {
    **BASE_FINANCIAL_ASSUMPTIONS,
    "year1_revenue_usd_m": 20.0,
    "revenue_growth_rates_pct": [70.0, 44.0, 26.0, 18.0],
    "export_revenue_share_pct": 12.0,
    "cogs_pct_year1": 73.5,
    "cogs_localization_stepdown_bps": 110,
    "direct_labor_overhead_pct": 9.2,
    "sga_pct": 8.2,
    "initial_capex_usd_m": 54.0,
    "expansion_capex_y3_usd_m": 10.0,
    "dso_days": 68,
    "dio_days": 62,
    "dpo_days": 50,
    "wacc_pct": 14.0,
    "terminal_growth_pct": 3.0,
}

OPTIMISTIC_FINANCIAL_ASSUMPTIONS: dict[str, Any] = {
    **BASE_FINANCIAL_ASSUMPTIONS,
    "year1_revenue_usd_m": 34.0,
    "revenue_growth_rates_pct": [108.0, 66.0, 42.0, 28.0],
    "export_revenue_share_pct": 25.0,
    "cogs_pct_year1": 69.0,
    "cogs_localization_stepdown_bps": 200,
    "direct_labor_overhead_pct": 7.8,
    "sga_pct": 6.8,
    "pli_incentive_enabled": True,
    "pli_incentive_pct": 5.5,               # Effective blended PLI/state SGST incentive via qualified JV
    "initial_capex_usd_m": 46.0,
    "expansion_capex_y3_usd_m": 18.0,
    "dso_days": 50,
    "dio_days": 45,
    "dpo_days": 58,
    "wacc_pct": 11.5,
    "terminal_growth_pct": 4.5,
}

SYSTEM_SCENARIOS: list[dict[str, Any]] = [
    {
        "slug": "conservative",
        "name": "Conservative Case",
        "scenario_type": "conservative",
        "description": (
            "Slower 4W EV adoption, 6-month OEM PPAP qualification slip, slower localization curve, "
            "higher working capital absorption, and elevated 14.0% hurdle WACC."
        ),
        "is_system": True,
        "assumptions": CONSERVATIVE_FINANCIAL_ASSUMPTIONS,
    },
    {
        "slug": "base",
        "name": "Base Case (Recommended)",
        "scenario_type": "base",
        "description": (
            "Majority JV (51:49) anchored in Pune–Chakan with Maruti/Toyota + Tata/M&M platform wins, "
            "structured DVA ramp from 45% to 75%, Sec 115BAA tax (25.17%), and 12.5% USD WACC."
        ),
        "is_system": True,
        "assumptions": BASE_FINANCIAL_ASSUMPTIONS,
    },
    {
        "slug": "optimistic",
        "name": "Optimistic Case",
        "scenario_type": "optimistic",
        "description": (
            "Rapid CAFE-III / EV thermal localization pull, JV access to PLI/state incentives (~5.5% blended), "
            "accelerated 'China Plus One' export mandate (25% export mix), and 11.5% WACC."
        ),
        "is_system": True,
        "assumptions": OPTIMISTIC_FINANCIAL_ASSUMPTIONS,
    },
]

# Weighted Entry Strategy Decision Matrix (4 Strategies x 5 Criteria)
DEFAULT_STRATEGY_WEIGHTS: dict[str, float] = {
    "investment_efficiency": 20.0,   # Lower upfront capital / capex efficiency
    "risk_mitigation": 20.0,         # Execution, regulatory, and market downside protection
    "ip_control": 25.0,              # Technology/IP protection & operational governance
    "time_to_market": 20.0,          # Speed to OEM PPAP vendor code & revenue ramp
    "scalability": 15.0,             # Multi-OEM expansion & export hub capacity
}

DEFAULT_STRATEGY_SCORES: dict[str, dict[str, Any]] = {
    "greenfield": {
        "name": "Greenfield Wholly-Owned Subsidiary (100% WOS)",
        "typical_capex_usd_m": "65 – 85M",
        "time_to_sop_months": "30 – 36 months",
        "ownership_structure": "100% Nippon Precision Mobility India Pvt. Ltd.",
        "scores": {
            "investment_efficiency": 4.5,
            "risk_mitigation": 5.0,
            "ip_control": 9.8,
            "time_to_market": 4.0,
            "scalability": 9.2,
        },
        "pros": [
            "Absolute protection of proprietary EV power electronics & thermal IP.",
            "Full alignment with Japanese manufacturing standards (TPS) and global export integration.",
            "No partner governance friction or dividend-sharing dilution.",
        ],
        "cons": [
            "Highest initial CAPEX ($65–85M) and longest land/permitting + OEM vendor onboarding cycle (30–36 mos).",
            "High operational risk navigating Indian labor, state permitting, and Tier-2 vendor development alone.",
            "Misses the 2027–2028 CAFE-III and PM E-DRIVE platform nomination window.",
        ],
    },
    "joint_venture": {
        "name": "Majority Joint Venture (51–60% Equity with Indian Tier-1)",
        "typical_capex_usd_m": "42 – 54M (Client Share)",
        "time_to_sop_months": "15 – 20 months",
        "ownership_structure": "51–60% Japanese Entrant / 40–49% Established Indian Tier-1",
        "scores": {
            "investment_efficiency": 7.8,
            "risk_mitigation": 8.4,
            "ip_control": 7.8,
            "time_to_market": 8.5,
            "scalability": 8.6,
        },
        "pros": [
            "Immediate access to Indian OEM vendor codes (Tata, M&M, Maruti) and brownfield shopfloor/utilities.",
            "Shared capital outlay and proven blueprint in India (e.g., Subros/Denso, Uno Minda/Tokai Rika JVs).",
            "Majority equity + technical licensing ring-fences core black-box IP while enabling PLI/state incentive alignment.",
        ],
        "cons": [
            "Requires disciplined partner selection, clear IP boundary agreements, and aligned export transfer pricing.",
            "Potential medium-term strategic divergence if partner enters competing adjacencies (mitigated via call-option clauses).",
        ],
    },
    "acquisition": {
        "name": "Brownfield Acquisition (Majority Buyout of Mid-Tier Supplier)",
        "typical_capex_usd_m": "75 – 115M (incl. Valuation Multiple)",
        "time_to_sop_months": "12 – 18 months",
        "ownership_structure": "75–100% Buyout of Listed/Private Indian Auto Component Firm",
        "scores": {
            "investment_efficiency": 3.8,
            "risk_mitigation": 5.6,
            "ip_control": 8.8,
            "time_to_market": 8.2,
            "scalability": 8.0,
        },
        "pros": [
            "Fastest revenue scale with established plants, workforce, and OEM contracts.",
            "High post-close operational control without minority JV veto deadlocks.",
        ],
        "cons": [
            "Elevated Indian auto-ancillary EV/EBITDA multiples (14x–22x for quality Tier-1s) depress NPV/IRR.",
            "Legacy ICE asset overhang, cultural/quality system integration friction, and hidden environmental/tax liabilities.",
        ],
    },
    "strategic_partnership": {
        "name": "Strategic Partnership / Contract Manufacturing & Licensing",
        "typical_capex_usd_m": "10 – 18M (Tooling & Tech Transfer)",
        "time_to_sop_months": "9 – 14 months",
        "ownership_structure": "Technical Assistance Agreement (TAA) + Royalty + CKD Supply",
        "scores": {
            "investment_efficiency": 9.4,
            "risk_mitigation": 7.4,
            "ip_control": 4.2,
            "time_to_market": 8.8,
            "scalability": 5.0,
        },
        "pros": [
            "Lowest upfront capital commitment; rapid market testing and limited balance-sheet exposure.",
            "Fast deployment for select Japanese OEM transplants using CKD/SKD kits.",
        ],
        "cons": [
            "Weakest IP protection and limited control over shopfloor quality, pricing, and OEM relationship ownership.",
            "Capped economics (royalty-only 2–5%), inability to capture localization value-add or build a global export hub.",
        ],
    },
}

# Initial 12-Item Risk Register covering all 6 mandatory categories
INITIAL_RISK_REGISTER: list[dict[str, Any]] = [
    {
        "risk_code": "R-01",
        "category": "Regulatory",
        "title": "DVA Localization Threshold & PMP Audit Non-Compliance",
        "description": "Failure to reach >=50% Domestic Value Addition (DVA) under PM E-DRIVE PMP or PLI rules risks exclusion from OEM EV bill-of-materials and subsidy clawbacks.",
        "probability": 3,
        "impact": 5,
        "residual_probability": 2,
        "residual_impact": 3,
        "mitigation_strategy": "Phase-1 CKD assembly followed by contracted Tier-2 casting/PCB localization roadmap to reach 65% DVA by Month 24; engage Big-4 DVA certification auditors early.",
        "owner": "VP Regulatory & Localization",
        "early_warning_indicator": "Quarterly DVA % tracker falling >5 pts below OEM schedule",
        "estimated_mitigation_cost_usd_m": 1.2,
        "provenance": "SOURCED",
        "source_ref": "SRC-03",
    },
    {
        "risk_code": "R-02",
        "category": "Regulatory",
        "title": "Customs Tariff Increases on Imported Sub-Assemblies & Precision Tooling",
        "description": "India periodically raises Basic Customs Duty (BCD) on imported auto electronics and EV sub-components to enforce 'Make in India', compressing Phase-1 gross margins.",
        "probability": 4,
        "impact": 4,
        "residual_probability": 3,
        "residual_impact": 2,
        "mitigation_strategy": "Leverage India–Japan CEPA preferential tariff schedules, apply for MOOWR bonded-warehouse duty deferment for export lines, and pre-qualify local sub-suppliers.",
        "owner": "Head of Trade & Tax",
        "early_warning_indicator": "Union Budget / CBIC tariff notifications on HS 8504/8708 codes",
        "estimated_mitigation_cost_usd_m": 0.6,
        "provenance": "SOURCED",
        "source_ref": "SRC-09",
    },
    {
        "risk_code": "R-03",
        "category": "Competitive",
        "title": "Aggressive Cost Pricing by Indian Tier-1 Conglomerates & Japanese Peers",
        "description": "Entrenched suppliers (Uno Minda, SAMIL, Subros, Endurance) possess amortized local assets and aggressive cost structures that could compress bidding margins by 200–350 bps.",
        "probability": 4,
        "impact": 4,
        "residual_probability": 3,
        "residual_impact": 3,
        "mitigation_strategy": "Avoid commoditized ICE parts; compete in high-spec EV thermal heat pumps, compact actuators, and CAFE-III/BNCAP 2.0 modules backed by JV cost-down engineering.",
        "owner": "Chief Commercial Officer",
        "early_warning_indicator": "RFQ win rate falling below 25% or OEM target price gap >10%",
        "estimated_mitigation_cost_usd_m": 1.5,
        "provenance": "SOURCED",
        "source_ref": "SRC-12",
    },
    {
        "risk_code": "R-04",
        "category": "Competitive",
        "title": "JV Partner Conflict of Interest or Core IP Leakage",
        "description": "Indian JV partner may develop competing products with alternative global licensors or retain OEM relationships upon JV dissolution.",
        "probability": 3,
        "impact": 5,
        "residual_probability": 1,
        "residual_impact": 3,
        "mitigation_strategy": "Enforce 51–60% majority control, keep black-box firmware/control algorithms in Japan HQ under separate TAA, add non-compete & buyout call-option clauses.",
        "owner": "General Counsel & M&A Lead",
        "early_warning_indicator": "Partner announcing competing alliances or unauthorized engineering transfers",
        "estimated_mitigation_cost_usd_m": 0.8,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
    {
        "risk_code": "R-05",
        "category": "Supply-Chain",
        "title": "Tier-2 Precision Casting & Automotive-Grade Electronics Quality Gaps",
        "description": "Local sub-tier foundries and PCB assemblers may fail Japanese zero-defect (<15 PPM) tolerances, causing line stoppages and OEM warranty claims.",
        "probability": 4,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 3,
        "mitigation_strategy": "Deploy dedicated Japanese SQE (Supplier Quality Engineering) team in Pune/Chennai, dual-source critical castings, and co-invest in shared metrology tooling.",
        "owner": "VP Supply Chain & Quality",
        "early_warning_indicator": "Incoming defect rate >50 PPM or Tier-2 OTD falling below 94%",
        "estimated_mitigation_cost_usd_m": 2.4,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
    {
        "risk_code": "R-06",
        "category": "Supply-Chain",
        "title": "Imported Power Semiconductor & Rare-Earth Magnet Bottlenecks",
        "description": "India lacks mature domestic SiC/IGBT wafer fabs and rare-earth processing; geopolitical disruptions or port congestion can stall EV module assembly.",
        "probability": 3,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 3,
        "mitigation_strategy": "Maintain 45-day safety buffer on long-lead semiconductors via Japan HQ global allocation pool and qualify non-China magnet supply chains.",
        "owner": "VP Supply Chain & Quality",
        "early_warning_indicator": "Semiconductor allocation lead times exceeding 24 weeks",
        "estimated_mitigation_cost_usd_m": 1.8,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
    {
        "risk_code": "R-07",
        "category": "Currency",
        "title": "INR Depreciation vs USD/JPY Impacting Imported Capex & Kit Margins",
        "description": "With USD/INR around 94.0 and JPY/INR near 0.59, sharp INR weakening or JPY strengthening inflates Phase-1 imported machinery, CKD sub-kits, and reduces repatriated JPY returns.",
        "probability": 4,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 2,
        "mitigation_strategy": "Build natural FX hedge via 18–25% USD/JPY export mix from India, negotiate OEM FX-pass-through clauses (+/-3% band), and hedge 12-month imports via RBI-approved forwards.",
        "owner": "Chief Financial Officer",
        "early_warning_indicator": "USD/INR breaching 98.0 or JPY/INR breaching 0.65",
        "estimated_mitigation_cost_usd_m": 1.0,
        "provenance": "SOURCED",
        "source_ref": "SRC-06",
    },
    {
        "risk_code": "R-08",
        "category": "Currency",
        "title": "Dividend Repatriation & Transfer Pricing Scrutiny",
        "description": "Indian tax authorities scrutinize cross-border royalty fees and intercompany CKD pricing under OECD/Indian TP rules, creating cash-trap or reassessment risk.",
        "probability": 3,
        "impact": 3,
        "residual_probability": 2,
        "residual_impact": 2,
        "mitigation_strategy": "Establish India–Japan Bilateral Advance Pricing Agreement (APA) early and benchmark royalty rates (2.5%) against peer Indo-Japanese Tier-1 filings.",
        "owner": "Chief Financial Officer",
        "early_warning_indicator": "TP audit notices or royalty benchmark drift >100 bps",
        "estimated_mitigation_cost_usd_m": 0.5,
        "provenance": "SOURCED",
        "source_ref": "SRC-09",
    },
    {
        "risk_code": "R-09",
        "category": "Demand",
        "title": "Slower-Than-Forecast 4W Passenger EV Penetration in India",
        "description": "While total EVs reached 2.66M units (led by 2W/3W), 4W PV EV adoption could lag due to charging gaps or post-2028 subsidy roll-off, leaving EV-dedicated lines underutilized.",
        "probability": 3,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 2,
        "mitigation_strategy": "Design flexible modular production lines capable of serving strong hybrids (CAFE-III beneficiaries), ICE premium SUVs, and global BEV export platforms.",
        "owner": "Chief Strategy Officer",
        "early_warning_indicator": "India 4W EV share stalling below 4% of PV sales through FY28",
        "estimated_mitigation_cost_usd_m": 2.0,
        "provenance": "SOURCED",
        "source_ref": "SRC-05",
    },
    {
        "risk_code": "R-10",
        "category": "Demand",
        "title": "OEM Platform Delay or Customer Concentration Shock",
        "description": "Over-reliance on 1–2 anchor OEM platforms creates severe Year 2–3 revenue slippage if a flagship SUV/EV model launch slips 9–12 months.",
        "probability": 3,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 3,
        "mitigation_strategy": "Balance initial pipeline across at least 3 OEMs (Maruti/Toyota + Tata/M&M) plus HQ-allocated ASEAN/EU export SKUs by Year 2.",
        "owner": "Chief Commercial Officer",
        "early_warning_indicator": "Single OEM accounting for >55% of contracted FY28–FY29 order book",
        "estimated_mitigation_cost_usd_m": 0.7,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
    {
        "risk_code": "R-11",
        "category": "Operational",
        "title": "OEM PPAP Qualification & Homologation Timeline Overruns",
        "description": "Indian & Japanese OEM validation cycles (thermal durability, dust/monsoon testing, IATF 16949 plant audits) typically span 18–24 months; delays push revenue breakeven back.",
        "probability": 4,
        "impact": 4,
        "residual_probability": 2,
        "residual_impact": 3,
        "mitigation_strategy": "Use JV partner's existing IATF 16949 certified facility for Phase-1 pilot lines and begin pre-nomination joint validation using Japanese mother-plant samples.",
        "owner": "COO India Operations",
        "early_warning_indicator": "Prototype validation milestone slip >60 days vs OEM SOP gate",
        "estimated_mitigation_cost_usd_m": 1.1,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
    {
        "risk_code": "R-12",
        "category": "Operational",
        "title": "Skilled EV Mechatronics Talent Attrition & Industrial Relations",
        "description": "High attrition (18–22%) among EV thermal/power electronics engineers in Pune/Bengaluru and plant labor compliance complexities can erode productivity.",
        "probability": 3,
        "impact": 3,
        "residual_probability": 2,
        "residual_impact": 2,
        "mitigation_strategy": "Establish structured Japan HQ technical immersion fellowships, partner with IIT/COEP engineering pipelines, and adopt partner's localized HR/IR governance.",
        "owner": "VP Human Resources",
        "early_warning_indicator": "Engineering attrition >14% annualized or plant OEE <78%",
        "estimated_mitigation_cost_usd_m": 0.9,
        "provenance": "ASSUMPTION",
        "source_ref": None,
    },
]

# 3-Year Implementation Roadmap (2027 - 2029)
IMPLEMENTATION_ROADMAP: list[dict[str, Any]] = [
    {
        "phase": "Phase 1: Structuring & Anchor Lock-In",
        "window": "Q1 – Q4 2027 (Year 1)",
        "workstream": "Corporate, JV & Legal",
        "key_milestones": [
            "Shortlist & execute MoU with Pune/Chennai Tier-1 JV partner (51:49 majority equity + TAA).",
            "Complete CCI/FEMA regulatory filings, IP ring-fencing, and Sec 115BAA / state PSI incentive registration.",
            "Establish India–Japan Bilateral APA transfer pricing dossier.",
        ],
        "stage_gate": "Gate 1 (Q3 2027): Signed Definitive JV Agreement + >=2 OEM LOIs secured.",
    },
    {
        "phase": "Phase 1: Structuring & Anchor Lock-In",
        "window": "Q2 – Q4 2027 (Year 1)",
        "workstream": "Plant & Pilot Localization",
        "key_milestones": [
            "Commission Phase-1 CKD/SKD assembly line inside JV partner's Chakan IATF 16949 brownfield bay.",
            "Install environmental thermal & vibration validation rigs; initiate Tier-2 supplier quality audits.",
            "Commence initial Japan HQ engineer dispatch & local engineering hiring (Hosur/Pune).",
        ],
        "stage_gate": "Gate 2 (Q4 2027): Pilot line IATF 16949 readiness & A/B sample delivery.",
    },
    {
        "phase": "Phase 2: SOP, Localization & Export Ramp",
        "window": "Q1 – Q4 2028 (Year 2)",
        "workstream": "OEM Qualification (PPAP) & Commercial",
        "key_milestones": [
            "Achieve full PPAP approval and Start of Production (SOP) on anchor Maruti/Toyota hybrid & Tata EV platforms.",
            "Scale Domestic Value Addition (DVA) from ~45% to >60% to unlock PM E-DRIVE PMP compliance.",
            "Initiate Phase-1 USD export shipments to ASEAN / European sister plants (12–18% export mix).",
        ],
        "stage_gate": "Gate 3 (Q4 2028): Positive monthly operating EBITDA & <25 PPM field quality.",
    },
    {
        "phase": "Phase 3: Scale-Up & Multi-Cluster Expansion",
        "window": "Q1 – Q4 2029 (Year 3)",
        "workstream": "Capacity Expansion & Export Hub",
        "key_milestones": [
            "Deploy Phase-2 expansion CAPEX ($14M Base) for automated EV heat-pump & e-axle sub-assembly lines.",
            "Open Gujarat (Sanand) / Chennai satellite sequencing center to serve Suzuki EV & export corridors.",
            "Reach >=72% localization (DVA), 4+ OEM accounts (PV + CV + EV), and full financial break-even trajectory.",
        ],
        "stage_gate": "Gate 4 (Q4 2029): Cumulative operating breakeven inflection & ASEAN/EU export hub certification.",
    },
]
