const {
  validateProductionPrContent,
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
    payload: { mode: 'create', releaseCommits: [] },
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
