const TERMIX_BASE = process.env.TERMIX_BASE_URL || "https://platform-backend.prod.termix.live";

const HARD_RISK = [
  /\b(revoke|approval|approve)\b/i,
  /\b(stake|staking)\b/i,
  /\b(governance vote|cast.*vote)\b/i,
  /\b(multisig|test transfer|send tokens?)\b/i,
  /\b(wallet install|wallet login|wallet session)\b/i,
  /\b(account registration|account profile|profile fields|profile .*setup|profile .*finished)\b/i,
  /\b(discord role|faucet|badge mint(?:ed)?|quest campaign|quest steps)\b/i,
  /\b(repost|pinned announcement|project feed)\b/i
];

const STRONG_FIT = [
  /\b(code review|bugfix|test suite|docker|webhook|api)\b/i,
  /\b(research|data|scrape|json|csv|report|audit)\b/i,
  /\bautomation|backend|integration|reconciliation\b/i,
  /\bcomparison|slippage readout|simulate|analysis\b/i
];

const UNVERIFIABLE_SCOPE = /^(?:devvil|tbd|n\/?a|test|audit|hello|none|coming soon|placeholder|-)$/i;
const SPECULATIVE_WORK = /\b(?:airdrop|alpha hunter|yield farming|arbitrage bot|token launch)\b/i;

function coreText(item) {
  return [item.title, item.scope].filter(Boolean).join(" ");
}

function budgetMax(item) {
  const value = Number(item?.budget?.max || 0);
  return Number.isFinite(value) ? value : 0;
}

export function isQuoteable(item, now = Date.now()) {
  if (!item || typeof item !== "object" || !["OPEN", "QUOTED"].includes(item.status)) return false;
  if (item.acceptedOfferId || item.checkoutOrderId) return false;
  if (item.deadlineAt != null) {
    if (typeof item.deadlineAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(item.deadlineAt)) return false;
    const deadline = Date.parse(item.deadlineAt);
    if (!Number.isFinite(deadline) || deadline <= now) return false;
  }
  return true;
}

export function triageTermixRequest(item) {
  const text = coreText(item);
  const risks = HARD_RISK.filter((rule) => rule.test(text)).map((rule) => rule.source);
  if (/\bswap\b/i.test(text) && !/\b(comparison|quote|slippage readout|simulate)\b/i.test(text)) {
    risks.push("swap-execution");
  }

  if (SPECULATIVE_WORK.test(text)) risks.push("speculative-work");
  const scope = String(item?.scope || "").trim();
  const underspecified = scope.length < 35 || UNVERIFIABLE_SCOPE.test(scope);
  if (underspecified) risks.push("underspecified-scope");
  const fitHits = STRONG_FIT.filter((rule) => rule.test(text)).length;
  const reward = budgetMax(item);
  const quotes = Number(item.quoteCount || 0);

  let score = 30;
  score += Math.min(35, reward / 3);
  score += Math.min(25, fitHits * 10);
  score -= Math.min(18, quotes * 5);
  score -= risks.length * 50;
  if (fitHits === 0) score -= 25;
  if (!isQuoteable(item)) score -= 60;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict = !isQuoteable(item) || risks.length ? "DECLINE" : fitHits > 0 && score >= 65 ? "GO" : score >= 45 ? "HOLD" : "DECLINE";
  return { verdict, score, reward, quotes, risks, fitHits, item, paymentVerified: false, executionAuthorized: false };
}

async function fetchPage(page, pageSize = 100) {
  const url = new URL("/api/v1/prepayment-orders/discover", TERMIX_BASE);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`TermiX discover failed (${response.status})`);
  return response.json();
}

export async function scanTermix() {
  const first = await fetchPage(1);
  const pages = [first];
  const totalPages = Number(first.totalPages || 1);
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 50) throw new Error("Invalid pagination limit");
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await fetchPage(page));
  }
  const items = pages.flatMap((page) => page.items || []);
  const triaged = items.map(triageTermixRequest).sort((a, b) => b.score - a.score);
  const open = triaged.filter((row) => isQuoteable(row.item));
  return {
    fetchedAt: new Date().toISOString(),
    source: TERMIX_BASE,
    total: items.length,
    open: triaged.filter((row) => row.item.status === "OPEN").length,
    quoteable: open.length,
    decisionScope: "DISCOVERY_ONLY_NOT_PAYMENT_OR_WORK_AUTHORIZATION",
    go: open.filter((row) => row.verdict === "GO"),
    hold: open.filter((row) => row.verdict === "HOLD"),
    decline: open.filter((row) => row.verdict === "DECLINE")
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await scanTermix();
  const compact = {
    fetchedAt: result.fetchedAt,
    total: result.total,
    open: result.open,
    go: result.go.map(({ verdict, score, reward, quotes, item }) => ({
      verdict, score, reward, quotes, id: item.id, title: item.title, tags: item.tags
    })),
    hold: result.hold.slice(0, 10).map(({ verdict, score, reward, quotes, item }) => ({
      verdict, score, reward, quotes, id: item.id, title: item.title, tags: item.tags
    })),
    declinedCount: result.decline.length
  };
  console.log(JSON.stringify(compact, null, 2));
}
