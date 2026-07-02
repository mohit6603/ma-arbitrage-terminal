"""FastAPI backend for AI-Powered M&A Arbitrage & Deal Success Predictor."""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from pathlib import Path
import os
import logging
import asyncio
import json
import hashlib
from datetime import datetime, timezone

from seed_data import get_seed_deals
from analytics import (
    predict_deal_success, regulatory_risk_score, shareholder_vote_simulator,
    geopolitical_friction, spread_forecast, fallback_recommendations,
    build_graph, portfolio_summary, REGULATOR_INFO,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
LLM_API_KEY = os.environ.get('LLM_API_KEY', '')

app = FastAPI(title="M&A Arbitrage Intelligence API", version="1.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============== Pydantic ==============
class ScenarioRequest(BaseModel):
    ftc_phase2: bool = False
    competing_bidder: bool = False
    activist_added: bool = False
    rate_shock_bps: int = 0
    vix_shock: float = 0.0
    horizon_days: int = 90


class RegulatoryQuery(BaseModel):
    deal_id: str
    question: str | None = None


# ============== Startup: seed deals ==============
@app.on_event("startup")
async def startup_seed():
    count = await db.deals.count_documents({})
    if count == 0:
        deals = get_seed_deals()
        await db.deals.insert_many(deals)
        logger.info(f"Seeded {len(deals)} M&A deals.")
    else:
        logger.info(f"DB contains {count} deals — skipping seed.")


# ============== Helpers ==============
async def _get_deal(deal_id: str) -> dict:
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(404, f"Deal {deal_id} not found")
    return deal


# ============== Routes ==============
@api_router.get("/")
async def root():
    return {"service": "M&A Arbitrage Intelligence API", "status": "operational"}


@api_router.get("/portfolio/summary")
async def get_portfolio_summary():
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    return portfolio_summary(deals)


@api_router.get("/deals")
async def list_deals():
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    enriched = []
    for d in deals:
        pred = predict_deal_success(d)
        reg = regulatory_risk_score(d)
        cur_spread = ((d["offer_price"] - d["current_price"]) / max(0.01, d["current_price"]) * 100
                      if d["current_price"] else 0)
        health = round(100 * pred["probability"] * (1 - 0.5 * reg["score"] / 100), 1)
        enriched.append({
            "id": d["id"], "target": d["target_name"], "target_ticker": d["target_ticker"],
            "acquirer": d["acquirer_name"], "acquirer_ticker": d["acquirer_ticker"],
            "deal_value_b": d["deal_value_b"], "payment": d["payment"], "sector": d["sector"],
            "announce_date": d["announce_date"], "expected_close": d["expected_close"],
            "status": d["status"], "regulators": d["regulators"],
            "offer_price": d["offer_price"], "current_price": d["current_price"],
            "spread_pct": round(cur_spread, 2),
            "success_prob": pred["probability"],
            "reg_risk_score": reg["score"],
            "deal_health_score": health,
        })
    return {"deals": enriched, "count": len(enriched)}


@api_router.get("/deals/{deal_id}")
async def get_deal_detail(deal_id: str):
    d = await _get_deal(deal_id)
    pred = predict_deal_success(d)
    reg = regulatory_risk_score(d)
    vote = shareholder_vote_simulator(d)
    geo = geopolitical_friction(d)
    spread = spread_forecast(d)
    fallback = fallback_recommendations(d)
    cur_spread = ((d["offer_price"] - d["current_price"]) / max(0.01, d["current_price"]) * 100
                  if d["current_price"] else 0)
    health = round(100 * pred["probability"] * (1 - 0.5 * reg["score"] / 100), 1)
    return {
        "deal": d,
        "success_prediction": pred,
        "regulatory_risk": reg,
        "shareholder_vote": vote,
        "geopolitical": geo,
        "spread": spread,
        "fallback": fallback,
        "current_spread_pct": round(cur_spread, 2),
        "deal_health_score": health,
    }


@api_router.get("/deals/{deal_id}/graph")
async def get_deal_graph(deal_id: str):
    d = await _get_deal(deal_id)
    return build_graph(d)


@api_router.post("/deals/{deal_id}/scenario")
async def run_scenario(deal_id: str, req: ScenarioRequest):
    d = await _get_deal(deal_id)
    scenarios = req.model_dump()
    base = predict_deal_success(d)
    # Apply scenario shocks to features (clone)
    d2 = dict(d)
    if req.ftc_phase2:
        d2["governance_resistance"] = min(1.0, d["governance_resistance"] + 0.20)
        d2["hhi_change"] = d["hhi_change"] + 150
    if req.competing_bidder:
        d2["competing_bidder_prob"] = min(1.0, d["competing_bidder_prob"] + 0.30)
    if req.activist_added:
        d2["activist_intensity"] = min(1.0, d["activist_intensity"] + 0.25)
    if req.rate_shock_bps:
        d2["acquirer_dte"] = d["acquirer_dte"] + req.rate_shock_bps / 500.0
        d2["financing_certainty"] = max(0.1, d["financing_certainty"] - req.rate_shock_bps / 1500.0)
    scenario_pred = predict_deal_success(d2)
    scenario_reg = regulatory_risk_score(d2)
    scenario_vote = shareholder_vote_simulator(d2)
    scenario_spread = spread_forecast(d, horizon_days=req.horizon_days, scenarios=scenarios)
    return {
        "baseline": {"success_prob": base["probability"]},
        "scenario": {
            "success_prob": scenario_pred["probability"],
            "delta_success": round(scenario_pred["probability"] - base["probability"], 4),
            "reg_risk_score": scenario_reg["score"],
            "vote_approval_prob": scenario_vote["approval_probability"],
            "attributions": scenario_pred["attributions"],
        },
        "spread": scenario_spread,
        "applied": scenarios,
    }


@api_router.get("/regulators")
async def get_regulators():
    return {"regulators": REGULATOR_INFO}


@api_router.get("/news-feed")
async def news_feed():
    """Synthetic ticker-style news feed."""
    deals = await db.deals.find({"status": "Pending"}, {"_id": 0}).limit(20).to_list(20)
    now = datetime.now(timezone.utc)
    items = []
    templates = [
        ("REGULATORY", "{reg} signals Phase II review for {acq}/{tgt}"),
        ("MARKET", "{tgt} spread widens to {spread:.2f}% on regulatory chatter"),
        ("ACTIVIST", "Hedge fund discloses 4.9% stake in {tgt}, demands higher bid"),
        ("CROSS-BORDER", "{geo} authorities request additional remedies for {acq}/{tgt}"),
        ("RUMOR", "Sources: rival bidder may enter {tgt} contest"),
    ]
    import random as _r
    rng = _r.Random(int(now.timestamp()) // 60)
    for i, d in enumerate(deals[:15]):
        tmpl_kind, tmpl = rng.choice(templates)
        reg = rng.choice(d["regulators"]) if d["regulators"] else "FTC"
        spread = ((d["offer_price"] - d["current_price"]) / max(0.01, d["current_price"]) * 100
                  if d["current_price"] else 0)
        items.append({
            "ts": (now.timestamp() - i * 60 - rng.randint(0, 90)),
            "kind": tmpl_kind,
            "deal_id": d["id"],
            "text": tmpl.format(reg=reg, acq=d["acquirer_ticker"], tgt=d["target_ticker"],
                                spread=abs(spread), geo=d["target_country"]),
        })
    items.sort(key=lambda x: -x["ts"])
    return {"items": items}


# ============== LLM Regulatory Analysis (Streaming SSE) ==============
@api_router.post("/regulatory/analyze")
async def regulatory_analyze(req: RegulatoryQuery):
    """Stream Claude Sonnet 4.5 regulatory analysis via SSE."""
    d = await _get_deal(req.deal_id)
    reg = regulatory_risk_score(d)
    pred = predict_deal_success(d)

    system_msg = (
        "You are a senior M&A antitrust attorney and regulatory analyst at a top-tier hedge fund. "
        "Provide concise, expert analysis grounded in real regulatory precedent (US FTC/DOJ, EU EC, UK CMA, "
        "China SAMR, India CCI, CFIUS). Cite specific historical cases where relevant (e.g., Microsoft-Activision, "
        "Nvidia-Arm, Adobe-Figma, Kroger-Albertsons). Use markdown bullet structure. Be decisive and quantitative."
    )
    user_q = req.question or (
        f"Analyze the regulatory and antitrust risk profile of {d['acquirer_name']} acquiring "
        f"{d['target_name']} (${d['deal_value_b']}B, {d['payment']}, sector: {d['sector']}). "
        f"Regulators: {', '.join(d['regulators'])}. HHI Δ: {d['hhi_change']}. "
        f"Cross-border: {d['acquirer_country']} → {d['target_country']}. "
        f"Our quant models put deal success probability at {pred['probability']*100:.1f}% "
        f"and regulatory risk score at {reg['score']:.0f}/100. "
        "Provide: (1) top 3 antitrust concerns, (2) precedent cases, (3) likely remedies/divestitures, "
        "(4) timeline estimate, (5) overall recommendation (Hold / Buy spread / Avoid)."
    )

    async def event_generator():
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
            chat = LlmChat(
                api_key=LLM_API_KEY,
                session_id=f"reg-{d['id']}-{hashlib.md5(user_q.encode()).hexdigest()[:8]}",
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            async for ev in chat.stream_message(UserMessage(text=user_q)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
        except Exception as e:
            logger.exception("LLM streaming error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ============== Mount router ==============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
