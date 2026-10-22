const fs = require('node:fs');
const path = require('node:path');

const {
  MANAGED_SECTIONS,
  replaceSectionContent,
  renderCreateBody,
  renderUpdateBody,
} = require('./productionPrBody');

const template = fs.readFileSync(
  path.join(__dirname, '../.github/pull_request_template.md'),
  'utf8'
);

const CONTENT = {
  descriptionOfChange:
    '- [TTAHUB-5660](https://jira.acf.gov/browse/TTAHUB-5660) Add communication logs to recipient timelines.',
  howToTest: '- Passing automated checks in the merged PRs; smoke test in staging.',
  issues: '* https://jira.acf.gov/browse/TTAHUB-5660',
};

const OTHER_CONTENT = {
  descriptionOfChange:
    '- [TTAHUB-9999](https://jira.acf.gov/browse/TTAHUB-9999) A different release.',
  howToTest:
    '- Passing automated checks in the merged PRs; smoke test in staging.\n- Validate the new workflow ran.',
  issues: '* https://jira.acf.gov/browse/TTAHUB-9999',
};

describe('replaceSectionContent', () => {
  it('throws when the heading is missing', () => {
    expect(() =>
      replaceSectionContent('## Something else\n', 'Description of change', 'x')
    ).toThrow(/missing a "## Description of change" section/);
  });
});

describe('renderCreateBody', () => {
  it('stamps each managed section with its markers and content', () => {
    const body = renderCreateBody({ template, content: CONTENT });

    expect(body).toContain(MANAGED_SECTIONS.descriptionOfChange.start);
    expect(body).toContain(CONTENT.descriptionOfChange);
    expect(body).toContain(MANAGED_SECTIONS.descriptionOfChange.end);

    expect(body).toContain(MANAGED_SECTIONS.howToTest.start);
    expect(body).toContain(CONTENT.howToTest);
    expect(body).toContain(MANAGED_SECTIONS.howToTest.end);

    expect(body).toContain(MANAGED_SECTIONS.issues.start);
    expect(body).toContain(CONTENT.issues);
    expect(body).toContain(MANAGED_SECTIONS.issues.end);
  });

  it('preserves the checklist section untouched', () => {
    const body = renderCreateBody({ template, content: CONTENT });
    expect(body).toContain('- [ ] Linked Jira issue');
    expect(body).toContain('### Production Deploy');
  });

  it('drops the placeholder TTAHUB-0 Jira link from the template', () => {
    const body = renderCreateBody({ template, content: CONTENT });
    expect(body).not.toContain('TTAHUB-0');
  });

  it('throws if the template is missing an expected heading', () => {
    const brokenTemplate = template.replace('## How to test', '## How 2 test');
    expect(() => renderCreateBody({ template: brokenTemplate, content: CONTENT })).toThrow(
      /missing a "## How to test" section/
    );
  });
});

