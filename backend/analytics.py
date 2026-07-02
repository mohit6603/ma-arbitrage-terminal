"""Quantitative analytics for M&A deal arbitrage system.

Implements (simulated, transparent ML-style heuristics for demo):
- Deal Success Prediction Engine (logistic ensemble)
- Spread Forecasting (autoregressive + scenario shock)
- Regulatory Risk Score
- Shareholder Vote Simulator
- Geopolitical Friction Score
- Fallback Recommendations
- SHAP-style feature attributions
"""
from __future__ import annotations
import math
import random
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

# Country risk indices (higher = friction)
COUNTRY_FRICTION = {
    "US": 0.15, "CA": 0.10, "GB": 0.12, "DE": 0.14, "FR": 0.15, "ES": 0.15,
    "IT": 0.18, "JP": 0.20, "AU": 0.12, "IN": 0.30, "CN": 0.85, "TW": 0.45,
    "HK": 0.55, "BR": 0.35, "MX": 0.30, "RU": 0.95, "IL": 0.30, "PL": 0.22,
    "KR": 0.25, "SG": 0.18, "ZA": 0.32, "AE": 0.25, "SA": 0.30,
}
REGULATOR_INFO = {
    "FTC": {"region": "US", "color": "#FF3B30", "strictness": 0.80},
    "DOJ": {"region": "US", "color": "#FF3B30", "strictness": 0.78},
    "CFIUS": {"region": "US", "color": "#FF6B00", "strictness": 0.90},
    "FRB":  {"region": "US", "color": "#FF3B30", "strictness": 0.65},
    "OCC":  {"region": "US", "color": "#FF3B30", "strictness": 0.60},
    "EC":   {"region": "EU", "color": "#00B8D4", "strictness": 0.75},
    "CMA":  {"region": "UK", "color": "#00B8D4", "strictness": 0.85},
    "SAMR": {"region": "CN", "color": "#FFB300", "strictness": 0.92},
    "CCI":  {"region": "IN", "color": "#00E676", "strictness": 0.55},
    "NCLT": {"region": "IN", "color": "#00E676", "strictness": 0.50},
    "SEBI": {"region": "IN", "color": "#00E676", "strictness": 0.55},
    "JFTC": {"region": "JP", "color": "#FFB300", "strictness": 0.65},
    "CADE": {"region": "BR", "color": "#FFB300", "strictness": 0.60},
    "FIRB": {"region": "AU", "color": "#FFB300", "strictness": 0.70},
    "STB":  {"region": "US", "color": "#FF6B00", "strictness": 0.55},
    "OSFI": {"region": "CA", "color": "#FFB300", "strictness": 0.60},
    "SACC": {"region": "ZA", "color": "#FFB300", "strictness": 0.55},
    "UOKiK":{"region": "PL", "color": "#FFB300", "strictness": 0.50},
    "CFPB": {"region": "US", "color": "#FF6B00", "strictness": 0.60},
    "CFIUS-EU": {"region": "EU", "color": "#00B8D4", "strictness": 0.75},
    "ExxonArbitration": {"region": "Private", "color": "#A3A3A3", "strictness": 0.40},
}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def regulator_strictness(reg: str) -> float:
    return REGULATOR_INFO.get(reg, {"strictness": 0.55})["strictness"]


