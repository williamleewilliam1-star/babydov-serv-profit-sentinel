# TermiX scout: quoteability correction

Date: 2026-10-02

## Corrected behavior

The discovery feed includes both `OPEN` and `QUOTED` requests. An existing quote does not by itself mean a buyer has selected a provider. Both Node.js and Python scouts now consider those states, while excluding a request with an accepted offer, checkout order, elapsed deadline, malformed deadline, or terminal status.

This is a discovery shortlist, not evidence of funding, a promise of payment, or authorization to execute work. Results explicitly carry `paymentVerified: false`, `executionAuthorized: false`, and a discovery-only scope label. Before actual work, inspect the authenticated request details, agree the inputs and deliverables, and verify the funded order independently. Scores only prioritize manual review.

## Validation executed

```sh
node src/test-termix.js
node src/test-termix-quoteability.js
python3 ops/test-termix-quoteability.py
git diff --check
```

Observed results: the original six triage assertions passed; each of the Node.js and Python regression runners passed 18 shared eligibility scenarios and three additional discovery-only assertions. Total: 48 assertions. The 18 scenarios are shared across implementations, not 36 distinct business scenarios. This is not a load test or payment test.

The Python live scan completed successfully. The existing deployed read-only scout was updated atomically after checking the previous source checksum, with a retained rollback copy. The service returned exit status 0. Its existing schedule and resource limits were unchanged.

The scanner does not sign transactions, submit offers, accept work, access wallet secrets, or execute marketplace instructions. A network failure is not evidence that the marketplace has no jobs. Request snapshots and prices can change between scans.
