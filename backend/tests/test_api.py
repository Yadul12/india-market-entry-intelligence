"""End-to-end API integration tests using FastAPI TestClient (including PDF generation)."""

from fastapi.testclient import TestClient

from app.main import app


def test_api_end_to_end_flow():
    with TestClient(app) as client:
        # 1. Health & Executive Summary
        h = client.get("/api/health")
        assert h.status_code == 200
        assert h.json()["status"] == "ok"

        exec_res = client.get("/api/executive-summary")
        assert exec_res.status_code == 200
        exec_data = exec_res.json()
        assert exec_data["recommendation"]["verdict_code"] in {"GO", "CONDITIONAL_GO", "DEFER"}
        assert exec_data["market_sizing_summary"]["fy26_tam_usd_bn"] == 85.9

        # 2. Market Intelligence & Sizing
        mi = client.get("/api/market/intelligence")
        assert mi.status_code == 200
        assert len(mi.json()["regulatory_policies"]) >= 6
        assert len(mi.json()["automotive_clusters"]) >= 5

        ms = client.get("/api/market/sizing")
        assert ms.status_code == 200
        assert len(ms.json()["forecast_series"]) == 5

        # 3. Competitors
        comp = client.get("/api/competitors?origin=Japanese%20Peer")
        assert comp.status_code == 200
        assert len(comp.json()["competitors"]) == 3

        # 4. Scenarios & Sensitivity
        sc = client.get("/api/financials/scenarios")
        assert sc.status_code == 200
        assert len(sc.json()["scenarios"]) >= 3

        sens = client.get("/api/financials/sensitivity?scenario_slug=base")
        assert sens.status_code == 200
        assert len(sens.json()["tornado"]["drivers"]) == 6
        assert len(sens.json()["two_way"]["matrix"]) == 5

        # 5. Strategy & Risks
        st = client.get("/api/strategy")
        assert st.status_code == 200
        assert len(st.json()["decision_matrix"]["ranked_strategies"]) == 4

        rk = client.get("/api/risks")
        assert rk.status_code == 200
        assert rk.json()["summary"]["total_risks"] >= 12

        # 6. Sources & Methodology
        src = client.get("/api/sources")
        assert src.status_code == 200
        assert src.json()["total_sources"] >= 16

        # 7. Executive PDF Export
        pdf = client.post("/api/reports/executive-pdf", json={"scenario_slug": "base", "display_currency": "USD"})
        assert pdf.status_code == 200
        assert pdf.headers["content-type"] == "application/pdf"
        assert pdf.content.startswith(b"%PDF-")
        assert len(pdf.content) > 5000
