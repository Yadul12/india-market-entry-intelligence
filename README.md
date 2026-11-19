# India Market Entry & Strategic Growth Intelligence

A production-quality management consulting decision-support platform designed for evaluating **India market entry for a Japanese automotive components manufacturer** (illustrative client: *Nippon Precision Mobility Corp.*).

Built with **React + TypeScript + Vite + Recharts + Tailwind CSS** on the frontend and **Python + FastAPI + Pandas + NumPy + SQLAlchemy + PostgreSQL + ReportLab** on the analytical backend.

---

## Core Analytical Capabilities

| Section | Application Page | Capabilities |
| :--- | :--- | :--- |
| **A** | **Executive Summary** | Dynamic Go / Conditional Go / Defer verdict derived live from financial & MCDA engines, 5-KPI institutional strip, cash-flow payback chart, entry mode ranking, cross-scenario comparison, and one-click Executive PDF report export. |
| **B** | **Market Intelligence** | Verified ACMA FY20–FY26 industry turnover (`$85.9B` FY26), SIAM FY25/FY26 PV/CV/EV/2W volumes, structural demand drivers with segment filters, MHI policies (PLI-Auto, PM E-DRIVE, PLI-ACC), BEE CAFE-III, MoRTH BS6.2 & Bharat NCAP 2.0, Sec 115BAA tax (`25.17%`), and regional automotive clusters. |
| **C** | **TAM / SAM / SOM Analysis** | Interactive Pandas/NumPy market sizing workbench anchored to ACMA FY26 turnover with adjustable segment CAGRs, toggleable product category scope, Tier-1 precision addressability filter, export hub uplift, S-curve/linear/back-loaded SOM ramp, CSV export, and DB persistence. |
| **D** | **Competitor Benchmarking** | Audited FY25/CY25 peer benchmarking across 12 real Indian domestic, European MNC, and Japanese Tier-1 competitors (SAMIL, Bosch India, Bharat Forge, Uno Minda, Endurance, Schaeffler India, Gabriel, ZF CV India, Sona Comstar, Subros, JTEKT India, Denso India), positioning map, archetype comparison, and white-space gap analysis. |
| **E** | **Financial Modelling** | Five-year (FY27–FY31) P&L, Working Capital (DSO/DIO/DPO), CAPEX & depreciation, Sec 115BAA tax with statutory loss carryforward, FCFF, DCF NPV (explicit 5-year + terminal value bridge), IRR, simple & discounted payback, 5-year ROI, ROCE, operating break-even, multi-currency display (`USD` / `INR` / `JPY`), Save As New Case, and CSV export. |
| **F** | **Scenario & Sensitivity** | Side-by-side Conservative, Base, Optimistic, and custom saved scenarios; dynamic one-way **Tornado sensitivity** across 6 value drivers; and **2D WACC × Year-1 COGS NPV/IRR sensitivity matrix**. |
| **G** | **Risk Assessment** | 12-item enterprise risk register spanning Regulatory, Competitive, Supply-Chain, Currency, Demand, and Operational domains; interactive **5×5 Probability–Impact Matrix** with Inherent vs. Residual toggle, inline score updates, custom risk creation, and budgeted mitigation playbook. |
| **H** | **Market Entry Recommendation** | Editable **Weighted Multi-Criteria Decision Matrix (MCDA)** comparing Greenfield WOS, Majority JV, Brownfield Acquisition, and Strategic Partnership; plus structured executive recommendation, preferred customer segments, ranked target regions, capital envelope, and 3-year stage-gated implementation roadmap (2027–2029). |
| **I** | **Sources & Methodology** | Transparent Source Register (`SRC-01` to `SRC-16`) with institutional URLs, dates, extracted metrics, explicit `SOURCED` / `ASSUMPTION` / `DERIVED` provenance audit, and mathematical formulas. |

---

## Data Integrity & Provenance Model

