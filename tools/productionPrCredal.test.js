const {
  validateProductionPrContent,
  extractJiraKeys,
  extractDeclaredJiraKeys,
  extractExpectedJiraKeys,
  validateIssuesAgainstReleaseScope,
  parseCredalResponse,
  buildCredalRequestBody,
  callCredalAgent,
} = require('./productionPrCredal');

const VALID_CONTENT = {
  title: '[Prod] Recipient timeline communication logs',
  descriptionOfChange:
    '- [TTAHUB-5660](https://jira.acf.gov/browse/TTAHUB-5660) Add communication logs to recipient timelines.',
  howToTest: '- Passing automated checks in the merged PRs; smoke test in staging.',
  issues: '* https://jira.acf.gov/browse/TTAHUB-5660',
};

describe('parseCredalResponse', () => {
  it('extracts and parses response.message from the sendMessage envelope', () => {
    const envelope = {
      sendChatResult: {
        response: {
          message: JSON.stringify(VALID_CONTENT),
          structuredOutput: { ...VALID_CONTENT, descriptionOfChange: 'mismatched, ignored' },
        },
      },
    };

    expect(parseCredalResponse(JSON.stringify(envelope))).toEqual(VALID_CONTENT);
  });

  it('throws when the raw body is not valid JSON', () => {
    expect(() => parseCredalResponse('not json')).toThrow(/not valid JSON/);
  });

  it('throws when sendChatResult.response.message is missing', () => {
    expect(() => parseCredalResponse(JSON.stringify({ sendChatResult: { response: {} } }))).toThrow(
      /missing sendChatResult.response.message/
    );
  });

  it('throws when message is present but not valid JSON', () => {
    const envelope = { sendChatResult: { response: { message: 'not json' } } };
    expect(() => parseCredalResponse(JSON.stringify(envelope))).toThrow(
      /"message" field was not valid JSON/
    );
  });
});

describe('validateProductionPrContent', () => {
  it('passes valid content through unchanged', () => {
    expect(validateProductionPrContent(VALID_CONTENT)).toEqual(VALID_CONTENT);
  });

  it('strips unknown fields (e.g. an accidental structuredOutput)', () => {
    const result = validateProductionPrContent({ ...VALID_CONTENT, structuredOutput: {} });
    expect(result).toEqual(VALID_CONTENT);
  });

  it('rejects a missing title', () => {
    const { title, ...rest } = VALID_CONTENT;
    expect(() => validateProductionPrContent(rest)).toThrow(/"title" is required/);
  });

  it('rejects a title that does not start with [Prod]', () => {
    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, title: 'Recipient timeline logs' })
    ).toThrow(/must start with "\[Prod\]"/);
  });

  it('rejects a title longer than 80 characters', () => {
    const longTitle = `[Prod] ${'x'.repeat(80)}`;
    expect(() => validateProductionPrContent({ ...VALID_CONTENT, title: longTitle })).toThrow();
  });

  it('rejects an issues line that is not a Jira issue link', () => {
    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, issues: '* not a jira link' })
    ).toThrow(/isn't a Jira issue link/);
  });

  it('accepts multiple valid Jira issue link lines', () => {
    const issues = [
      '* https://jira.acf.gov/browse/TTAHUB-1',
      '* https://jira.acf.gov/browse/TTAHUB-2',
    ].join('\n');

    expect(validateProductionPrContent({ ...VALID_CONTENT, issues }).issues).toBe(issues);
  });

  it('rejects an empty descriptionOfChange', () => {
    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: '' })
    ).toThrow();
  });

  it('rejects an embedded "##" heading in descriptionOfChange (fake Jira Issue(s) injection)', () => {
    const malicious = [
      '- Legit change.',
      '',
      '## Jira Issue(s)',
      '',
      '* https://jira.acf.gov/browse/TTAHUB-9999',
    ].join('\n');

    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: malicious })
    ).toThrow(/must not contain a markdown "##" heading/);
  });

  it('rejects an embedded "##" heading in howToTest', () => {
    const malicious = '- Normal step.\n## Another section\nMore text.';

    expect(() => validateProductionPrContent({ ...VALID_CONTENT, howToTest: malicious })).toThrow(
      /must not contain a markdown "##" heading/
    );
  });

  it('allows a "###" (H3) heading, which cannot hijack the Slack/Jira extractor', () => {
    const withH3 = '- Legit change.\n### Not a top-level heading\nMore text.';
    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: withH3 })
    ).not.toThrow();
  });

  it('allows a literal "##" with no space or heading-like text (e.g. a code comment)', () => {
    const withHashHash = '- Legit change mentioning `##` as a style, not a heading.';
    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: withHashHash })
    ).not.toThrow();
  });

  it('rejects a managed section end marker echoed into descriptionOfChange', () => {
    const echoed =
      '- Legit change.\n<!-- production-pr:description-of-change:end -->\n- Text that would land outside the section.';

    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: echoed })
    ).toThrow(/must not contain a production-pr managed section marker/);
  });

  it('rejects a managed section start marker echoed into howToTest', () => {
    const echoed = '- Step one.\n<!-- production-pr:how-to-test:start -->';

    expect(() => validateProductionPrContent({ ...VALID_CONTENT, howToTest: echoed })).toThrow(
      /must not contain a production-pr managed section marker/
    );
  });

  it('rejects a marker written without the usual spacing', () => {
    const echoed = '- Change.<!--production-pr:jira-issues:end-->';

    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: echoed })
    ).toThrow(/must not contain a production-pr managed section marker/);
  });

  it('rejects the marker namespace even without the comment delimiters', () => {
    const echoed = '- Change mentioning production-pr:description-of-change:end in plain text.';

    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: echoed })
    ).toThrow(/must not contain a production-pr managed section marker/);
  });

  it('allows an unrelated HTML comment', () => {
    const withComment = '- Legit change.\n<!-- reviewer note -->';

    expect(() =>
      validateProductionPrContent({ ...VALID_CONTENT, descriptionOfChange: withComment })
    ).not.toThrow();
  });

  it('accepts an empty issues field, which is valid only for a release with no tickets', () => {
    expect(validateProductionPrContent({ ...VALID_CONTENT, issues: '' }).issues).toBe('');
  });

  it('treats a whitespace only issues field as empty', () => {
    expect(validateProductionPrContent({ ...VALID_CONTENT, issues: ' \n ' }).issues).toBe('');
  });

  it('still rejects placeholder text in place of an empty issues field', () => {
    expect(() => validateProductionPrContent({ ...VALID_CONTENT, issues: '* N/A' })).toThrow(
      /isn't a Jira issue link/
    );
  });
});