def predict_deal_success(deal: dict) -> dict:
    """Logistic ensemble approximation. Returns probability + SHAP-style attributions."""
    # Feature engineering
    size_pen = -0.015 * math.log1p(deal["deal_value_b"]) - 0.10 * (1 if deal["deal_value_b"] > 30 else 0)
    hhi_pen = -0.0018 * max(0, deal["hhi_change"] - 100)
    regs = deal.get("regulators", [])
    reg_pen = -0.35 * sum(regulator_strictness(r) for r in regs) / max(1, len(regs)) - 0.08 * max(0, len(regs) - 2)
    cross_border = 0
    if deal["acquirer_country"] != deal["target_country"].split("/")[0]:
        cross_border = -0.30
    friction = -0.55 * (COUNTRY_FRICTION.get(deal["acquirer_country"], 0.20) +
                       COUNTRY_FRICTION.get(deal["target_country"].split("/")[0], 0.20)) / 2
    governance = -0.85 * deal["governance_resistance"] - 1.10 * deal["management_resistance"]
    financing = 0.85 * deal["financing_certainty"]
    history = 0.70 * (deal["prior_deal_success_rate"] - 0.5)
    payment_boost = 0.18 if deal["payment"] == "Cash" else (0.05 if "Cash" in deal["payment"] else -0.05)
    competing = -0.40 * deal["competing_bidder_prob"]
    activist = -0.55 * deal["activist_intensity"]
    leverage = -0.18 * max(0, deal["acquirer_dte"] - 2.0)

    logit = (1.40 + size_pen + hhi_pen + reg_pen + cross_border + friction
             + governance + financing + history + payment_boost + competing + activist + leverage)
    prob = _sigmoid(logit)

    # SHAP-style attributions (relative contribution magnitudes)
    contribs = {
        "Deal Size": size_pen, "HHI / Concentration": hhi_pen,
        "Regulatory Burden": reg_pen, "Cross-Border": cross_border,
        "Country Friction": friction, "Governance Resistance": governance,
        "Financing Certainty": financing, "Acquirer Track Record": history,
        "Payment Mix": payment_boost, "Competing Bidder Risk": competing,
        "Activist Pressure": activist, "Acquirer Leverage": leverage,
    }
    return {"probability": round(prob, 4), "logit": round(logit, 3), "attributions": contribs}


def regulatory_risk_score(deal: dict) -> dict:
    """0-100 score. Higher = riskier. Returns explainable factors."""
    regs = deal.get("regulators", [])
    base = 25 + 6 * len(regs)
    base += min(40, 0.05 * deal["hhi_change"])
    if deal["hhi_change"] > 200:
        base += 8
    if deal["hhi_change"] > 600:
        base += 12
    sector = deal["sector"].lower()
    sector_boost = 0
    if "semiconductor" in sector or "tech" in sector or "cybersec" in sector:
        sector_boost += 10
    if "pharma" in sector or "biotech" in sector:
        sector_boost += 8
    if "healthcare" in sector or "insurance" in sector:
        sector_boost += 12
    if "media" in sector:
        sector_boost += 6
    if "energy" in sector:
        sector_boost += 5
    base += sector_boost
    if "SAMR" in regs: base += 8
    if "CFIUS" in regs: base += 10
    if "CMA" in regs:  base += 5
    if deal["acquirer_country"] != deal["target_country"].split("/")[0]:
        base += 6
    base = max(0, min(100, base))

    factors = [
        {"label": f"Multi-jurisdictional review ({len(regs)} authorities)", "impact": min(25, 4 + 4*len(regs))},
        {"label": f"HHI ΔConcentration: +{deal['hhi_change']}", "impact": round(min(40, 0.05 * deal['hhi_change']), 1)},
        {"label": f"Sector scrutiny: {deal['sector']}", "impact": sector_boost},
    ]
    if "SAMR" in regs:
        factors.append({"label": "SAMR (China) approval required — historically slow & politicized", "impact": 8})
    if "CFIUS" in regs:
        factors.append({"label": "CFIUS national security review", "impact": 10})
    if deal["hhi_change"] > 600:
        factors.append({"label": "Killer-acquisition / dominance concern (HHI Δ > 600)", "impact": 12})
    if deal["acquirer_country"] != deal["target_country"].split("/")[0]:
        factors.append({"label": f"Cross-border ({deal['acquirer_country']} → {deal['target_country']})", "impact": 6})
    return {"score": round(base, 1), "factors": factors}


