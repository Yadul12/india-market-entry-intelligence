"""
Transparent, verified Source Register.
Every external metric displayed as SOURCED in the application maps directly to a Source ID below.
"""

from typing import Any

SOURCE_REGISTER: list[dict[str, Any]] = [
    {
        "source_id": "SRC-01",
        "organization": "Automotive Component Manufacturers Association of India (ACMA)",
        "title": "Indian Auto Component Industry Performance Review (FY2020–FY2026)",
        "publication_date": "2025–2026 Annual Reviews",
        "category": "Industry Sizing & Trade",
        "url": "https://www.acma.in/",
        "data_extracted": (
            "Total auto component industry turnover: FY20 $49.3B, FY21 $45.9B, FY22 $56.5B, "
            "FY23 $69.7B, FY24 $74.1B (INR 6.14L Cr), FY25 $80.2B (INR 6.73L Cr, +9.6% YoY), "
            "FY26 $85.9B (INR 7.60L Cr). FY25 OEM supplies $67.9B, exports $22.9B (North America 32%, "
            "Europe 29.5%, Asia 26%), imports $22.4B (trade surplus $453M), aftermarket $11.8B. "
            "EV share of domestic OEM supplies: 4.6% (FY26, excl. Li-ion battery packs). "
            "OEM supply split by product category and vehicle segment."
        ),
        "reliability_tier": "Primary Industry Association",
        "usage_pages": ["Executive Summary", "Market Intelligence", "TAM/SAM/SOM Analysis"],
    },
    {
        "source_id": "SRC-02",
        "organization": "Society of Indian Automobile Manufacturers (SIAM)",
        "title": "Indian Automobile Industry Production & Domestic Sales Statistics (FY2024–25 & FY2025–26)",
        "publication_date": "April 2025 – April 2026",
        "category": "Vehicle Production & Sales",
        "url": "https://www.siam.in/",
        "data_extracted": (
            "FY24-25 total vehicle production: 31,034,174 units. FY24-25 domestic sales: "
            "Passenger Vehicles 4,301,848 (+2.0% YoY), Commercial Vehicles 956,671 (-1.2% YoY), "
            "Two-Wheelers 19,607,332 (+9.1% YoY), Three-Wheelers 741,420 (+6.7% YoY). "
            "FY25-26 milestone: PV domestic sales ~4.64M units; Two-Wheelers >21.7M units."
        ),
        "reliability_tier": "Primary Industry Association",
        "usage_pages": ["Market Intelligence", "TAM/SAM/SOM Analysis"],
    },
    {
        "source_id": "SRC-03",
        "organization": "Ministry of Heavy Industries (MHI), Government of India",
        "title": "PLI Scheme for Automobile & Auto Component Industry (PLI-Auto) and PLI-ACC",
        "publication_date": "2021–2026 Policy Circulars",
        "category": "Government Policy & Incentives",
        "url": "https://heavyindustries.gov.in/",
        "data_extracted": (
            "PLI-Auto budgetary outlay INR 25,938 crore (5-year window FY23–FY27, disbursements through FY28); "
            "Component Champion incentives 7.2%–13% (+5% additional for BEV components) subject to >=50% "
            "Domestic Value Addition (DVA). PLI-ACC Battery Storage outlay INR 18,100 crore for 50 GWh capacity."
        ),
        "reliability_tier": "Government Ministry (Official)",
        "usage_pages": ["Market Intelligence", "Financial Modelling", "Risk Assessment", "Market Entry Recommendation"],
    },
    {
        "source_id": "SRC-04",
        "organization": "Ministry of Heavy Industries (MHI) & Press Information Bureau (PIB)",
        "title": "PM E-DRIVE Scheme (PM Electric Drive Revolution in Innovative Vehicle Enhancement)",
        "publication_date": "October 2024 – 2026 Updates",
        "category": "Government Policy & EV Demand",
        "url": "https://heavyindustries.gov.in/",
        "data_extracted": (
            "Initial outlay INR 10,900 crore (enhanced to INR 11,900 crore), effective Oct 1, 2024 to Mar 31, 2028. "
            "Covers demand incentives for e-2W, e-3W, e-ambulances, e-trucks, e-buses, public charging infrastructure, "
            "and Phased Manufacturing Programme (PMP) localization compliance."
        ),
        "reliability_tier": "Government Ministry (Official)",
        "usage_pages": ["Market Intelligence", "TAM/SAM/SOM Analysis", "Risk Assessment"],
    },
    {
        "source_id": "SRC-05",
        "organization": "India Brand Equity Foundation (IBEF)",
        "title": "Auto Components Industry in India Report",
        "publication_date": "2025–2026 Editions",
        "category": "Sector Research & Long-Term Outlook",
        "url": "https://www.ibef.org/industry/autocomponents-india",
        "data_extracted": (
            "Automotive sector accounts for ~6%–7.1% of India GDP and ~49% of manufacturing GDP. "
            "100% FDI permitted under automatic route. EV total sales surpassed 2.66M units in FY26 (+29% YoY). "
            "Long-term industry projection toward USD 200B by 2030 driven by China Plus One and localization."
        ),
        "reliability_tier": "Government-Backed Trade Trust",
        "usage_pages": ["Executive Summary", "Market Intelligence", "TAM/SAM/SOM Analysis"],
    },
    {
        "source_id": "SRC-06",
        "organization": "Reserve Bank of India (RBI)",
        "title": "Monetary Policy Rates & Foreign Exchange Reference Benchmarks",
        "publication_date": "2026 Monetary Policy Statements",
        "category": "Macroeconomic & FX Benchmarks",
        "url": "https://www.rbi.org.in/",
        "data_extracted": (
            "RBI benchmark Policy Repo Rate 5.50% (SDF 5.25%, MSF 5.75%). "
            "2026 FX market reference bands: USD/INR ~94.0 (range 93.5–95.0), JPY/INR ~0.59 (range 0.58–0.60)."
        ),
        "reliability_tier": "Central Bank (Official)",
        "usage_pages": ["Executive Summary", "Market Intelligence", "Financial Modelling", "Risk Assessment"],
    },
    {
        "source_id": "SRC-07",
        "organization": "The World Bank",
        "title": "India Development Update & Global Economic Prospects (2025–2026)",
        "publication_date": "2025–2026",
        "category": "Macroeconomic Indicators",
        "url": "https://data.worldbank.org/country/india",
        "data_extracted": (
            "India real GDP growth ~7.0%–7.6% in 2025 and projected 6.6%–7.1% in 2026, "
            "supported by domestic demand, infrastructure capex, and manufacturing expansion."
        ),
        "reliability_tier": "Multilateral Institution",
        "usage_pages": ["Market Intelligence", "Executive Summary"],
    },
    {
        "source_id": "SRC-08",
        "organization": "Bureau of Energy Efficiency (BEE) & Ministry of Road Transport and Highways (MoRTH)",
        "title": "BS6 Stage 2 (RDE/OBD-2), CAFE-III (FY28–FY32 WLTP) & Bharat NCAP 2.0 (AIS-197)",
        "publication_date": "2023–2026 Regulatory Notifications",
        "category": "Safety & Emissions Regulation",
        "url": "https://www.bncap.in/",
        "data_extracted": (
            "BS6 Stage 2 (RDE + OBD-2) mandatory since April 1, 2023. CAFE-III (April 1, 2027 – March 31, 2032) "
            "transitions to WLTP and tightens fleet consumption to 3.33 L/100km by FY32 with EV/hybrid super credits. "
            "Bharat NCAP 2.0 (AIS-197 Rev 1, ~late 2027) introduces 100-point 5-pillar rating including ADAS & VRU."
        ),
        "reliability_tier": "Statutory Regulatory Framework",
        "usage_pages": ["Market Intelligence", "Risk Assessment", "Market Entry Recommendation"],
    },
    {
        "source_id": "SRC-09",
        "organization": "Income Tax Department, Ministry of Finance, Government of India",
        "title": "Corporate Tax Provisions: Section 115BAA & Section 115BAB Sunset",
        "publication_date": "Finance Act Updates through 2025–2026",
        "category": "Taxation & Fiscal Policy",
        "url": "https://incometaxindia.gov.in/",
        "data_extracted": (
            "Section 115BAB (15% base / 17.16% effective) required manufacturing commencement on or before "
            "March 31, 2024. New manufacturing entrants post-March 2024 default to Section 115BAA: "
            "22% base corporate tax + 10% surcharge + 4% health/education cess = 25.17% effective rate (no MAT)."
        ),
        "reliability_tier": "Government Tax Authority (Official)",
        "usage_pages": ["Market Intelligence", "Financial Modelling", "Sources & Methodology"],
    },
    {
        "source_id": "SRC-10",
        "organization": "Samvardhana Motherson International Limited (SAMIL)",
        "title": "FY2024–25 Consolidated Annual Financial Results",
        "publication_date": "May 2025 (FY25 Annual Report)",
        "category": "Competitor Financial Filing",
        "url": "https://www.motherson.com/investors",
        "data_extracted": "FY25 consolidated revenue INR 1,14,220 crore; EBITDA INR 11,110 crore (~9.7% margin).",
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-11",
        "organization": "Bosch Limited (India)",
        "title": "FY2024–25 Annual Report & Financial Results",
        "publication_date": "May 2025 (FY25 Annual Report)",
        "category": "Competitor Financial Filing",
        "url": "https://www.bosch.in/",
        "data_extracted": "FY25 revenue from operations INR 18,087 crore (+8.1% YoY); Operating Profit (EBIT) INR 1,934 crore (10.7% EBIT margin).",
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-12",
        "organization": "Bharat Forge Limited & Uno Minda Limited",
        "title": "FY2024–25 Consolidated Financial Results (Annual Filings)",
        "publication_date": "May 2025 (FY25 Annual Reports)",
        "category": "Competitor Financial Filing",
        "url": "https://www.unominda.com/",
        "data_extracted": (
            "Bharat Forge FY25 consolidated revenue INR 15,337 crore, EBITDA INR 2,908 crore (19.0% margin). "
            "Uno Minda FY25 consolidated revenue INR 14,031 crore, EBITDA INR 1,585 crore (11.3% margin)."
        ),
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-13",
        "organization": "Endurance Technologies Limited & Gabriel India Limited",
        "title": "FY2024–25 Audited Financial Filings (NSE/BSE)",
        "publication_date": "May 2025 (FY25 Annual Reports)",
        "category": "Competitor Financial Filing",
        "url": "https://www.endurancegroup.com/",
        "data_extracted": (
            "Endurance Technologies FY25 consolidated revenue INR 11,561 crore, EBITDA margin 13.4%. "
            "Gabriel India FY25 standalone revenue INR 4,063 crore, EBITDA margin ~9.4% (9.0%–9.7% band)."
        ),
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-14",
        "organization": "Schaeffler India Limited & ZF Commercial Vehicle Control Systems India",
        "title": "CY2025 & FY2024–25 Published Financial Statements",
        "publication_date": "2025–2026 Annual Filings",
        "category": "Competitor Financial Filing",
        "url": "https://www.schaeffler.co.in/",
        "data_extracted": (
            "Schaeffler India CY2025 revenue INR 9,686 crore, operating margin ~18.2%. "
            "ZF CV Control Systems India FY25 operating income INR 3,831 crore, EBITDA margin ~16.0% (15%–17% band)."
        ),
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-15",
        "organization": "Sona BLW Precision Forgings Limited (Sona Comstar)",
        "title": "FY2024–25 Consolidated Annual Financial Statements",
        "publication_date": "May 2025 (FY25 Annual Report)",
        "category": "Competitor Financial Filing",
        "url": "https://sonacomstar.com/",
        "data_extracted": "FY25 consolidated revenue INR 3,555 crore (INR 35,545 million); EBITDA margin ~27.0% driven by EV drivetrain & differential assemblies.",
        "reliability_tier": "Audited Public Company Filing",
        "usage_pages": ["Competitor Benchmarking"],
    },
    {
        "source_id": "SRC-16",
        "organization": "Subros Limited, JTEKT India Limited & Denso India Limited",
        "title": "FY2024–25 & FY2025–26 Japanese-Affiliated Tier-1 Filings & Credit Reviews (NSE/BSE/ICRA)",
        "publication_date": "2025–2026 Filings",
        "category": "Japanese Peer Benchmarks in India",
        "url": "https://www.subros.com/",
        "data_extracted": (
            "Subros (Suri-Denso-Suzuki JV) FY25 revenue INR 3,368 crore, EBITDA margin 10.2%. "
            "JTEKT India FY26 revenue INR 2,666 crore (FY25 ~INR 2,400 crore), EBITDA margin ~7.6%. "
            "Denso India FY25 standalone revenue INR 1,687 crore, EBIT margin 7.05%, ROE 24.85%."
        ),
        "reliability_tier": "Audited Public Filings & Rating Agency Reports",
        "usage_pages": ["Competitor Benchmarking", "Market Entry Recommendation"],
    },
]
