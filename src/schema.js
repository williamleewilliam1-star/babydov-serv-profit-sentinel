const stringList = {
  type: "array",
  items: { type: "string" }
};

export const DECISION_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "babydov_profit_decision",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: {
          type: "string",
          enum: ["GO", "HOLD", "DECLINE"]
        },
        score: {
          type: "integer",
          minimum: 0,
          maximum: 100
        },
        expected_value_usd: {
          type: ["number", "null"]
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        time_hours: {
          type: ["number", "null"],
          minimum: 0
        },
        blockers: stringList,
        evidence_needed: stringList,
        risk_flags: stringList,
        next_action: {
          type: "string"
        },
        rationale: {
          type: "string"
        }
      },
      required: [
        "verdict",
        "score",
        "expected_value_usd",
        "confidence",
        "time_hours",
        "blockers",
        "evidence_needed",
        "risk_flags",
        "next_action",
        "rationale"
      ]
    }
  }
};