def shareholder_vote_simulator(deal: dict, samples: int = 3000) -> dict:
    """Monte Carlo shareholder approval probability with 95% CI."""
    seed = int(hashlib.md5(deal["id"].encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    base_support = 0.62 + 0.30 * deal["prior_deal_success_rate"] - 0.35 * deal["management_resistance"]
    activist_drag = 0.20 * deal["activist_intensity"]
    payment_pref = 0.06 if deal["payment"] == "Cash" else (-0.04 if deal["payment"] == "Stock" else 0.02)
    successes = 0
    samples_arr = []
    for _ in range(samples):
        inst_vote = rng.gauss(base_support - activist_drag + payment_pref, 0.08)
        retail_vote = rng.gauss(base_support - 0.05, 0.12)
        weighted = 0.75 * inst_vote + 0.25 * retail_vote
        samples_arr.append(weighted)
        if weighted > 0.5:
            successes += 1
    prob = successes / samples
    samples_arr.sort()
    lo = samples_arr[int(0.025 * samples)]
    hi = samples_arr[int(0.975 * samples)]
    mean = sum(samples_arr) / samples
    return {
        "approval_probability": round(prob, 4),
        "mean_support_pct": round(mean * 100, 2),
        "ci_low_pct": round(lo * 100, 2),
        "ci_high_pct": round(hi * 100, 2),
        "blocs": [
            {"name": "BlackRock", "shares_pct": 7.2, "lean": "Support" if base_support > 0.55 else "Against"},
            {"name": "Vanguard",  "shares_pct": 8.5, "lean": "Support" if base_support > 0.55 else "Against"},
            {"name": "State Street","shares_pct": 4.3, "lean": "Support" if base_support > 0.50 else "Against"},
            {"name": "Activist Coalition", "shares_pct": round(8 + 14*deal["activist_intensity"],1),
             "lean": "Against" if deal["activist_intensity"] > 0.35 else "Neutral"},
            {"name": "Retail / Arb", "shares_pct": 22.0,
             "lean": "Support" if payment_pref > 0 else "Mixed"},
        ],
    }


def geopolitical_friction(deal: dict) -> dict:
    a = deal["acquirer_country"]
    t = deal["target_country"].split("/")[0]
    base = (COUNTRY_FRICTION.get(a, 0.25) + COUNTRY_FRICTION.get(t, 0.25)) * 50
    cross = 1.0 if a != t else 0.4
    score = base * (0.7 + 0.6 * cross)
    score = min(100, max(0, score))
    drivers = [
        {"label": f"Acquirer domicile: {a}", "value": round(COUNTRY_FRICTION.get(a, 0.25) * 100, 1)},
        {"label": f"Target domicile: {t}", "value": round(COUNTRY_FRICTION.get(t, 0.25) * 100, 1)},
        {"label": "Cross-border friction multiplier", "value": round(cross, 2)},
    ]
    return {"score": round(score, 1), "drivers": drivers}


def spread_forecast(deal: dict, horizon_days: int = 90, scenarios: dict | None = None) -> dict:
    """Generate spread history (past 60d) + forward projection with confidence band."""
    scenarios = scenarios or {}
    rng = random.Random(int(hashlib.md5(deal["id"].encode()).hexdigest()[:8], 16))
    success_p = predict_deal_success(deal)["probability"]
    # Adjust for scenarios
    if scenarios.get("ftc_phase2"):
        success_p *= 0.70
    if scenarios.get("competing_bidder"):
        success_p = max(0.20, success_p * 0.85)
    if scenarios.get("activist_added"):
        success_p *= (1 - 0.15)
    rate_shock = scenarios.get("rate_shock_bps", 0) / 10000.0
    vix_shock = scenarios.get("vix_shock", 0) / 100.0

    offer = deal["offer_price"] or 1.0
    cur = deal["current_price"] or (offer * 0.95)
    if cur <= 0:
        cur = offer * 0.95
    history = []
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=60)
    # Walk backward from current
    px = cur
    pts = []
    for d in range(0, 61):
        date = start + timedelta(days=d)
        # mean-revert toward (offer * success_p + cur*(1-success_p))
        anchor = offer * success_p + cur * (1 - success_p)
        px = px + 0.10 * (anchor - px) + rng.gauss(0, 0.5 + vix_shock * 4)
        spread_pct = (offer - px) / max(0.01, px) * 100
        pts.append({"date": date.isoformat(), "price": round(px, 2),
                    "spread_pct": round(spread_pct, 2), "type": "history"})
    history = pts
    # Forward
    forward = []
    px_fwd = history[-1]["price"]
    for d in range(1, horizon_days + 1):
        date = today + timedelta(days=d)
        anchor = offer * success_p
        decay = 0.04 + 0.005 * d / horizon_days
        px_fwd = px_fwd + decay * (anchor - px_fwd) - rate_shock * 1.5
        sigma = 0.6 + 0.02 * d + vix_shock * 5
        spread_pct = (offer - px_fwd) / max(0.01, px_fwd) * 100
        forward.append({
            "date": date.isoformat(),
            "price": round(px_fwd, 2),
            "price_low": round(px_fwd - 1.96 * sigma, 2),
            "price_high": round(px_fwd + 1.96 * sigma, 2),
            "spread_pct": round(spread_pct, 2),
            "type": "forecast",
        })
    cur_spread = (offer - cur) / max(0.01, cur) * 100
    risk_adj_return = (success_p * cur_spread) - (1 - success_p) * abs((cur - deal["target_price_pre"]) / max(0.01, cur) * 100)
    return {
        "history": history, "forecast": forward,
        "current_spread_pct": round(cur_spread, 2),
        "risk_adjusted_return_pct": round(risk_adj_return, 2),
        "success_prob_used": round(success_p, 4),
    }


def fallback_recommendations(deal: dict) -> dict:
    """Recommend remediation strategies for high-risk deals."""
    pred = predict_deal_success(deal)
    fail_p = 1 - pred["probability"]
    revised_offer = (deal["offer_price"] or 1.0) * (1 + 0.08 * fail_p)
    recs = [
        {"strategy": "Revised Offer Price",
         "detail": f"Raise offer from ${deal['offer_price']:.2f} → ${revised_offer:.2f} (+{(revised_offer/max(0.01,deal['offer_price'])-1)*100:.1f}%)",
         "expected_lift": round(0.06 * fail_p, 3)},
        {"strategy": "Divestiture Package",
         "detail": f"Carve out overlapping business units in {deal['sector'].split('/')[0].strip()} to reduce HHI Δ by ~{int(deal['hhi_change']*0.4)} bps",
         "expected_lift": round(0.09 * (deal['hhi_change']/1000), 3)},
        {"strategy": "Contingent Value Rights (CVRs)",
         "detail": "Add milestone-based CVRs tied to regulatory approvals — defers ~12% of consideration",
         "expected_lift": 0.04},
        {"strategy": "Termination Fee Optimization",
         "detail": f"Negotiate reverse termination fee at ${deal['deal_value_b']*0.04:.2f}B (4% of deal) to align acquirer commitment",
         "expected_lift": 0.02},
        {"strategy": "Alternative Targets (Plan B)",
         "detail": f"Identified 3 strategically similar targets in {deal['sector']} with HHI footprint <300 bps",
         "expected_lift": 0.0},
    ]
    return {"failure_probability": round(fail_p, 4), "recommendations": recs,
            "revised_offer_price": round(revised_offer, 2)}


def build_graph(deal: dict) -> dict:
    """Force-directed graph: nodes & edges of the deal ecosystem."""
    nodes = []
    links = []
    nodes.append({"id": deal["acquirer_ticker"], "label": deal["acquirer_name"], "type": "acquirer",
                  "color": "#00E5FF", "size": 22})
    nodes.append({"id": deal["target_ticker"], "label": deal["target_name"], "type": "target",
                  "color": "#00E676", "size": 20})
    links.append({"source": deal["acquirer_ticker"], "target": deal["target_ticker"],
                  "label": "ACQUIRES", "color": "#FFFFFF", "value": 4})
    for r in deal.get("regulators", []):
        info = REGULATOR_INFO.get(r, {"color": "#A3A3A3"})
        nodes.append({"id": r, "label": r, "type": "regulator", "color": info["color"], "size": 14})
        links.append({"source": r, "target": deal["target_ticker"], "label": "REVIEWS",
                      "color": info["color"], "value": 2})
    # Sector node
    sector = deal["sector"].split("/")[0].strip()
    nodes.append({"id": f"SECTOR-{sector}", "label": sector, "type": "sector",
                  "color": "#FFB300", "size": 12})
    links.append({"source": deal["acquirer_ticker"], "target": f"SECTOR-{sector}",
                  "label": "OPERATES_IN", "color": "#FFB300", "value": 1})
    links.append({"source": deal["target_ticker"], "target": f"SECTOR-{sector}",
                  "label": "OPERATES_IN", "color": "#FFB300", "value": 1})
    # Geography
    for c in {deal["acquirer_country"], deal["target_country"].split("/")[0]}:
        nodes.append({"id": f"GEO-{c}", "label": c, "type": "geo", "color": "#A3A3A3", "size": 10})
    links.append({"source": deal["acquirer_ticker"], "target": f"GEO-{deal['acquirer_country']}",
                  "label": "DOMICILED", "color": "#525252", "value": 1})
    links.append({"source": deal["target_ticker"], "target": f"GEO-{deal['target_country'].split('/')[0]}",
                  "label": "DOMICILED", "color": "#525252", "value": 1})
    # Institutional shareholders
    for inst in ["BlackRock", "Vanguard", "State Street"]:
        nodes.append({"id": inst, "label": inst, "type": "institutional",
                      "color": "#A3A3A3", "size": 9})
        links.append({"source": inst, "target": deal["target_ticker"],
                      "label": "OWNS", "color": "#525252", "value": 1})
    # Activist
    if deal["activist_intensity"] > 0.3:
        nodes.append({"id": f"ACT-{deal['id']}", "label": "Activist Coalition", "type": "activist",
                      "color": "#FF3B30", "size": 12})
        links.append({"source": f"ACT-{deal['id']}", "target": deal["target_ticker"],
                      "label": "PRESSURE", "color": "#FF3B30", "value": 2})
    # Competing bidder
    if deal["competing_bidder_prob"] > 0.15:
        nodes.append({"id": f"RIVAL-{deal['id']}", "label": "Potential Rival Bidder", "type": "rival",
                      "color": "#FF6B00", "size": 11})
        links.append({"source": f"RIVAL-{deal['id']}", "target": deal["target_ticker"],
                      "label": "MAY_BID", "color": "#FF6B00", "value": 1})
    return {"nodes": nodes, "links": links}


def portfolio_summary(deals: list[dict]) -> dict:
    pending = [d for d in deals if d["status"] == "Pending"]
    closed = [d for d in deals if d["status"] == "Closed"]
    terminated = [d for d in deals if d["status"] in ("Terminated","Withdrawn")]
    aggregate_value = sum(d["deal_value_b"] for d in pending)
    avg_success = sum(predict_deal_success(d)["probability"] for d in pending) / max(1, len(pending))
    avg_reg_risk = sum(regulatory_risk_score(d)["score"] for d in pending) / max(1, len(pending))
    return {
        "total_deals": len(deals),
        "pending": len(pending), "closed": len(closed), "terminated": len(terminated),
        "aggregate_pending_value_b": round(aggregate_value, 1),
        "portfolio_avg_success_prob": round(avg_success, 4),
        "portfolio_avg_reg_risk": round(avg_reg_risk, 1),
        "historical_completion_rate": round(len(closed) / max(1, len(closed) + len(terminated)), 4),
    }