Every figure in the platform is explicitly tagged:
- **`SOURCED`** — Verified public statistics from ACMA, SIAM, Ministry of Heavy Industries (MHI), IBEF, RBI, World Bank, BEE/MoRTH, Income Tax India, and audited FY25/CY25 public company filings.
- **`ASSUMPTION`** — Clearly labeled illustrative client inputs and consulting parameters that users can modify and persist.
- **`DERIVED`** — Computed deterministically on the Python (`pandas` + `numpy`) backend from sourced baselines and active assumptions.

---

## Architecture

```text
india-market-entry-intelligence/
├── .env.example              # Environment configuration (PostgreSQL / SQLite fallback, CORS, API URL)
├── docker-compose.yml        # Full-stack PostgreSQL 16 + FastAPI + Vite deployment
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── analytics/        # Pure Pandas/NumPy engines (market_sizing, financial_model, sensitivity, entry_strategy, risk_engine)
│   │   ├── data/             # Verified public research datasets, competitors, source register, baseline scenarios
│   │   ├── db/               # SQLAlchemy 2.0 ORM models, database connector, idempotent seeder
│   │   ├── reports/          # ReportLab multi-page Executive PDF report generator
│   │   ├── routers/          # Modular FastAPI route handlers
│   │   └── schemas/          # Strict Pydantic v2 validation schemas
│   └── tests/                # Pytest suite (accounting identities, IRR/NPV/payback, market sizing, MCDA, API + PDF)
└── frontend/
    ├── package.json
    └── src/
        ├── components/       # Layout shell & institutional UI primitives
        ├── context/          # Active scenario, currency switcher (USD/INR/JPY), PDF export
        ├── pages/            # 9 dedicated consulting pages (A through I)
        ├── services/         # Typed API client
        ├── types/            # Strict TypeScript interfaces
        └── utils/            # Currency formatters & CSV export
```

---

## Setup & Running Locally

### Option 1: Docker Compose (with PostgreSQL 16)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API & Swagger Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432` (`india_market_entry`)

### Option 2: Local Development (Python venv + Node.js)

#### 1. Backend (FastAPI + Pandas/NumPy)
Configure `.env` with `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/india_market_entry` if running PostgreSQL locally, or leave default SQLite fallback (`sqlite:///./data/india_market_entry.db`) for zero-setup execution.

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# macOS / Linux:
# .venv/bin/pip install -r requirements.txt
# .venv/bin/uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React + TypeScript + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests automatically to `http://127.0.0.1:8000`.

---

## Verification & Automated Tests

### Backend Financial & API Tests (`pytest`)

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

Validates:
- Exact IRR root-finding and fractional payback interpolation
- Accounting identities (`Revenue = Domestic + Export`, `Gross Profit = Revenue - COGS`, `EBIT = EBITDA - D&A`, `PAT = EBIT - Tax`, `FCFF = NOPAT + D&A - ΔNWC - CAPEX`, `NWC = AR + Inv - AP`)
- Tax loss carryforward behavior (zero negative tax distortion)
- Conservative < Base < Optimistic monotonicity
- Tornado and 2D WACC × COGS sensitivity monotonicity
- TAM > SAM > SOM hierarchy and CAGR accuracy
- MCDA weight auto-normalization and rank response
- End-to-end API endpoints and binary ReportLab PDF output

### Production Frontend Build

```bash
cd frontend
npm run build
```

---

## Deploying to Vercel

This repository is pre-configured for single-project full-stack deployment on Vercel:
- [vercel.json](vercel.json) builds the Vite frontend (`frontend/dist`) and routes `/api/*`, `/docs`, and `/openapi.json` to the Python Fluid Compute ASGI entrypoint at [api/index.py](api/index.py).
- [requirements.txt](requirements.txt) supplies the runtime Python packages (`fastapi`, `sqlalchemy`, `psycopg[binary]`, `pandas`, `numpy`, `reportlab`).
- **Database Persistence on Vercel**: Set `DATABASE_URL` (or connect a Marketplace PostgreSQL database such as Neon so `POSTGRES_URL` is injected) for durable cross-invocation persistence. If unset, the backend automatically uses writable `/tmp/india_market_entry.db` seeded with all verified baseline datasets on cold start.

