// Wraps each Credal-generated section in its own HTML comment markers so an
// update can find and replace just that section, rather than matching on
// heading text (fragile - a heading could be edited by hand) or
// reconstructing the whole body from the template (would stomp on checklist
// state and any other human edits). See docs/productionPrAutomationPlan.md.
const MANAGED_SECTIONS = {
  descriptionOfChange: {
    heading: 'Description of change',
    start: '<!-- production-pr:description-of-change:start -->',
    end: '<!-- production-pr:description-of-change:end -->',
  },
  howToTest: {
    heading: 'How to test',
    start: '<!-- production-pr:how-to-test:start -->',
    end: '<!-- production-pr:how-to-test:end -->',
  },
  issues: {
    heading: 'Jira Issue(s)',
    start: '<!-- production-pr:jira-issues:start -->',
    end: '<!-- production-pr:jira-issues:end -->',
  },
};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wrapManagedSection(markers, content) {
  return `${markers.start}\n${content.trim()}\n${markers.end}`;
}

/**
 * Replaces everything between a `## <heading>` line and the next `##`
 * heading (or end of body) with `newContent`. Used on create (against the
 * known-good committed template) and as the update fallback for a PR body
 * that predates managed-section markers - throws if the heading itself is
 * missing, since at that point the body doesn't match the expected shape at
 * all and guessing where to put content risks corrupting it.
 */
function replaceSectionContent(body, heading, newContent) {
  const headings = [...body.matchAll(/^##\s+.*$/gm)];
  const target = headings.find((match) => match[0].trim() === `## ${heading}`);

  if (!target) {
    throw new Error(`PR body is missing a "## ${heading}" section`);
  }

  const targetIndex = headings.indexOf(target);
  const next = headings[targetIndex + 1];
  const start = target.index + target[0].length;
  const end = next ? next.index : body.length;

  return `${body.slice(0, start)}\n\n${newContent}\n\n${body.slice(end)}`;
}

/**
 * Renders a brand-new PR body from the committed template, stamping each of
 * the three Credal-generated sections with managed-section markers. Does not
 * touch the checklist - call applyChecklistDefaults (productionPrChecklist.js)
 * on the result separately.
 */
function renderCreateBody({ template, content }) {
  let body = template;

  Object.entries(MANAGED_SECTIONS).forEach(([fieldName, markers]) => {
    body = replaceSectionContent(
      body,
      markers.heading,
      wrapManagedSection(markers, content[fieldName])
    );
  });

  return body;
}

/**
 * Replaces the content between one managed section's start/end markers,
 * leaving everything else in the body - including checklist state and any
 * other human edits - untouched.
 */
function hasManagedSection(body, markers) {
  const pattern = new RegExp(
    `${escapeRegExp(markers.start)}[\\s\\S]*?${escapeRegExp(markers.end)}`
  );
  return pattern.test(body);
}

function setManagedSection(body, markers, newContent) {
  const pattern = new RegExp(
    `${escapeRegExp(markers.start)}[\\s\\S]*?${escapeRegExp(markers.end)}`
  );
  // A replacer function, not a string: String.replace treats a string
  // replacement's `$&`/`$'`/`` $` ``/`$1`/`$$` as special patterns. newContent
  // is LLM-generated and not guaranteed to be free of a literal `$` sequence,
  // and a hit would silently corrupt the body - e.g. `$'` would duplicate
  // everything after the match, including the real Production Deploy
  // checklist. A function return value is always inserted verbatim.
  return body.replace(pattern, () => wrapManagedSection(markers, newContent));
}

/**
 * Renders an updated PR body by patching the three managed sections of an
 * existing body. Prefers marker-based replacement (stable once a PR has been
 * through this automation before); when a section has no markers yet - e.g.
 * a production PR opened by hand before this automation existed - falls back
 * to heading-based replacement (the same matcher renderCreateBody uses) and
 * stamps markers onto it, so the PR self-upgrades to the fast path on its
 * next update. Only throws if the heading itself is missing too, which means
 * the body doesn't match the committed template shape at all.
 *
 * Idempotent: calling this again with the same `content` against its own
 * output reproduces the same body, and calling it with new content never
 * leaves behind a stale or duplicated marker pair.
 */
function renderUpdateBody({ currentBody, content }) {
  let body = currentBody;

  Object.entries(MANAGED_SECTIONS).forEach(([fieldName, markers]) => {
    if (hasManagedSection(body, markers)) {
      body = setManagedSection(body, markers, content[fieldName]);
    } else {
      body = replaceSectionContent(
        body,
        markers.heading,
        wrapManagedSection(markers, content[fieldName])
      );
    }
  });

  return body;
}

module.exports = {
  MANAGED_SECTIONS,
  replaceSectionContent,
  hasManagedSection,
  setManagedSection,
  renderCreateBody,
  renderUpdateBody,
};
