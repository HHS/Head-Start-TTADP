// Paths treated as non-functional (docs/CI/infra) for checklist defaults.
// Best-effort heuristic based on the actual diff, not a blanket guess - the
// PR reviewer should still confirm before merging; see
// docs/productionPrAutomationPlan.md for the full defaulting rules.
const DOCS_CI_INFRA_PATTERNS = [
  /^docs\//,
  /^\.github\//,
  /^\.circleci\//,
  /^tools\//,
  /^bin\//,
  /^deployment_config\//,
];

function isDocsCiInfraPath(filePath) {
  return DOCS_CI_INFRA_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Derives the facts the checklist defaults depend on from the full list of
 * files changed across the release scope. Each fact maps directly to one
 * checklist item's default in docs/productionPrAutomationPlan.md.
 */
function deriveChecklistFacts(filesChanged = []) {
  return {
    hasMigrations: filesChanged.some((f) => f.startsWith('src/migrations/')),
    hasAdr: filesChanged.some((f) => f.startsWith('docs/adr/')),
    hasApiDocsChange: filesChanged.some((f) => f.startsWith('docs/openapi/')),
    hasBoundaryDiagramChange: filesChanged.includes('docs/boundary_diagram.md'),
    affectsUi: filesChanged.some((f) => f.startsWith('frontend/')),
    affectsFunctionalCode: filesChanged.some((f) => !isDocsCiInfraPath(f)),
  };
}

// Each rule's `match` is a unique substring of its checklist line in
// .github/pull_request_template.md, scoped to "Every PR" and "Before merge
// to main" only - see the hard Production Deploy exclusion below.
const CHECKLIST_RULES = [
  { match: 'Linked Jira issue', value: () => 'x' },
  { match: 'JIRA issue status updated', value: () => 'x' },
  { match: 'Code is meaningfully tested', value: () => 'x' },
  { match: 'Meets accessibility standards', value: (facts) => (facts.affectsUi ? 'x' : 'n/a') },
  { match: 'API Documentation updated', value: (facts) => (facts.hasApiDocsChange ? 'x' : 'n/a') },
  {
    match: 'Boundary diagram updated',
    value: (facts) => (facts.hasBoundaryDiagramChange ? 'x' : 'n/a'),
  },
  { match: 'Logical Data Model updated', value: (facts) => (facts.hasMigrations ? 'x' : 'n/a') },
  { match: 'Architectural Decision Records', value: (facts) => (facts.hasAdr ? 'x' : 'n/a') },
  { match: 'UI review complete', value: (facts) => (facts.affectsUi ? 'x' : 'n/a') },
  {
    match: 'QA review complete',
    value: (facts) => (facts.affectsFunctionalCode ? 'x' : 'n/a'),
  },
  { match: 'OHS demo complete', value: () => 'x' },
  { match: 'Ready to create production PR', value: () => 'x' },
];

const PRODUCTION_DEPLOY_HEADING_PATTERN = /^###\s+Production Deploy\s*$/;
const ANY_HEADING_PATTERN = /^#{1,6}\s/;

/**
 * Sets `- [ ]`/`- [x]`/`- [n/a]` to the freshly computed default for every
 * checklist line covered by CHECKLIST_RULES, leaving every other line
 * exactly as-is. Called on both create and update: recomputed on every run
 * from the current full release scope, and intentionally overwrites a line
 * regardless of its current state - including one a human already changed -
 * so the covered boxes never go stale as more commits land on `main` while
 * the production PR is still open.
 *
 * The entire "### Production Deploy" subsection is hard-excluded by section
 * boundary, not just by omitting a rule for it - every item there reflects a
 * real, human-performed action (draft creation, smoke test, reviewer added),
 * never a deterministic fact about the diff, so this automation must never
 * touch it even if a future template edit happens to reuse one of the
 * phrases above inside that section. "After merge/deploy" has no rule either
 * and is left untouched the same way CHECKLIST_RULES always worked.
 */
function applyChecklistDefaults(templateBody, facts) {
  let inProductionDeploySection = false;

  return templateBody
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (inProductionDeploySection && ANY_HEADING_PATTERN.test(trimmed)) {
        inProductionDeploySection = false;
      }

      if (PRODUCTION_DEPLOY_HEADING_PATTERN.test(trimmed)) {
        inProductionDeploySection = true;
      }

      if (inProductionDeploySection) {
        return line;
      }

      // Trailing (\r?) preserves a CRLF line ending. `.` doesn't match `\r`,
      // so without this, a real GitHub PR body (which commonly uses CRLF -
      // confirmed against PR #4032's actual body) fails this match on every
      // line except the last, silently leaving the checklist untouched.
      const checkboxMatch = line.match(/^(\s*-\s*)\[(?: |x|X|n\/a)\](.*)(\r?)$/);

      if (!checkboxMatch) {
        return line;
      }

      const rule = CHECKLIST_RULES.find((candidate) => line.includes(candidate.match));

      if (!rule) {
        return line;
      }

      return `${checkboxMatch[1]}[${rule.value(facts)}]${checkboxMatch[2]}${checkboxMatch[3]}`;
    })
    .join('\n');
}

module.exports = {
  isDocsCiInfraPath,
  deriveChecklistFacts,
  applyChecklistDefaults,
};