describe('extractJiraKeys', () => {
  it('extracts and dedupes keys regardless of case', () => {
    expect(extractJiraKeys('ttahub-1 and TTAHUB-1 and TTAHUB-2')).toEqual(['TTAHUB-1', 'TTAHUB-2']);
  });

  it('returns an empty array when there are no keys', () => {
    expect(extractJiraKeys('nothing here')).toEqual([]);
  });

  it('handles undefined input', () => {
    expect(extractJiraKeys(undefined)).toEqual([]);
  });

  it("handles null input (e.g. an unresolved commit's prTitle/prBody)", () => {
    expect(extractJiraKeys(null)).toEqual([]);
  });
});

// Shaped like a real GitHub PR body: CRLF line endings, the template's
// instructional comment, and the issues link under "## Jira Issue(s)".
const prBodyWithIssuesSection = ({
  heading = 'Jira Issue(s)',
  key,
  description = 'Adds a thing.',
}) =>
  [
    '## Description of change',
    '',
    description,
    '',
    `## ${heading}`,
    '',
    '<!-- Link a Jira issue for this PR. Replace TTAHUB-0 before requesting review. -->',
    `* https://jira.acf.gov/browse/${key}`,
    '',
    '## Checklists',
  ].join('\r\n');

describe('extractDeclaredJiraKeys', () => {
  it('counts a ticket in the commit subject or the PR title', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: 'TTAHUB-1 - Foo (#1)',
        prTitle: '[TTAHUB-1] Foo',
        prBody: '',
      })
    ).toEqual(['TTAHUB-1']);
  });

  it('counts a ticket linked in the Jira Issue(s) section, even when the title has none', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: 'fix class help drawer (#4026)',
        prTitle: 'Fix RTR profile CLASS help drawer',
        prBody: prBodyWithIssuesSection({ key: 'TTAHUB-3728' }),
      })
    ).toEqual(['TTAHUB-3728']);
  });

  it('counts a ticket linked under the "Issue(s)" heading variant', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: 'Bump x',
        prTitle: 'Bump x',
        prBody: prBodyWithIssuesSection({ heading: 'Issue(s)', key: 'TTAHUB-4915' }),
      })
    ).toEqual(['TTAHUB-4915']);
  });

  it('ignores a ticket mentioned only in prose, such as follow up work', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: '[TTAHUB-5662] Add communication purpose filters (#4018)',
        prTitle: '[TTAHUB-5662] Add communication purpose filters',
        prBody: prBodyWithIssuesSection({
          key: 'TTAHUB-5662',
          description: 'Follow up work is tracked separately in TTAHUB-5666.',
        }),
      })
    ).toEqual(['TTAHUB-5662']);
  });

  it('ignores a prose ticket when the title carries no ticket either', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: 'Do a thing (#1)',
        prTitle: 'Do a thing',
        prBody: 'This is separate from TTAHUB-5855.',
      })
    ).toEqual([]);
  });

  it('ignores a ticket that is not a link, even inside the issues section', () => {
    const prBody = ['## Jira Issue(s)', '', 'See TTAHUB-77 for background.'].join('\r\n');
    expect(extractDeclaredJiraKeys({ subject: 'x', prTitle: 'x', prBody })).toEqual([]);
  });

  it('counts the standalone "Jira:" line Dependabot pull requests use', () => {
    const prBody = [
      'Bumps the backend-minor-patch group with 10 updates.',
      'Jira: https://jira.acf.gov/browse/TTAHUB-4915',
      '',
      'Updates `foo` from 1 to 2.',
    ].join('\r\n');

    expect(
      extractDeclaredJiraKeys({
        subject: 'build(deps): bump the backend-minor-patch group (#4053)',
        prTitle: 'build(deps): bump the backend-minor-patch group',
        prBody,
      })
    ).toEqual(['TTAHUB-4915']);
  });

  it('does not count a "Jira:" link that sits mid sentence', () => {
    const prBody = 'Related Jira: https://jira.acf.gov/browse/TTAHUB-9';
    expect(extractDeclaredJiraKeys({ subject: 'x', prTitle: 'x', prBody })).toEqual([]);
  });

  it('handles an unresolved commit whose PR fields are null', () => {
    expect(
      extractDeclaredJiraKeys({ subject: 'Hotfix: typo', prTitle: null, prBody: null })
    ).toEqual([]);
  });

  it('returns each ticket once', () => {
    expect(
      extractDeclaredJiraKeys({
        subject: 'TTAHUB-8 - Foo',
        prTitle: 'TTAHUB-8 - Foo',
        prBody: prBodyWithIssuesSection({ key: 'TTAHUB-8' }),
      })
    ).toEqual(['TTAHUB-8']);
  });
});

