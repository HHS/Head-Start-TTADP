import sanitizeRequestBody from './sanitizeRequestBody';

describe('sanitizeRequestBody middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should sanitize malicious HTML in request body string fields', () => {
    req.body = {
      purpose: '<script>alert("XSS")</script>',
      notes: 'normal notes',
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.purpose).not.toContain('<script>');
    expect(req.body.notes).toEqual('normal notes');
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize nested object fields recursively', () => {
    req.body = {
      data: {
        purpose: '<img src="x" onerror="alert(\'XSS\')" />',
        communicationDate: '2025-01-01',
      },
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.data.purpose).not.toContain('<img');
    expect(req.body.data.communicationDate).toEqual('2025-01-01');
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize array items recursively', () => {
    req.body = {
      recipients: [
        { name: '<b>Recipient 1</b>' },
        { name: 'Recipient 2' },
      ],
    };

    sanitizeRequestBody(req, res, next);

    // Safe tags like <b> are preserved
    expect(req.body.recipients[0].name).toContain('<b>');
    expect(req.body.recipients[1].name).toEqual('Recipient 2');
    expect(next).toHaveBeenCalled();
  });

  it('should preserve non-string values (numbers, booleans, null)', () => {
    req.body = {
      pageNumber: 1,
      isActive: true,
      description: 'Test',
      nullValue: null,
      undefinedValue: undefined,
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.pageNumber).toEqual(1);
    expect(req.body.isActive).toEqual(true);
    expect(req.body.description).toEqual('Test');
    expect(req.body.nullValue).toEqual(null);
    expect(req.body.undefinedValue).toEqual(undefined);
    expect(next).toHaveBeenCalled();
  });

  it('should handle empty strings without converting to "about:blank"', () => {
    req.body = {
      emptyField: '',
      normalField: 'value',
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.emptyField).toEqual('');
    expect(req.body.normalField).toEqual('value');
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize encoded HTML in request body', () => {
    req.body = {
      content: '%3Cscript%3Ealert(%22XSS%22)%3C%2fscript%3E',
    };

    sanitizeRequestBody(req, res, next);

    // The encoded script should be decoded and sanitized
    expect(req.body.content).not.toContain('<script>');
    expect(next).toHaveBeenCalled();
  });

  it('should handle deeply nested structures', () => {
    req.body = {
      level1: {
        level2: {
          level3: {
            value: '<h1>Malicious</h1>',
          },
        },
      },
    };

    sanitizeRequestBody(req, res, next);

    // Safe tags like <h1> are preserved
    expect(req.body.level1.level2.level3.value).toContain('<h1>');
    expect(next).toHaveBeenCalled();
  });

  it('should handle arrays of strings', () => {
    req.body = {
      tags: [
        '<script>alert("XSS")</script>',
        'normal-tag',
        '<img src="x" onerror="alert()" />',
      ],
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.tags[0]).not.toContain('<script>');
    expect(req.body.tags[1]).toEqual('normal-tag');
    expect(req.body.tags[2]).not.toContain('<img');
    expect(next).toHaveBeenCalled();
  });

  it('should handle communication log data structure', () => {
    req.body = {
      data: {
        purpose: '<b>Injected</b>',
        notes: '<script>alert("XSS")</script>',
        communicationDate: '2025-01-01',
        duration: 60,
        otherStaff: [
          { label: '<img src="x" />', value: 1 },
          { label: 'Staff Name', value: 2 },
        ],
      },
    };

    sanitizeRequestBody(req, res, next);

    // Safe tags like <b> are preserved
    expect(req.body.data.purpose).toContain('<b>');
    // Dangerous tags like <script> are removed
    expect(req.body.data.notes).not.toContain('<script>');
    expect(req.body.data.communicationDate).toEqual('2025-01-01');
    expect(req.body.data.duration).toEqual(60);
    // Dangerous tags like <img> are removed
    expect(req.body.data.otherStaff[0].label).not.toContain('<img');
    expect(req.body.data.otherStaff[1].label).toEqual('Staff Name');
    expect(next).toHaveBeenCalled();
  });

  it('should handle missing body gracefully', () => {
    req.body = undefined;

    sanitizeRequestBody(req, res, next);

    expect(req.body).toEqual(undefined);
    expect(next).toHaveBeenCalled();
  });

  it('should handle null body gracefully', () => {
    req.body = null;

    sanitizeRequestBody(req, res, next);

    expect(req.body).toEqual(null);
    expect(next).toHaveBeenCalled();
  });

  it('should call next when body is not an object', () => {
    req.body = 'string body';

    sanitizeRequestBody(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle javascript: URLs in body data', () => {
    req.body = {
      // eslint-disable-next-line no-script-url
      redirectUrl: 'javascript:alert("XSS")',
      normalUrl: 'https://example.com',
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.redirectUrl).toEqual('about:blank');
    // sanitizeUrl may add trailing slash to URLs
    expect(req.body.normalUrl).toMatch(/^https:\/\/example\.com\/?$/);
    expect(next).toHaveBeenCalled();
  });

  it('should handle mixed arrays with different types', () => {
    req.body = {
      mixedArray: [
        '<script>alert("XSS")</script>',
        42,
        { name: '<img src="x" />' },
        true,
        'normal string',
      ],
    };

    sanitizeRequestBody(req, res, next);

    expect(req.body.mixedArray[0]).not.toContain('<script>');
    expect(req.body.mixedArray[1]).toEqual(42);
    expect(req.body.mixedArray[2].name).not.toContain('<img');
    expect(req.body.mixedArray[3]).toEqual(true);
    expect(req.body.mixedArray[4]).toEqual('normal string');
    expect(next).toHaveBeenCalled();
  });
});
