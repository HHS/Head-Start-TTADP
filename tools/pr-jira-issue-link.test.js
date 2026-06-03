const { extractIssuesSection, validatePullRequestBody } = require('./pr-jira-issue-link');

describe('PR Jira issue link validation', () => {
  it('extracts the Jira Issue(s) section from the PR body', () => {
    const body = `## Description of change

- Update dependencies.

## Jira Issue(s)

* https://jira.acf.gov/browse/TTAHUB-5247

## Checklists

- [ ] Code is meaningfully tested
`;

    expect(extractIssuesSection(body)).toContain('TTAHUB-5247');
  });

  it('passes when the Jira Issue(s) section contains a valid Jira issue link', () => {
    const result = validatePullRequestBody(`## Jira Issue(s)

* https://jira.acf.gov/browse/TTAHUB-5247
`);

    expect(result).toEqual({
      valid: true,
      jiraKeys: ['TTAHUB-5247'],
      message: 'Validated Jira issue link(s): TTAHUB-5247',
    });
  });

  it('fails when the Jira Issue(s) section is missing', () => {
    const result = validatePullRequestBody(`## Description of change

- Update a dependency.
`);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('add a Jira issue link');
  });

  it('fails when the placeholder is still present', () => {
    const result = validatePullRequestBody(`## Jira Issue(s)

* https://jira.acf.gov/browse/TTAHUB-0
`);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('remove the TTAHUB-0 placeholder');
  });

  it('fails when the placeholder and a real issue link both appear', () => {
    const result = validatePullRequestBody(`## Jira Issue(s)

* https://jira.acf.gov/browse/TTAHUB-0
* https://jira.acf.gov/browse/TTAHUB-5247
`);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('remove the TTAHUB-0 placeholder');
  });

  it('ignores the template comment that mentions TTAHUB-0 when a real issue link is present', () => {
    const result = validatePullRequestBody(`## Jira Issue(s)

<!-- Link a Jira issue for this PR. Replace TTAHUB-0 before requesting review. -->
* https://jira.acf.gov/browse/TTAHUB-5247
`);

    expect(result).toEqual({
      valid: true,
      jiraKeys: ['TTAHUB-5247'],
      message: 'Validated Jira issue link(s): TTAHUB-5247',
    });
  });

  it('fails when the Jira Issue(s) section contains only a bare Jira key', () => {
    const result = validatePullRequestBody(`## Jira Issue(s)

* TTAHUB-5247
`);

    expect(result.valid).toBe(false);
    expect(result.message).toContain(
      'Use the full https://jira.acf.gov/browse/TTAHUB-#### issue link format'
    );
  });

  it('fails when the Jira issue link is only outside the Jira Issue(s) section', () => {
    const result = validatePullRequestBody(`## Description of change

- https://jira.acf.gov/browse/TTAHUB-5247 update dependencies.

## Jira Issue(s)

* None provided yet
`);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Jira Issue(s)');
    expect(result.message).toContain('TTAHUB-5247');
  });

  it('accepts the fallback Issue heading used by some handwritten PR bodies', () => {
    const result = validatePullRequestBody(`## Issue

* https://jira.acf.gov/browse/TTAHUB-5247
`);

    expect(result.valid).toBe(true);
    expect(result.jiraKeys).toEqual(['TTAHUB-5247']);
  });

  it('accepts the previous Issue(s) heading for backward compatibility', () => {
    const result = validatePullRequestBody(`## Issue(s)

* https://jira.acf.gov/browse/TTAHUB-5247
`);

    expect(result.valid).toBe(true);
    expect(result.jiraKeys).toEqual(['TTAHUB-5247']);
  });
});