describe('renderUpdateBody', () => {
  it('replaces only the managed sections, leaving the checklist untouched', () => {
    const created = renderCreateBody({ template, content: CONTENT });
    const checkedChecklist = created.replace('- [ ] OHS demo complete', '- [x] OHS demo complete');

    const updated = renderUpdateBody({ currentBody: checkedChecklist, content: OTHER_CONTENT });

    expect(updated).toContain(OTHER_CONTENT.descriptionOfChange);
    expect(updated).not.toContain(CONTENT.descriptionOfChange);
    expect(updated).toContain('- [x] OHS demo complete');
  });

  it('falls back to heading-based matching and stamps markers when a body predates this automation', () => {
    // The committed template has no managed-section markers yet - same shape
    // as a production PR opened by hand before this automation existed.
    const updated = renderUpdateBody({ currentBody: template, content: CONTENT });

    expect(updated).toContain(MANAGED_SECTIONS.descriptionOfChange.start);
    expect(updated).toContain(CONTENT.descriptionOfChange);
    expect(updated).toContain(MANAGED_SECTIONS.issues.start);
    expect(updated).toContain(CONTENT.issues);
    // Self-upgraded: the next update on this same body can use the fast path.
    const updatedAgain = renderUpdateBody({ currentBody: updated, content: OTHER_CONTENT });
    expect(updatedAgain).toContain(OTHER_CONTENT.descriptionOfChange);
    expect(updatedAgain).not.toContain(CONTENT.descriptionOfChange);
  });

  it('self-heals a real hand-written legacy PR body (opened before this automation existed)', () => {
    const legacyBody = [
      '## Description of change',
      '',
      '- **TTAHUB-3728:** Fix CLASS help drawer on the profile page of the RTR.',
      '- **TTAHUB-5576:** Prevent FK error when saving an objective deleted in another tab',
      '',
      '## How to test',
      '',
      '- **TTAHUB-3728:** Class help drawer should no longer have invalid links at the top.',
      '',
      '## Jira Issue(s)',
      '',
      '* https://jira.acf.gov/browse/TTAHUB-3728',
      '* https://jira.acf.gov/browse/TTAHUB-5576',
      '',
      '## Checklists',
      '',
      '### Every PR',
      '',
      '- [x] Linked Jira issue',
      '- [ ] JIRA issue status updated',
    ].join('\n');

    const updated = renderUpdateBody({ currentBody: legacyBody, content: CONTENT });

    expect(updated).toContain(CONTENT.descriptionOfChange);
    expect(updated).not.toContain('TTAHUB-3728');
    expect(updated).toContain('- [x] Linked Jira issue');
    expect(updated).toContain('- [ ] JIRA issue status updated');
  });

  it('throws when a section has neither markers nor its heading (fail rather than corrupt)', () => {
    const noHeading = template.replace('## How to test', '## How 2 test');
    expect(() => renderUpdateBody({ currentBody: noHeading, content: CONTENT })).toThrow(
      /missing a "## How to test" section/
    );
  });

  it('is idempotent: applying the same content twice produces the same body', () => {
    const created = renderCreateBody({ template, content: CONTENT });
    const updatedOnce = renderUpdateBody({ currentBody: created, content: CONTENT });
    const updatedTwice = renderUpdateBody({ currentBody: updatedOnce, content: CONTENT });

    expect(updatedTwice).toBe(updatedOnce);
  });

  it('inserts content containing $-tokens verbatim, not as String.replace patterns', () => {
    const created = renderCreateBody({ template, content: CONTENT });
    const dollarContent = {
      ...CONTENT,
      descriptionOfChange: "- Costs $5 and uses $& $' $` $1 $$ literally.",
    };

    const updated = renderUpdateBody({ currentBody: created, content: dollarContent });

    expect(updated).toContain(dollarContent.descriptionOfChange);
    // The dangerous case: $' as a real String.replace pattern re-inserts
    // everything after the match, which would duplicate the rest of the
    // body - including the real Production Deploy checklist - rather than
    // just inserting the literal two characters "$'".
    expect(countOccurrences(updated, '### Production Deploy')).toBe(1);
    expect(countOccurrences(updated, MANAGED_SECTIONS.descriptionOfChange.start)).toBe(1);
  });

  it('does not duplicate or leave stale markers when content changes across repeated updates', () => {
    const created = renderCreateBody({ template, content: CONTENT });
    const firstUpdate = renderUpdateBody({ currentBody: created, content: OTHER_CONTENT });
    const secondUpdate = renderUpdateBody({ currentBody: firstUpdate, content: CONTENT });

    Object.values(MANAGED_SECTIONS).forEach((markers) => {
      expect(countOccurrences(secondUpdate, markers.start)).toBe(1);
      expect(countOccurrences(secondUpdate, markers.end)).toBe(1);
    });

    expect(secondUpdate).toContain(CONTENT.descriptionOfChange);
    expect(secondUpdate).not.toContain(OTHER_CONTENT.descriptionOfChange);
  });
});

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}
