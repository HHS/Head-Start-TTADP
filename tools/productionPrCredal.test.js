const {
  validateProductionPrContent,
  extractJiraKeys,
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

describe('extractExpectedJiraKeys', () => {
  it('collects keys from subject, prTitle, and prBody across all commits', () => {
    const releaseCommits = [
      {
        sha: 'a',
        subject: 'TTAHUB-1 - Foo (#1)',
        prTitle: 'TTAHUB-1 - Foo',
        prBody: 'Fixes TTAHUB-2 too',
      },
      { sha: 'b', subject: 'Hotfix: typo', prTitle: null, prBody: null },
    ];

    expect(extractExpectedJiraKeys(releaseCommits)).toEqual(['TTAHUB-1', 'TTAHUB-2']);
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
