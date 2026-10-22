const {
  parseCommitRange,
  parseAssociatedPullRequest,
  buildReleaseCommit,
  resolveExistingProductionPr,
  buildReleaseScopePayload,
} = require('./productionPr');

describe('parseCommitRange', () => {
  it('parses sha/subject pairs separated by the unit separator', () => {
    const output = [
      `59fd1df10\x1fTTAHUB-5173 - Collab Report Activity Type Filter (#3626)`,
      `70d3a3fbc\x1f[TTAHUB-5660] Add communication logs to recipient timelines`,
    ].join('\n');

    expect(parseCommitRange(output)).toEqual([
      { sha: '59fd1df10', subject: 'TTAHUB-5173 - Collab Report Activity Type Filter (#3626)' },
      { sha: '70d3a3fbc', subject: '[TTAHUB-5660] Add communication logs to recipient timelines' },
    ]);
  });

  it('returns an empty array for an empty range', () => {
    expect(parseCommitRange('')).toEqual([]);
  });

  it('ignores blank lines', () => {
    const output = `\n59fd1df10\x1fOnly commit\n\n`;
    expect(parseCommitRange(output)).toEqual([{ sha: '59fd1df10', subject: 'Only commit' }]);
  });
});

describe('parseAssociatedPullRequest', () => {
  it('returns the PR merged into the target branch', () => {
    const pulls = [{ number: 3626, merged_at: '2026-09-01T00:00:00Z', base: { ref: 'main' } }];

    expect(parseAssociatedPullRequest(pulls, { mergedInto: 'main' })).toEqual(pulls[0]);
  });

  it('returns null when no PR in the list was merged into the target branch', () => {
    const pulls = [
      { number: 1, merged_at: null, base: { ref: 'main' } },
      { number: 2, merged_at: '2026-09-01T00:00:00Z', base: { ref: 'some-other-branch' } },
    ];

    expect(parseAssociatedPullRequest(pulls, { mergedInto: 'main' })).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(parseAssociatedPullRequest([], { mergedInto: 'main' })).toBeNull();
  });

  it('picks the most recently merged PR when more than one qualifies', () => {
    const pulls = [
      { number: 1, merged_at: '2026-09-01T00:00:00Z', base: { ref: 'main' } },
      { number: 2, merged_at: '2026-09-02T00:00:00Z', base: { ref: 'main' } },
    ];

    expect(parseAssociatedPullRequest(pulls, { mergedInto: 'main' }).number).toBe(2);
  });
});

describe('buildReleaseCommit', () => {
  it('normalizes a commit with a resolved PR', () => {
    const commit = {
      sha: '59fd1df10',
      subject: 'TTAHUB-5173 - Collab Report Activity Type Filter (#3626)',
    };
    const pr = {
      number: 3626,
      title: 'TTAHUB-5173 - Collab Report Activity Type Filter',
      body: 'Adds the filter.',
    };

    expect(buildReleaseCommit(commit, pr)).toEqual({
      sha: '59fd1df10',
      subject: 'TTAHUB-5173 - Collab Report Activity Type Filter (#3626)',
      prNumber: 3626,
      prTitle: 'TTAHUB-5173 - Collab Report Activity Type Filter',
      prBody: 'Adds the filter.',
    });
  });

  it('keeps normalized commit metadata instead of dropping an unresolved commit', () => {
    const commit = { sha: 'abc1234', subject: 'Hotfix: correct typo' };

    expect(buildReleaseCommit(commit, null)).toEqual({
      sha: 'abc1234',
      subject: 'Hotfix: correct typo',
      prNumber: null,
      prTitle: null,
      prBody: null,
    });
  });

  it('defaults a missing PR body to an empty string rather than null', () => {
    const commit = { sha: 'abc1234', subject: 'Some change (#1)' };
    const pr = { number: 1, title: 'Some change', body: null };

    expect(buildReleaseCommit(commit, pr).prBody).toBe('');
  });
});

describe('resolveExistingProductionPr', () => {
  it('returns null when there is no open production PR', () => {
    expect(resolveExistingProductionPr([])).toBeNull();
  });

  it('returns the single open production PR', () => {
    const pr = { number: 42, title: '[Prod] Something', body: 'body' };
    expect(resolveExistingProductionPr([pr])).toEqual(pr);
  });

  it('throws when more than one open production PR exists', () => {
    const pulls = [
      { number: 1, title: 'a', body: '' },
      { number: 2, title: 'b', body: '' },
    ];

    expect(() => resolveExistingProductionPr(pulls)).toThrow(/found 2/);
  });
});

describe('buildReleaseScopePayload', () => {
  const releaseCommits = [
    { sha: '59fd1df10', subject: 'subject', prNumber: 3626, prTitle: 'title', prBody: 'body' },
  ];

  it('builds a "create" payload when there is no existing production PR', () => {
    expect(buildReleaseScopePayload({ releaseCommits, existingProductionPr: null })).toEqual({
      mode: 'create',
      baseBranch: 'production',
      headBranch: 'main',
      releaseCommits,
      existingProductionPr: null,
    });
  });

  it('builds an "update" payload and normalizes the existing PR fields when one exists', () => {
    const existingProductionPr = {
      number: 42,
      title: '[Prod] Old title',
      body: '## Description of change\n',
      extraFieldFromGhCli: 'should be dropped',
    };

    const payload = buildReleaseScopePayload({ releaseCommits, existingProductionPr });

    expect(payload.mode).toBe('update');
    expect(payload.existingProductionPr).toEqual({
      number: 42,
      title: '[Prod] Old title',
      body: '## Description of change\n',
    });
  });

  it('honors a non-default base/head branch', () => {
    const payload = buildReleaseScopePayload({
      baseBranch: 'production',
      headBranch: 'main',
      releaseCommits: [],
      existingProductionPr: null,
    });

    expect(payload.baseBranch).toBe('production');
    expect(payload.headBranch).toBe('main');
  });
});