describe('extractExpectedJiraKeys', () => {
  it('collects declared tickets across all commits and ignores prose mentions', () => {
    const releaseCommits = [
      {
        sha: 'a',
        subject: 'TTAHUB-1 - Foo (#1)',
        prTitle: 'TTAHUB-1 - Foo',
        prBody: prBodyWithIssuesSection({
          key: 'TTAHUB-2',
          description: 'Separate from TTAHUB-3.',
        }),
      },
      { sha: 'b', subject: 'Hotfix: typo', prTitle: null, prBody: null },
    ];

    expect(extractExpectedJiraKeys(releaseCommits)).toEqual(['TTAHUB-1', 'TTAHUB-2']);
  });

  it('is empty when no commit in the range declares a ticket', () => {
    const releaseCommits = [
      {
        sha: 'a',
        subject: 'build(deps): bump the frontend-minor-patch group (#4054)',
        prTitle: 'build(deps): bump the frontend-minor-patch group',
        prBody: 'Bumps the group with 4 updates.',
      },
    ];

    expect(extractExpectedJiraKeys(releaseCommits)).toEqual([]);
  });

  it('excludes the TTAHUB-0 placeholder even if it somehow appears in source data', () => {
    const releaseCommits = [
      { sha: 'a', subject: 'TTAHUB-0 placeholder', prTitle: null, prBody: null },
    ];
    expect(extractExpectedJiraKeys(releaseCommits)).toEqual([]);
  });

  it('returns an empty array for an empty release scope', () => {
    expect(extractExpectedJiraKeys([])).toEqual([]);
  });
});

