const $ = (id) => document.getElementById(id);

const sample = {
  title: "Security patch verification for a public repository",
  source: "Public bounty board",
  reward: 120,
  currency: "USDC",
  cost: 0,
  deadline: "48 hours",
  description: "Review a public smart-contract repository, reproduce a documented issue locally, verify the proposed patch, and submit concise evidence. No production exploitation and no upfront payment required.",
  url: "https://github.com/"
};

function loadSample() {
  for (const [key, value] of Object.entries(sample)) {
    const el = $(key);
    if (el) el.value = value;
  }
}

function setList(id, items) {
  const node = $(id);
  node.innerHTML = "";
  const values = Array.isArray(items) && items.length ? items : ["None identified"];
  for (const item of values) {
    const li = document.createElement("li");
    li.textContent = String(item);
    node.appendChild(li);
  }
}
function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function showResult(payload) {
  const a = payload.analysis || {};
  $("verdict").textContent = a.verdict || "HOLD";
  $("verdict").className = `verdict ${String(a.verdict || "hold").toLowerCase()}`;
  $("score").textContent = Number.isFinite(Number(a.score)) ? Math.round(Number(a.score)) : "—";
  $("ev").textContent = money(a.expected_value_usd);
  $("confidence").textContent = a.confidence == null ? "—" : `${Math.round(Number(a.confidence) * 100)}%`;
  $("time").textContent = a.time_hours == null ? "—" : `${a.time_hours}h`;
  $("next-action").textContent = a.next_action || "Collect more evidence.";
  $("rationale").textContent = a.rationale || "No rationale returned.";
  $("provider").textContent = `${payload.provider || "OpenServ SERV Reasoning"} · ${payload.model || ""}`;
  $("request-id").textContent = `request: ${payload.request_id || "n/a"}`;
  setList("blockers", a.blockers);
  setList("evidence", a.evidence_needed);
  setList("risks", a.risk_flags);
  $("empty-state").classList.add("hidden");
  $("loading").classList.add("hidden");
  $("result").classList.remove("hidden");
}
async function analyze(event) {
  event.preventDefault();
  $("analyze").disabled = true;
  $("empty-state").classList.add("hidden");
  $("result").classList.add("hidden");
  $("loading").classList.remove("hidden");

  const payload = {
    title: $("title").value,
    source: $("source").value,
    reward: $("reward").value ? Number($("reward").value) : null,
    currency: $("currency").value,
    costToStart: $("cost").value ? Number($("cost").value) : 0,
    deadline: $("deadline").value,
    description: $("description").value,
    url: $("url").value
  };

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    showResult(data);
  } catch (error) {
    $("loading").classList.add("hidden");
    $("empty-state").classList.remove("hidden");
    $("empty-state").querySelector("h2").textContent = "Analysis failed";
    $("empty-state").querySelector("p:last-child").textContent = error.message;
  } finally {
    $("analyze").disabled = false;
  }
}

$("load-sample").addEventListener("click", loadSample);
$("opportunity-form").addEventListener("submit", analyze);
loadSample();
