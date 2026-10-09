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
assert.equal(triageTermixRequest(req("Webhook receiver with signatures and retries", 80, 0, "Implement a webhook receiver validating HMAC signatures, replay protection, and retries with a reproducible test suite.")).verdict, "GO");
assert.notEqual(triageTermixRequest(req("Swap comparison across two DEXs, with slippage readout", 60, 0, "Perform read-only swap comparison with slippage readout across two DEX quote APIs; no transactions or wallet operations.")).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("Small bugfix with test suite", 90, 0, "Fix a reproducible bug in a published repository and include passing unit tests and a detailed PR summary.")).verdict, "GO");
assert.equal(triageTermixRequest(req("Audit", 500, 0, "Devvil")).verdict, "DECLINE");
assert.equal(triageTermixRequest(req("TermiX Airdrop Hunter", 1200, 0, "Develop a comprehensive research and automation agent for upcoming airdrop campaigns in the ecosystem.")).verdict, "DECLINE");

console.log("TermiX triage tests: PASS");