describe('validateIssuesAgainstReleaseScope', () => {
  const releaseCommits = [
    {
      sha: 'a',
      subject: 'TTAHUB-5660 - Add communication logs (#1)',
      prTitle: 'TTAHUB-5660 - Add communication logs',
      prBody: '',
    },
  ];

  it('passes when issues exactly match the release scope', () => {
    expect(() =>
      validateIssuesAgainstReleaseScope('* https://jira.acf.gov/browse/TTAHUB-5660', releaseCommits)
    ).not.toThrow();
  });

  it('rejects an omitted ticket that is present in the release scope', () => {
    const twoTicketCommits = [
      ...releaseCommits,
      {
        sha: 'b',
        subject: 'TTAHUB-9999 - Other change (#2)',
        prTitle: 'TTAHUB-9999 - Other change',
        prBody: '',
      },
    ];

    expect(() =>
      validateIssuesAgainstReleaseScope(
        '* https://jira.acf.gov/browse/TTAHUB-5660',
        twoTicketCommits
      )
    ).toThrow(/missing ticket\(s\).*TTAHUB-9999/);
  });

  it('rejects an invented ticket not present in the release scope', () => {
    expect(() =>
      validateIssuesAgainstReleaseScope('* https://jira.acf.gov/browse/TTAHUB-9999', releaseCommits)
    ).toThrow(/includes ticket\(s\) not present.*TTAHUB-9999/);
  });

  it('rejects the TTAHUB-0 placeholder even if no other problem exists', () => {
    expect(() =>
      validateIssuesAgainstReleaseScope(
        '* https://jira.acf.gov/browse/TTAHUB-5660\n* https://jira.acf.gov/browse/TTAHUB-0',
        releaseCommits
      )
    ).toThrow(/placeholder TTAHUB-0/);
  });

  describe('when the release declares no tickets', () => {
    const ticketlessCommits = [
      {
        sha: 'a',
        subject: 'build(deps): bump the frontend-minor-patch group (#4054)',
        prTitle: 'build(deps): bump the frontend-minor-patch group',
        prBody: 'Bumps the group with 4 updates.',
      },
    ];

    it('accepts an empty issues field', () => {
      expect(() => validateIssuesAgainstReleaseScope('', ticketlessCommits)).not.toThrow();
    });

    it('rejects a ticket, since none is declared', () => {
      expect(() =>
        validateIssuesAgainstReleaseScope(
          '* https://jira.acf.gov/browse/TTAHUB-9999',
          ticketlessCommits
        )
      ).toThrow(/includes ticket\(s\) not present.*TTAHUB-9999/);
    });
  });

  it('rejects an empty issues field when the release does declare tickets', () => {
    expect(() => validateIssuesAgainstReleaseScope('', releaseCommits)).toThrow(
      /missing ticket\(s\).*TTAHUB-5660/
    );
  });

  it('rejects a ticket that is only mentioned in prose, as if it were declared', () => {
    const proseOnly = [
      {
        sha: 'a',
        subject: '[TTAHUB-5662] Add filters (#4018)',
        prTitle: '[TTAHUB-5662] Add filters',
        prBody: prBodyWithIssuesSection({
          key: 'TTAHUB-5662',
          description: 'Follow up work is tracked in TTAHUB-5666.',
        }),
      },
    ];

    expect(() =>
      validateIssuesAgainstReleaseScope(
        '* https://jira.acf.gov/browse/TTAHUB-5662\n* https://jira.acf.gov/browse/TTAHUB-5666',
        proseOnly
      )
    ).toThrow(/includes ticket\(s\) not present.*TTAHUB-5666/);

    expect(() =>
      validateIssuesAgainstReleaseScope('* https://jira.acf.gov/browse/TTAHUB-5662', proseOnly)
    ).not.toThrow();
  });
});

describe('buildCredalRequestBody', () => {
  it('JSON-stringifies the payload into the message field', () => {
    const payload = { mode: 'create', releaseCommits: [] };
    const body = buildCredalRequestBody({ payload, userEmail: 'ci@example.com' });

    expect(body).toEqual({
      agentId: 'e85a3cc2-5944-11f1-aad1-9f8702339566',
      message: JSON.stringify(payload),
      userEmail: 'ci@example.com',
    });
  });

  it('allows overriding the agentId', () => {
    const body = buildCredalRequestBody({
      payload: {},
      agentId: 'other-agent',
      userEmail: 'a@b.com',
    });
    expect(body.agentId).toBe('other-agent');
  });
});

