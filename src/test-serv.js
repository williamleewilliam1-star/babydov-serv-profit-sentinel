import { analyzeOpportunity } from "./serv.js";

const result = await analyzeOpportunity({
  title: "Audit a public smart-contract repository",
  source: "Demo bounty board",
  reward: 120,
  currency: "USDC",
  costToStart: 0,
  deadline: "48 hours",
  description: "Review source code, produce reproducible evidence, no production exploitation."
});

console.log(JSON.stringify({
  model: result.model,
  verdict: result.analysis.verdict,
  score: result.analysis.score,
  next_action: result.analysis.next_action
}, null, 2));
