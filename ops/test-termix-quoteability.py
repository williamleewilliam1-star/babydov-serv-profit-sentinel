import importlib.util
import json
from pathlib import Path
from datetime import datetime, timezone
root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("scout", root / "ops/termix-scout.py")
scout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scout)
cases = json.loads((root / "tests/termix-quoteability.json").read_text())
for c in cases:
    assert scout.is_quoteable(c["item"], datetime(2026,10,2,tzinfo=timezone.utc)) == c["expected"], c["name"]
row = scout.triage({"id":"fixture", "title":"Webhook API with tests", "scope":"Webhook API with tests", "status":"QUOTED", "budget":{"max":"80"}, "quoteCount":0})
assert row["verdict"] != "DECLINE"
assert row["paymentVerified"] is False
assert row["executionAuthorized"] is False
print(f"PASS: {len(cases)} eligibility cases + 3 discovery-only assertions")
