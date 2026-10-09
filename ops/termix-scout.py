#!/usr/bin/env python3
import json
import os
import re
import tempfile
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = os.environ.get("TERMIX_BASE_URL", "https://platform-backend.prod.termix.live")
OUT = os.environ.get("TERMIX_SCOUT_OUT", "/opt/babydov-termix-scout/state/latest.json")

HARD_RISK = [
    re.compile(r"\b(revoke|approval|approve)\b", re.I),
    re.compile(r"\b(stake|staking)\b", re.I),
    re.compile(r"\b(governance vote|cast.*vote)\b", re.I),
    re.compile(r"\b(multisig|test transfer|send tokens?)\b", re.I),
    re.compile(r"\b(wallet install|wallet login|wallet session)\b", re.I),
    re.compile(r"\b(account registration|account profile|profile fields|profile .*setup|profile .*finished)\b", re.I),
    re.compile(r"\b(discord role|faucet|badge mint(?:ed)?|quest campaign|quest steps)\b", re.I),
    re.compile(r"\b(repost|pinned announcement|project feed)\b", re.I),
]

UNVERIFIABLE_SCOPE = re.compile(r"^(?:devvil|tbd|n/?a|test|audit|hello|none|coming soon|placeholder|-)$", re.I)
SPECULATIVE_WORK = re.compile(r"\b(?:airdrop|alpha hunter|yield farming|arbitrage bot|token launch)\b", re.I)

STRONG_FIT = [
    re.compile(r"\b(code review|bugfix|test suite|docker|webhook|api)\b", re.I),
    re.compile(r"\b(research|data|scrape|json|csv|report|audit)\b", re.I),
    re.compile(r"\bautomation|backend|integration|reconciliation\b", re.I),
    re.compile(r"\bcomparison|slippage readout|simulate|analysis\b", re.I),
]

def fetch_page(page, page_size=100):
    query = urllib.parse.urlencode({"page": page, "pageSize": page_size})
    url = f"{BASE}/api/v1/prepayment-orders/discover?{query}"
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "BABYDOV-Termix-Scout/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)

def budget_max(item):
    try:
        return float((item.get("budget") or {}).get("max") or 0)
    except (TypeError, ValueError):
        return 0.0

def is_quoteable(item, now=None):
    if not isinstance(item, dict) or item.get("status") not in ("OPEN", "QUOTED"):
        return False
    if item.get("acceptedOfferId") or item.get("checkoutOrderId"):
        return False
    deadline = item.get("deadlineAt")
    if deadline is not None:
        if not isinstance(deadline, str):
            return False
        try:
            parsed = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if parsed.tzinfo is None or parsed <= (now or datetime.now(timezone.utc)):
                return False
        except (ValueError, TypeError):
            return False
    return True

def triage(item):
    text = " ".join(str(x) for x in (item.get("title"), item.get("scope")) if x)
    risks = [rule.pattern for rule in HARD_RISK if rule.search(text)]
    if re.search(r"\bswap\b", text, re.I) and not re.search(r"\b(comparison|quote|slippage readout|simulate)\b", text, re.I):
        risks.append("swap-execution")
    if SPECULATIVE_WORK.search(text):
        risks.append("speculative-work")
    scope = str(item.get("scope") or "").strip()
    if len(scope) < 35 or UNVERIFIABLE_SCOPE.search(scope):
        risks.append("underspecified-scope")
    fit_hits = sum(bool(rule.search(text)) for rule in STRONG_FIT)
    reward = budget_max(item)
    quotes = int(item.get("quoteCount") or 0)
    score = 30 + min(35, reward / 3) + min(25, fit_hits * 10) - min(18, quotes * 5) - len(risks) * 50
    if fit_hits == 0:
        score -= 25
    if not is_quoteable(item):
        score -= 60
    score = max(0, min(100, round(score)))
    if not is_quoteable(item) or risks:
        verdict = "DECLINE"
    elif fit_hits > 0 and score >= 65:
        verdict = "GO"
    elif score >= 45:
        verdict = "HOLD"
    else:
        verdict = "DECLINE"
    return {
        "verdict": verdict, "score": score, "reward": reward, "quotes": quotes,
        "paymentVerified": False, "executionAuthorized": False,
        "risks": risks, "fitHits": fit_hits, "id": item.get("id"),
        "title": item.get("title"), "tags": item.get("tags") or [],
        "deadlineAt": item.get("deadlineAt"), "status": item.get("status"),
    }

def scan():
    first = fetch_page(1)
    pages = [first]
    total_pages = int(first.get("totalPages") or 1)
    if not 1 <= total_pages <= 50:
        raise ValueError("Invalid pagination limit")
    for page in range(2, total_pages + 1):
        pages.append(fetch_page(page))
    items = [item for page in pages for item in page.get("items", [])]
    ranked = sorted((triage(item) for item in items), key=lambda row: row["score"], reverse=True)
    eligible_ids = {item.get("id") for item in items if is_quoteable(item)}
    open_rows = [row for row in ranked if row["id"] in eligible_ids]
    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(), "source": BASE,
        "total": len(items), "open": sum(row["status"] == "OPEN" for row in ranked),
        "quoteable": len(open_rows), "decisionScope": "DISCOVERY_ONLY_NOT_PAYMENT_OR_WORK_AUTHORIZATION",
        "go": [row for row in open_rows if row["verdict"] == "GO"],
        "hold": [row for row in open_rows if row["verdict"] == "HOLD"],
        "decline": [row for row in open_rows if row["verdict"] == "DECLINE"],
    }

def atomic_write(data):
    directory = os.path.dirname(OUT)
    os.makedirs(directory, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".latest.", suffix=".json", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp, OUT)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

if __name__ == "__main__":
    result = scan()
    atomic_write(result)
    print(json.dumps({
        "fetchedAt": result["fetchedAt"], "total": result["total"], "open": result["open"],
        "go": len(result["go"]), "hold": len(result["hold"]), "decline": len(result["decline"]),
        "top": (result["go"] + result["hold"])[:5],
    }, ensure_ascii=False, indent=2))
