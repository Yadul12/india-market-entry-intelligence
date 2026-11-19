"""
Executive Consulting PDF Report Generator (ReportLab).
Generates a clean, institutional-grade board briefing PDF directly from live calculated data.
"""

from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#0F2942")
TEAL = colors.HexColor("#0E6B6B")
CHARCOAL = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#52606D")
BORDER = colors.HexColor("#D5DCE2")
LIGHT_BG = colors.HexColor("#F4F6F8")
WHITE = colors.white
EMERALD = colors.HexColor("#1B6B4A")
AMBER = colors.HexColor("#9A6314")
CRIMSON = colors.HexColor("#9B2C2C")


def _fmt_money(val_usd_m: float | None, currency: str, usd_inr: float, jpy_inr: float) -> str:
    if val_usd_m is None:
        return "N/A"
    if currency == "INR":
        # 1 USD M = usd_inr / 10 INR Cr
        cr = val_usd_m * usd_inr / 10.0
        return f"INR {cr:,.1f} Cr"
    if currency == "JPY":
        # 1 USD = usd_inr / jpy_inr JPY -> USD M -> JPY Bn = val_usd_m * (usd_inr/jpy_inr) / 1000
        jpy_bn = val_usd_m * (usd_inr / jpy_inr) / 1000.0
        return f"JPY {jpy_bn:,.2f}B"
    return f"${val_usd_m:,.1f}M"


