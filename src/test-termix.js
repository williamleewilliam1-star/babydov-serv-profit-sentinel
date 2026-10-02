import assert from "node:assert/strict";
import { triageTermixRequest } from "./termix.js";

function req(title, max, quoteCount = 0, scope = title) {
  return {
    id: "test",
    title,
    scope,
    tags: [],
    budget: { min: String(max), max: String(max), currency: "USDC" },
    quoteCount,
    status: "OPEN"
  };
}

assert.equal(triageTermixRequest(req("Revoke stale token approval", 120)).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("Account profile finished for demo", 100)).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("Discord role verification through project bot", 90)).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("Webhook receiver with signatures and retries", 80)).verdict, "GO");
assert.notEqual(triageTermixRequest(req("Swap comparison across two DEXs, with slippage readout", 60)).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("Small bugfix with test suite", 90, 0)).verdict, "GO");

console.log("TermiX triage tests: PASS");
