import { execFileSync } from 'node:child_process';

export function parseIssueUrl(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !match) throw new Error('Expected a GitHub issue URL');
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

export function assessIssue(issue) {
  const state = String(issue.state || '').toLowerCase();
  const closed = state !== 'open';
  const archived = Boolean(issue.repository?.archived);
  const assigned = Array.isArray(issue.assignees) && issue.assignees.length > 0;
  return {
    issueUrl: issue.html_url, state, archived, assigned,
    verdict: closed || archived ? 'DECLINE' : assigned ? 'HOLD' : 'REVIEW',
    fundingVerified: false, paymentGuaranteed: false,
    reason: closed ? 'source-issue-not-open' : archived ? 'repository-archived' : assigned ? 'already-assigned' : 'manual-funding-and-pr-check-required'
  };
}

export function checkIssue(url, reader = (endpoint) => JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', timeout: 15000 }))) {
  const { owner, repo, number } = parseIssueUrl(url);
  const issue = reader(`repos/${owner}/${repo}/issues/${number}`);
  if (issue.pull_request) throw new Error('This URL resolves to a PR, not an issue');
  const repository = reader(`repos/${owner}/${repo}`);
  return assessIssue({ ...issue, repository });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.error('Usage: node src/bounty-verify.js https://github.com/owner/repo/issues/123 ...'); process.exit(2); }
  let failures = 0;
  for (const url of urls) {
    try { console.log(JSON.stringify(checkIssue(url))); }
    catch (error) { failures++; console.error(JSON.stringify({url, error: error.message})); }
  }
  if (failures) process.exitCode = 1;
}
