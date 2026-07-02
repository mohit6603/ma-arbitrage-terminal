# 🖥️ Arbitrage.Terminal — AI-Powered M&A Arbitrage & Deal Success Predictor

> **PGP Artificial Intelligence & Data Science · Group Project**  
> **Jio Institute · June 2026**

### 👥 Team Members
1. **Mohit Patle** (PGID: 27PGAI0102)
2. **Pushkar Brahmankar** (PGID: 27PGAI0100)

---

## 🔗 Live Deployments & Artifacts
* **🎯 Live Web Application:** [https://ma-arbitrage-terminal.vercel.app](https://ma-arbitrage-terminal.vercel.app)
* **⚙️ Live Backend API:** [https://ma-arbitrage-terminal.onrender.com](https://ma-arbitrage-terminal.onrender.com)
* **📄 Detailed Project Report (PDF):** [Project_Report.pdf](./Project_Report.pdf)
* **📊 Presentation Slide Deck (PPTX):** [Project_Presentation.pptx](./Project_Presentation.pptx)

---

## 📖 Project Overview
**Arbitrage.Terminal** is an interactive, Bloomberg-style web interface that helps quantitative analysts and hedge funds evaluate Merger Arbitrage deals. The platform integrates **six quantitative modules** to predict deal success, compute regulatory risks, run shareholder vote simulations, and perform AI-driven legal precedent checks.

---

## ⚡ Six Core Quantitative Modules

1. **📈 Module 1: Deal Success Prediction Engine**
   * Uses a 12-feature logistic ensemble model to output a success probability.
   * Features include Deal Size, HHI concentration changes, regulatory history, financing types, and board resistance.
   * Includes SHAP-style explainability rendering exactly how much each feature contributed to the final probability.
   
2. **📉 Module 2: Spread Forecasting**
   * Projects target stock price convergence toward the offer price using a mean-reverting time-series model (10% daily convergence).
   * Models forward volatility decay and computes **95% confidence bands** ($\pm 1.96\sigma$).
   
3. **⚖️ Module 3: Regulatory Risk Scoring**
   * Scores deals from 0 to 100 based on multi-jurisdictional reviews, HHI concentration flags, national security (CFIUS) concerns, and sector-specific scrutiny (e.g., Tech and Healthcare).

4. **🗳️ Module 4: Shareholder Vote Simulator**
   * Runs a **3,000-sample Monte Carlo simulation** modeling institutional (75% weight), retail (25% weight), and activist investor blocs to calculate approval probability and a 95% confidence interval.

5. **🌍 Module 5: Geopolitical Friction Index**
   * Computes friction metrics for cross-border deals using a 24-country index ranging from low-friction hubs like Singapore (0.18) to higher-friction regimes.

6. **🤖 Module 6: LLM Regulatory Precedent Analysis**
   * Integrates **Claude Sonnet 4.5** via a streaming Server-Sent Events (SSE) connection to act as an on-demand antitrust attorney.
   * Evaluates the deal against historical cases (e.g., Microsoft-Activision, Nvidia-Arm, Adobe-Figma).

---

## 🛠️ Technology Stack

### Backend
* **Python 3.11** with **FastAPI** (Async Web Service)
* **Motor** (Async MongoDB Driver)
* **NumPy & Pandas** (Monte Carlo simulations and spread forecasting)
* **Pydantic v2** (Strict data validation)
* **Anthropic Python SDK** (Claude Sonnet 4.5 connection)

### Frontend
* **React 19** SPA (Single Page Application)
* **TailwindCSS 3.4** (Data-dense terminal dashboard UI)
* **Recharts 3.6** (Financial price forecasting charts)
* **react-force-graph-2d** (Interactive deal ecosystem network graph)
* **Framer Motion** (Smooth transitions and typing indicators)

---

## 🚀 Local Installation & Setup

### Prerequisites
1. **Node.js** (v18+)
2. **Python** (v3.10+)
3. **MongoDB** (running locally at `mongodb://localhost:27017`)

---

### Step 1: Run the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your environment variables:
   Create a `.env` file in the `backend/` directory:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=ma_arbitrage
   LLM_API_KEY=your_anthropic_api_key
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn server:app --reload
   ```
   *(The server will start on `http://localhost:8000` and automatically seed your MongoDB with 30 synthetic deals).*

---

### Step 2: Run the Frontend UI
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run the development server:
   ```bash
   npm start
   ```
   *(The terminal interface will launch in your browser at `http://localhost:3000`).*

---

## ⚙️ Cloud Deployment Details

* **Database:** Hosted on **MongoDB Atlas** with a Free Tier (M0) cluster, configured with `0.0.0.0/0` under Network Access to allow secure cloud database connections.
* **Backend:** Deployed on **Render** as a Python Web Service. Set Environment Variables `MONGO_URL` and `DB_NAME`.
* **Frontend:** Hosted on **Vercel** with the Root Directory set to `frontend`, preset set to `Create React App`, and Install Command overridden with `npm install --legacy-peer-deps`. `REACT_APP_BACKEND_URL` is set to the Render backend URL.
