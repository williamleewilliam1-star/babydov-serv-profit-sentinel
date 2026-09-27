# BABYDOV SERV Profit Sentinel

An evidence-first paid-work triage product built for **OpenServ SERV Hackathon — Edition 01 / Open Track**.

Profit Sentinel takes a bounty, freelance task, security job, or agent-work opportunity and returns a strict **GO / HOLD / DECLINE** decision. It reasons over reward, time, payout certainty, upfront cost, verification burden, deadline pressure, missing evidence, and counterparty risk.

## Why SERV

The product uses the OpenServ SERV Reasoning API as its decision engine. The output is constrained to a strict JSON schema so the UI can turn model reasoning into a repeatable decision slip rather than a free-form chat answer.

Default model: **gpt-6-luna**

Endpoint:

    https://inference-api.openserv.ai/v1/chat/completions

The OpenServ key is read only on the server and is never sent to the browser.

## What it returns

- GO / HOLD / DECLINE
- 0–100 score
- expected value estimate when evidence allows it
- confidence
- estimated time
- blockers
- evidence still needed
- risk flags
- one concrete next action
- concise rationale

## Run locally

Requires Node.js 20+.

    cp .openserv_key.example .openserv_key
    # replace the example value with your SERV API key
    npm start

Open http://localhost:8787, or set another port:

    PORT=8800 npm start

## API

Health:

    GET /api/health

Analyze:

    POST /api/analyze
    Content-Type: application/json

Example request fields:

    title
    source
    reward
    currency
    costToStart
    deadline
    description
    url

## Security design

Opportunity text is treated as untrusted data. The system prompt explicitly forbids inventing missing evidence or claiming a payout is guaranteed. Secrets stay server-side, and the local .openserv_key file is excluded from Git.

## Hackathon

**OpenServ SERV Hackathon — Edition 01**

- Track: Open Track
- Builder: Ivan Babydov / BABYDOV
- September 2026

The project is designed around a real agent-economy problem: discovery is cheap, but choosing the wrong paid task burns time or creates financial/security risk. Profit Sentinel is the reasoning gate between discovering work and acting on it.