describe('callCredalAgent', () => {
  const okResponse = (content) => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({ sendChatResult: { response: { message: JSON.stringify(content) } } }),
  });

  const baseArgs = {
    payload: {
      mode: 'create',
      releaseCommits: [
        {
          sha: 'abc1234',
          subject: 'TTAHUB-5660 - Add communication logs (#1)',
          prTitle: 'TTAHUB-5660 - Add communication logs',
          prBody: '',
        },
      ],
    },
    userEmail: 'ci@example.com',
    apiKey: 'test-key',
    retryDelayMs: 0,
  };

  it('returns validated content on a successful first attempt', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(okResponse(VALID_CONTENT));

    const result = await callCredalAgent({ ...baseArgs, fetchImpl });

    expect(result).toEqual(VALID_CONTENT);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchImpl.mock.calls[0];
    expect(endpoint).toBe('https://api.credal.acf.gov/api/v0/copilots/sendMessage');
    expect(options.headers.Authorization).toBe('Bearer test-key');
  });

  it('throws immediately when no API key is available', async () => {
    const fetchImpl = jest.fn();
    await expect(callCredalAgent({ ...baseArgs, apiKey: undefined, fetchImpl })).rejects.toThrow(
      /Missing Credal API key/
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retries on a 500 and succeeds on the next attempt', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce(okResponse(VALID_CONTENT));

    const result = await callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 });

    expect(result).toEqual(VALID_CONTENT);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts on repeated 5xx responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 2 })).rejects.toThrow(
      /status 503/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable 4xx response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 400 });

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 })).rejects.toThrow(
      /status 400/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a validation failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({ ...VALID_CONTENT, title: 'bad' }));

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 })).rejects.toThrow(
      /Credal response failed validation/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects and never returns content with an embedded heading smuggling an out-of-scope Jira link', async () => {
    const injected = {
      ...VALID_CONTENT,
      descriptionOfChange:
        '- Legit change.\n\n## Jira Issue(s)\n\n* https://jira.acf.gov/browse/TTAHUB-9999',
    };
    const fetchImpl = jest.fn().mockResolvedValue(okResponse(injected));

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 })).rejects.toThrow(
      /must not contain a markdown "##" heading/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects and never returns content that echoes a managed section marker', async () => {
    const echoed = {
      ...VALID_CONTENT,
      descriptionOfChange:
        '- Legit change.\n<!-- production-pr:description-of-change:end -->\n- Tail.',
    };
    const fetchImpl = jest.fn().mockResolvedValue(okResponse(echoed));

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 })).rejects.toThrow(
      /must not contain a production-pr managed section marker/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  describe('a release whose commits declare no tickets', () => {
    const ticketlessArgs = {
      ...baseArgs,
      payload: {
        mode: 'create',
        releaseCommits: [
          {
            sha: 'abc1234',
            subject: 'build(deps): bump the frontend-minor-patch group (#4054)',
            prTitle: 'build(deps): bump the frontend-minor-patch group',
            prBody: 'Bumps the group with 4 updates.',
          },
        ],
      },
    };

    it('succeeds with an empty issues field instead of failing every response', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(okResponse({ ...VALID_CONTENT, issues: '' }));

      const result = await callCredalAgent({ ...ticketlessArgs, fetchImpl });

      expect(result.issues).toBe('');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('still rejects a ticket Credal invents for it', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(okResponse(VALID_CONTENT));

      await expect(callCredalAgent({ ...ticketlessArgs, fetchImpl })).rejects.toThrow(
        /includes ticket\(s\) not present.*TTAHUB-5660/
      );
    });
  });

  it('does not retry an issues/release-scope mismatch, and never returns the content', async () => {
    const mismatched = { ...VALID_CONTENT, issues: '* https://jira.acf.gov/browse/TTAHUB-9999' };
    const fetchImpl = jest.fn().mockResolvedValue(okResponse(mismatched));

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3 })).rejects.toThrow(
      /includes ticket\(s\) not present/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on a timeout (AbortError) and succeeds on the next attempt', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(okResponse(VALID_CONTENT));

    const result = await callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 3, timeoutMs: 10 });

    expect(result).toEqual(VALID_CONTENT);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries on a network error and eventually throws the last error after maxAttempts', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

    await expect(callCredalAgent({ ...baseArgs, fetchImpl, maxAttempts: 2 })).rejects.toThrow(
      /ECONNRESET/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