def _add_header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    # Top rule
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(1.2)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(NAVY)
    canvas.drawString(18 * mm, height - 13 * mm, "INDIA MARKET ENTRY & STRATEGIC GROWTH INTELLIGENCE")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 18 * mm, height - 13 * mm, "CONFIDENTIAL — BOARD STRATEGY BRIEFING")

    # Bottom footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(
        18 * mm,
        10 * mm,
        f"Prepared for Nippon Precision Mobility Corp. (Illustrative Client) | Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
    )
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def generate_executive_pdf(
    recommendation: dict[str, Any],
    market_sizing: dict[str, Any],
    active_financials: dict[str, Any],
    scenarios_comparison: list[dict[str, Any]],
    strategy_eval: dict[str, Any],
    risk_analysis: dict[str, Any],
    competitors: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    scenario_name: str,
    display_currency: str = "USD",
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title="India Market Entry & Strategic Growth Intelligence - Executive Report",
        author="Strategy & Corporate Finance Advisory",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=23,
        textColor=NAVY,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=MUTED,
        spaceAfter=10,
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=NAVY,
        spaceBefore=12,
        spaceAfter=6,
    )
    h3_style = ParagraphStyle(
        "SectionH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=TEAL,
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.5,
        textColor=CHARCOAL,
        spaceAfter=5,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.6,
        leading=10.5,
        textColor=MUTED,
    )
    cell_style = ParagraphStyle(
        "Cell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.8,
        leading=10,
        textColor=CHARCOAL,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=NAVY,
    )
    cell_right = ParagraphStyle("CellRight", parent=cell_style, alignment=TA_RIGHT)

    usd_inr = float(active_financials["assumptions"].get("usd_inr_rate", 94.0))
    jpy_inr = float(active_financials["assumptions"].get("jpy_inr_rate", 0.59))
    fin_s = active_financials["summary"]
    ms_s = market_sizing["summary"]

    story: list[Any] = []

    # --- PAGE 1: COVER / EXECUTIVE VERDICT & KEY METRICS ---
    story.append(Paragraph("India Market Entry & Strategic Growth Intelligence", title_style))
    story.append(
        Paragraph(
            f"Management Consulting Decision Dossier | Client: Nippon Precision Mobility Corp. (Illustrative) | "
            f"Active Case: {scenario_name} | Reporting Currency: {display_currency}",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceAfter=10))

    # Verdict Callout Box
    verdict_color = EMERALD if recommendation["verdict_code"] == "GO" else (
        AMBER if recommendation["verdict_code"] == "CONDITIONAL_GO" else CRIMSON
    )
    verdict_table = Table(
        [
            [
                Paragraph(
                    f"<b>EXECUTIVE RECOMMENDATION: {recommendation['verdict']}</b>",
                    ParagraphStyle("VHead", parent=body_style, fontName="Helvetica-Bold", fontSize=10.5, textColor=WHITE),
                )
            ],
            [Paragraph(recommendation["verdict_rationale"], body_style)],
        ],
        colWidths=[174 * mm],
    )
    verdict_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), verdict_color),
                ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 0.75, verdict_color),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(verdict_table)
    story.append(Spacer(1, 8))

    # KPI Summary Strip
    top_strat = strategy_eval["recommended_strategy"]
    top_cluster = recommendation["target_regions"][0]
    kpi_data = [
        [
            Paragraph("<b>FY26 India TAM</b><br/><font size='7' color='#52606D'>[SOURCED: ACMA]</font>", cell_bold),
            Paragraph("<b>FY31 Addressable SAM</b><br/><font size='7' color='#52606D'>[DERIVED]</font>", cell_bold),
            Paragraph("<b>Active Case NPV</b><br/><font size='7' color='#52606D'>[@ WACC " + f"{fin_s['wacc_pct']:.1f}%]</font>", cell_bold),
            Paragraph("<b>Project IRR / Payback</b><br/><font size='7' color='#52606D'>[DERIVED]</font>", cell_bold),
            Paragraph("<b>Top Entry Mode</b><br/><font size='7' color='#52606D'>[MCDA RANK #1]</font>", cell_bold),
        ],
        [
            Paragraph(f"<b>${ms_s['fy26_tam_usd_bn']:.1f}B</b><br/>FY31: ${ms_s['fy31_tam_usd_bn']:.1f}B", cell_style),
            Paragraph(f"<b>${ms_s['fy31_sam_usd_bn']:.1f}B</b><br/>FY31 SOM: ${ms_s['fy31_som_usd_m']:.1f}M", cell_style),
            Paragraph(f"<b>{_fmt_money(fin_s['npv_usd_m'], display_currency, usd_inr, jpy_inr)}</b><br/>5Y Ex-TV: {_fmt_money(fin_s['npv_5yr_explicit_usd_m'], display_currency, usd_inr, jpy_inr)}", cell_style),
            Paragraph(
                f"<b>{fin_s['irr_pct'] if fin_s['irr_pct'] is not None else 'N/A'}%</b><br/>"
                f"Payback: {fin_s['simple_payback_years'] if fin_s['simple_payback_years'] is not None else '>5'} yrs",
                cell_style,
            ),
            Paragraph(f"<b>{top_strat['name'].split('(')[0].strip()}</b><br/>Score: {top_strat['weighted_score']:.2f} / 10", cell_style),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[34.8 * mm] * 5)
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(kpi_table)
    story.append(Spacer(1, 8))

    # Strategic Summary Narrative
    story.append(Paragraph("1. Strategic Mandate & Market Sizing Summary", h2_style))
    story.append(
        Paragraph(
            f"India's automotive components industry reached <b>USD {ms_s['fy26_tam_usd_bn']:.1f} billion in FY2026</b> "
            f"(historical FY20–FY26 CAGR of {ms_s['historical_cagr_fy20_fy26_pct']:.1f}%, ACMA [SRC-01]), backed by "
            f"31.03 million annual vehicle production (SIAM [SRC-02]) and structural policy tailwinds including "
            f"PLI-Auto (INR 25,938 Cr [SRC-03]), PM E-DRIVE (INR 11,900 Cr [SRC-04]), CAFE-III (WLTP, April 2027), "
            f"and Bharat NCAP 2.0 [SRC-08]. Under the active model parameters, total market TAM expands at a "
            f"{ms_s['forward_tam_cagr_fy26_fy31_pct']:.1f}% CAGR to <b>USD {ms_s['fy31_tam_usd_bn']:.1f}B by FY31</b>, "
            f"yielding a Serviceable Available Market (SAM) of <b>USD {ms_s['fy31_sam_usd_bn']:.1f}B</b> across precision "
            f"EV power electronics/thermal, chassis/braking mechatronics, and drive transmission systems.",
            body_style,
        )
    )

    # TAM / SAM / SOM Projection Table
    ms_rows = [
        [
            Paragraph("<b>Fiscal Year</b>", cell_bold),
            Paragraph("<b>Total TAM ($B)</b>", cell_bold),
            Paragraph("<b>PV ($B)</b>", cell_bold),
            Paragraph("<b>CV ($B)</b>", cell_bold),
            Paragraph("<b>EV ($B)</b>", cell_bold),
            Paragraph("<b>Addressable SAM ($B)</b>", cell_bold),
            Paragraph("<b>Target SOM ($M)</b>", cell_bold),
            Paragraph("<b>SOM % SAM</b>", cell_bold),
        ]
    ]
    for row in market_sizing["forecast_series"]:
        ms_rows.append(
            [
                Paragraph(row["fiscal_year"], cell_style),
                Paragraph(f"${row['tam_usd_bn']:.2f}B", cell_right),
                Paragraph(f"${row['pv_usd_bn']:.2f}B", cell_right),
                Paragraph(f"${row['cv_usd_bn']:.2f}B", cell_right),
                Paragraph(f"${row['ev_usd_bn']:.2f}B", cell_right),
                Paragraph(f"${row['sam_usd_bn']:.2f}B", cell_right),
                Paragraph(f"${row['som_usd_m']:.1f}M", cell_right),
                Paragraph(f"{row['som_share_of_sam_pct']:.2f}%", cell_right),
            ]
        )
    ms_table = Table(ms_rows, colWidths=[20 * mm, 23 * mm, 19 * mm, 19 * mm, 19 * mm, 28 * mm, 25 * mm, 21 * mm])
    ms_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    # Fix header text color inside Paragraph objects
    ms_rows[0] = [
        Paragraph(f"<font color='white'><b>{lbl}</b></font>", cell_style)
        for lbl in ["Fiscal Year", "Total TAM ($B)", "PV ($B)", "CV ($B)", "EV ($B)", "SAM ($B)", "SOM ($M)", "SOM % SAM"]
    ]
    ms_table = Table(ms_rows, colWidths=[20 * mm, 23 * mm, 19 * mm, 19 * mm, 19 * mm, 28 * mm, 25 * mm, 21 * mm])
    ms_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(ms_table)

    # --- SECTION 2: 5-YEAR FINANCIAL MODEL & SCENARIO COMPARISON ---
    story.append(PageBreak())
    story.append(Paragraph(f"2. Five-Year Financial Forecast & Scenario Comparison ({scenario_name})", h2_style))
    story.append(
        Paragraph(
            f"All financial outputs are derived live from Pandas/NumPy models using Indian corporate tax under "
            f"Section 115BAA ({active_financials['assumptions']['corporate_tax_rate_pct']:.2f}% [SRC-09]), "
            f"FX benchmarks of INR {usd_inr:.1f}/USD and INR {jpy_inr:.2f}/JPY [SRC-06], initial CAPEX of "
            f"{_fmt_money(fin_s['initial_capex_usd_m'], display_currency, usd_inr, jpy_inr)}, and a "
            f"{fin_s['wacc_pct']:.1f}% WACC hurdle rate.",
            body_style,
        )
    )

    pnl = active_financials["income_statement"]
    cf = active_financials["cash_flow_statement"]
    years_hdr = [row["fiscal_year"] for row in pnl]
    fin_rows = [
        [Paragraph("<font color='white'><b>Line Item (" + display_currency + ")</b></font>", cell_style)]
        + [Paragraph(f"<font color='white'><b>{y}</b></font>", ParagraphStyle("HR", parent=cell_style, alignment=TA_RIGHT)) for y in years_hdr]
    ]

    def _row(label: str, key: str, source_list: list[dict[str, Any]], is_pct: bool = False, bold: bool = False):
        lbl_p = Paragraph(f"<b>{label}</b>" if bold else label, cell_style)
        vals = []
        for item in source_list:
            v = item[key]
            txt = f"{v:.1f}%" if is_pct else _fmt_money(v, display_currency, usd_inr, jpy_inr)
            vals.append(Paragraph(f"<b>{txt}</b>" if bold else txt, cell_right))
        fin_rows.append([lbl_p] + vals)

    _row("Total Revenue", "revenue_usd_m", pnl, bold=True)
    _row("Total COGS (Material + Labor/OH)", "total_cogs_usd_m", pnl)
    _row("Gross Profit", "gross_profit_usd_m", pnl, bold=True)
    _row("Gross Margin (%)", "gross_margin_pct", pnl, is_pct=True)
    _row("EBITDA", "ebitda_usd_m", pnl, bold=True)
    _row("EBITDA Margin (%)", "ebitda_margin_pct", pnl, is_pct=True)
    _row("EBIT (Operating Profit)", "ebit_usd_m", pnl)
    _row("Corporate Tax (Sec 115BAA)", "tax_usd_m", pnl)
    _row("Net Income (PAT)", "net_income_usd_m", pnl, bold=True)
    _row("Free Cash Flow to Firm (FCFF)", "fcff_usd_m", cf, bold=True)
    _row("Cumulative Cash Flow (incl. Y0 CAPEX)", "cumulative_fcf_usd_m", cf)

    fin_table = Table(fin_rows, colWidths=[64 * mm] + [22 * mm] * 5)
    fin_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(fin_table)
    story.append(Spacer(1, 10))

    # Scenario Comparison Table
    story.append(Paragraph("Scenario Stress-Test Comparison (Conservative vs Base vs Optimistic)", h3_style))
    sc_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["Scenario", "5-Yr Rev", "Y5 EBITDA %", "Init. Invest.", "NPV (Incl. TV)", "IRR (%)", "5-Yr ROI %", "Payback"]
        ]
    ]
    for sc in scenarios_comparison[:4]:
        s = sc["summary"]
        sc_rows.append(
            [
                Paragraph(f"<b>{sc['name']}</b>", cell_style),
                Paragraph(_fmt_money(s["cumulative_5yr_revenue_usd_m"], display_currency, usd_inr, jpy_inr), cell_right),
                Paragraph(f"{s['year5_ebitda_margin_pct']:.1f}%", cell_right),
                Paragraph(_fmt_money(s["total_initial_investment_usd_m"], display_currency, usd_inr, jpy_inr), cell_right),
                Paragraph(f"<b>{_fmt_money(s['npv_usd_m'], display_currency, usd_inr, jpy_inr)}</b>", cell_right),
                Paragraph(f"{s['irr_pct']:.1f}%" if s["irr_pct"] is not None else "N/A", cell_right),
                Paragraph(f"{s['roi_5yr_pct']:.1f}%", cell_right),
                Paragraph(f"{s['simple_payback_years']:.2f} yrs" if s["simple_payback_years"] is not None else ">5 yrs", cell_right),
            ]
        )
    sc_table = Table(sc_rows, colWidths=[36 * mm, 21 * mm, 18 * mm, 21 * mm, 23 * mm, 16 * mm, 19 * mm, 20 * mm])
    sc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(sc_table)
    story.append(Spacer(1, 10))

    # --- SECTION 3: ENTRY STRATEGY MATRIX & COMPETITIVE POSITIONING ---
    story.append(Paragraph("3. Market Entry Mode Evaluation & Target Regions", h2_style))
    st_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["Rank", "Entry Strategy", "Typical CAPEX", "Time to SOP", "Weighted Score"]
        ]
    ]
    for strat in strategy_eval["ranked_strategies"]:
        st_rows.append(
            [
                Paragraph(f"<b>#{strat['rank']}</b>", cell_style),
                Paragraph(f"<b>{strat['name']}</b>", cell_style),
                Paragraph(strat["typical_capex_usd_m"], cell_style),
                Paragraph(strat["time_to_sop_months"], cell_style),
                Paragraph(f"<b>{strat['weighted_score']:.2f} / 10</b>", cell_right),
            ]
        )
    st_table = Table(st_rows, colWidths=[14 * mm, 76 * mm, 32 * mm, 28 * mm, 24 * mm])
    st_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#E8F4F4")),
                ("ROWBACKGROUNDS", (0, 2), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(st_table)
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            f"<b>Primary Target Cluster:</b> {top_cluster['name']} (Composite Fit Score {top_cluster['composite_fit_score']}/10) — "
            f"{top_cluster['strategic_fit_note']} Secondary expansion nodes: "
            f"{recommendation['target_regions'][1]['name']} and {recommendation['target_regions'][2]['name']}.",
            body_style,
        )
    )

    # Top Competitors Snapshot
    story.append(Paragraph("Selected Competitor Benchmark Snapshot (Audited FY25 / CY25 Filings)", h3_style))
    comp_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["Company", "Origin", "FY25 Rev (INR Cr)", "Margin", "Positioning", "Src"]
        ]
    ]
    for c in competitors[:8]:
        comp_rows.append(
            [
                Paragraph(f"<b>{c['name']}</b>", cell_style),
                Paragraph(c["origin_group"], cell_style),
                Paragraph(f"{c['revenue_inr_cr']:,.0f}", cell_right),
                Paragraph(f"{c['margin_pct']:.1f}% {c['margin_metric']}", cell_right),
                Paragraph(c["pricing_positioning"], cell_style),
                Paragraph(c["source_id"], cell_style),
            ]
        )
    comp_table = Table(comp_rows, colWidths=[50 * mm, 26 * mm, 25 * mm, 23 * mm, 38 * mm, 12 * mm])
    comp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(comp_table)

    # --- PAGE 3: RISK MITIGATION, 3-YEAR ROADMAP & VERIFIED SOURCES ---
    story.append(PageBreak())
    story.append(Paragraph("4. Key Risks & Mitigation Playbook", h2_style))
    rs = risk_analysis["summary"]
    story.append(
        Paragraph(
            f"The risk register evaluates <b>{rs['total_risks']} risks</b> across 6 domains. Structured mitigation "
            f"(budgeted at <b>{_fmt_money(rs['total_mitigation_cost_usd_m'], display_currency, usd_inr, jpy_inr)}</b>) "
            f"reduces average risk exposure from <b>{rs['avg_inherent_score']:.1f}/25</b> (inherent) to "
            f"<b>{rs['avg_residual_score']:.1f}/25</b> (residual, -{rs['avg_risk_reduction_pct']:.1f}% reduction).",
            body_style,
        )
    )
    risk_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["ID", "Category", "Top Risk Factor", "Inh.", "Res.", "Mitigation Summary"]
        ]
    ]
    for r in risk_analysis["risks"][:6]:
        risk_rows.append(
            [
                Paragraph(f"<b>{r['risk_code']}</b>", cell_style),
                Paragraph(r["category"], cell_style),
                Paragraph(r["title"], cell_style),
                Paragraph(f"{r['inherent_score']}", cell_right),
                Paragraph(f"{r['residual_score']}", cell_right),
                Paragraph(r["mitigation_strategy"], cell_style),
            ]
        )
    risk_table = Table(risk_rows, colWidths=[12 * mm, 22 * mm, 42 * mm, 11 * mm, 11 * mm, 76 * mm])
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(risk_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("5. Three-Year Implementation Roadmap (2027–2029)", h2_style))
    rm_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["Phase & Window", "Workstream", "Key Deliverables & Stage Gate"]
        ]
    ]
    for step in recommendation["roadmap"]:
        bullets = "<br/>".join([f"• {m}" for m in step["key_milestones"]])
        rm_rows.append(
            [
                Paragraph(f"<b>{step['phase']}</b><br/><font color='#52606D'>{step['window']}</font>", cell_style),
                Paragraph(step["workstream"], cell_style),
                Paragraph(f"{bullets}<br/><b>{step['stage_gate']}</b>", cell_style),
            ]
        )
    rm_table = Table(rm_rows, colWidths=[42 * mm, 34 * mm, 98 * mm])
    rm_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(rm_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("6. Primary Source Register & Data Provenance Notice", h2_style))
    story.append(
        Paragraph(
            "External macroeconomic, industry, regulatory, and competitor metrics are sourced exclusively from verified "
            "public institutional publications listed below. Client-specific commercial targets, CAPEX envelopes, and "
            "operational ramp curves are clearly labeled illustrative assumptions adjustable within the live platform.",
            small_style,
        )
    )
    story.append(Spacer(1, 4))
    src_rows = [
        [
            Paragraph(f"<font color='white'><b>{c}</b></font>", cell_style)
            for c in ["ID", "Organization", "Report / Filing & Period", "Reference URL"]
        ]
    ]
    for s in sources[:12]:
        src_rows.append(
            [
                Paragraph(f"<b>{s['source_id']}</b>", cell_style),
                Paragraph(s["organization"], cell_style),
                Paragraph(f"{s['title']} ({s['publication_date']})", cell_style),
                Paragraph(s["url"], small_style),
            ]
        )
    src_table = Table(src_rows, colWidths=[14 * mm, 46 * mm, 70 * mm, 44 * mm])
    src_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(src_table)

    doc.build(story, onFirstPage=_add_header_footer, onLaterPages=_add_header_footer)
    return buffer.getvalue()
