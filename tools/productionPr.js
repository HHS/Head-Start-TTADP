const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_REPO = process.env.GITHUB_REPOSITORY || 'HHS/Head-Start-TTADP';
const DEFAULT_BASE_BRANCH = 'production';
const DEFAULT_HEAD_BRANCH = 'main';

// ASCII unit separator: won't appear in a commit subject, so it's safe to
// split on even if a subject contains arbitrary punctuation.
const COMMIT_FIELD_SEPARATOR = '\x1f';

function runCommand(command, args, { cwd = process.cwd() } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  if (result.error) {
    throw new Error(`${command} could not be executed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }

  return result.stdout;
}

/**
 * Parses `git log --pretty=format:%H<sep>%s` output into { sha, subject }
 * entries, oldest first (git log's natural order for a `base..head` range).
 */
function parseCommitRange(gitLogOutput = '') {
  return gitLogOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subjectParts] = line.split(COMMIT_FIELD_SEPARATOR);
      return { sha, subject: subjectParts.join(COMMIT_FIELD_SEPARATOR) || '' };
    });
}

/**
 * Requires a full (non-shallow) checkout with both refs fetched -
 * `origin/<baseBranch>..origin/<headBranch>` only resolves with complete history.
 */
function getCommitRange({
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
  cwd,
} = {}) {
  const stdout = runCommand(
    'git',
    [
      'log',
      `origin/${baseBranch}..origin/${headBranch}`,
      '--first-parent',
      '--no-merges',
      `--pretty=format:%H${COMMIT_FIELD_SEPARATOR}%s`,
    ],
    { cwd }
  );

  return parseCommitRange(stdout);
}

/**
 * Full set of files that differ between the two branch tips, used to derive
 * checklist defaults (see productionPrChecklist.js). A `..` diff of two refs
 * compares their trees directly, which is what we want for "everything in
 * this release" rather than a merge-base-relative view.
 */
function getChangedFiles({
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
  cwd,
} = {}) {
  const stdout = runCommand(
    'git',
    ['diff', '--name-only', `origin/${baseBranch}..origin/${headBranch}`],
    { cwd }
  );

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Picks the merged PR that targeted `mergedInto` out of the PRs GitHub
 * associates with a commit. Squash-merge history should produce at most one
 * match; if more than one somehow qualifies, the most recently merged wins
 * rather than failing the whole run over an edge case this narrow.
 */
function parseAssociatedPullRequest(pulls = [], { mergedInto = DEFAULT_HEAD_BRANCH } = {}) {
  const merged = pulls.filter((pr) => pr && pr.merged_at && pr.base && pr.base.ref === mergedInto);

  if (merged.length === 0) {
    return null;
  }

  if (merged.length === 1) {
    return merged[0];
  }

  return [...merged].sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at))[0];
}

function getAssociatedPullRequest(
  sha,
  { repo = DEFAULT_REPO, mergedInto = DEFAULT_HEAD_BRANCH } = {}
) {
  const stdout = runCommand('gh', ['api', `repos/${repo}/commits/${sha}/pulls`]);
  return parseAssociatedPullRequest(JSON.parse(stdout), { mergedInto });
}

/**
 * Normalizes a commit + its resolved PR (if any) into the shape the Credal
 * agent prompt expects. Commits with no resolvable PR keep their raw commit
 * metadata rather than being dropped, per the plan's explicit state handling.
 */
function buildReleaseCommit({ sha, subject }, pr = null) {
  return {
    sha,
    subject,
    prNumber: pr ? pr.number : null,
    prTitle: pr ? pr.title : null,
    prBody: pr ? pr.body || '' : null,
  };
}

/**
 * Enforces "fail if ambiguous" - more than one open main->production PR
 * means something unexpected happened upstream and this run should not
 * guess which one to update.
 */
function resolveExistingProductionPr(openPrs = []) {
  if (openPrs.length === 0) {
    return null;
  }

  if (openPrs.length > 1) {
    throw new Error(
      `Expected at most one open production PR, found ${openPrs.length}: ${openPrs
        .map((pr) => `#${pr.number}`)
        .join(', ')}`
    );
  }

  return openPrs[0];
}

function getExistingProductionPr({
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
} = {}) {
  const stdout = runCommand('gh', [
    'pr',
    'list',
    '--base',
    baseBranch,
    '--head',
    headBranch,
    '--state',
    'open',
    '--json',
    'number,title,body',
  ]);

  return resolveExistingProductionPr(JSON.parse(stdout));
}

/**
 * Fetches one PR by number, including its current state. Used to re-read the
 * PR immediately before writing an update, rather than reusing the snapshot
 * taken when the payload was first built - the Credal round-trip in between
 * is the main window in which a human could edit the PR (check a box, add a
 * note), and re-reading right before the write shrinks that window to just
 * the final render + `gh pr edit` call.
 */
function getProductionPrByNumber(number) {
  const stdout = runCommand('gh', [
    'pr',
    'view',
    String(number),
    '--json',
    'number,title,body,state',
  ]);

  return JSON.parse(stdout);
}

/**
 * Assembles the normalized payload the Credal agent prompt documents under
 * "Input Expectations". `mode` is derived from whether an existing PR was
 * found, not passed in separately, so callers can't get the two out of sync.
 */
function buildReleaseScopePayload({
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
  releaseCommits,
  existingProductionPr = null,
}) {
  return {
    mode: existingProductionPr ? 'update' : 'create',
    baseBranch,
    headBranch,
    releaseCommits,
    existingProductionPr: existingProductionPr
      ? {
          number: existingProductionPr.number,
          title: existingProductionPr.title,
          body: existingProductionPr.body,
        }
      : null,
  };
}

/**
 * Orchestrates the read-only data pipeline: commit range -> per-commit PR
 * resolution -> existing-PR detection -> payload assembly. Not unit tested
 * directly (it only wires together already-tested pure functions around
 * live `git`/`gh` calls), matching this repo's convention for I/O wrappers
 * (see tools/releaseInventory.js).
 */
function buildReleaseScopePayloadFromRepo({
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
  repo = DEFAULT_REPO,
  cwd,
} = {}) {
  const commits = getCommitRange({ baseBranch, headBranch, cwd });

  const releaseCommits = commits.map((commit) => {
    const pr = getAssociatedPullRequest(commit.sha, { repo, mergedInto: headBranch });
    return buildReleaseCommit(commit, pr);
  });

  const existingProductionPr = getExistingProductionPr({ baseBranch, headBranch });

  return buildReleaseScopePayload({ baseBranch, headBranch, releaseCommits, existingProductionPr });
}

/**
 * Writes `body` to a temp file and runs it through `--body-file`, rather
 * than passing the body as a CLI argument, since release PR bodies are long
 * markdown containing quotes/backticks that are unsafe to shell-escape
 * directly.
 */
function withBodyFile(body, fn) {
  const file = path.join(
    os.tmpdir(),
    `production-pr-body-${Date.now()}-${Math.random().toString(36).slice(2)}.md`
  );
  fs.writeFileSync(file, body, 'utf8');

  try {
    return fn(file);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

/**
 * Creates the production PR as a draft. Must stay a draft - the template
 * requires draft creation, and the `ready_for_review` transition is the
 * intentional trigger for the Slack/Jira automation in pr-notifications.yml.
 * Creating it non-draft would bypass that gate.
 */
function createProductionPr({
  title,
  body,
  baseBranch = DEFAULT_BASE_BRANCH,
  headBranch = DEFAULT_HEAD_BRANCH,
}) {
  return withBodyFile(body, (file) =>
    runCommand('gh', [
      'pr',
      'create',
      '--base',
      baseBranch,
      '--head',
      headBranch,
      '--draft',
      '--title',
      title,
      '--body-file',
      file,
    ])
  );
}

function updateProductionPr({ number, title, body }) {
  return withBodyFile(body, (file) =>
    runCommand('gh', ['pr', 'edit', String(number), '--title', title, '--body-file', file])
  );
}

module.exports = {
  parseCommitRange,
  getCommitRange,
  getChangedFiles,
  createProductionPr,
  updateProductionPr,
  getProductionPrByNumber,
  parseAssociatedPullRequest,
  getAssociatedPullRequest,
  buildReleaseCommit,
  resolveExistingProductionPr,
  getExistingProductionPr,
  buildReleaseScopePayload,
  buildReleaseScopePayloadFromRepo,
};
