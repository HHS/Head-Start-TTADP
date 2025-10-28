import sanitizeRequestBody from './sanitizeRequestBody';
import * as loggerModule from '../logger';

jest.mock('../logger');

describe('sanitizeRequestBody middleware', () => {
  let req;
  let res;
  let next;
  let middleware;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
    middleware = sanitizeRequestBody(); // Use default limits
  });

  it('should sanitize malicious HTML in request body string fields', () => {
    req.body = {
      purpose: '<script>alert("XSS")</script>',
      notes: 'normal notes',
    };

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

    expect(req.body.emptyField).toEqual('');
    expect(req.body.normalField).toEqual('value');
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize encoded HTML in request body', () => {
    req.body = {
      content: '%3Cscript%3Ealert(%22XSS%22)%3C%2fscript%3E',
    };

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

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

    middleware(req, res, next);

    expect(req.body).toEqual(undefined);
    expect(next).toHaveBeenCalled();
  });

  it('should handle null body gracefully', () => {
    req.body = null;

    middleware(req, res, next);

    expect(req.body).toEqual(null);
    expect(next).toHaveBeenCalled();
  });

  it('should call next when body is not an object', () => {
    req.body = 'string body';

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle plain text URLs without stripping protocols', () => {
    req.body = {
      // Plain text strings are not parsed as URLs, just sanitized as text
      // eslint-disable-next-line no-script-url
      redirectUrl: 'javascript:alert("XSS")',
      normalUrl: 'https://example.com',
    };

    middleware(req, res, next);

    // DOMPurify sanitizes these as plain text, not as HTML/URLs
    // The javascript: protocol is left as-is since it's plain text
    // eslint-disable-next-line no-script-url
    expect(req.body.redirectUrl).toEqual('javascript:alert("XSS")');
    expect(req.body.normalUrl).toEqual('https://example.com');
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

    middleware(req, res, next);

    expect(req.body.mixedArray[0]).not.toContain('<script>');
    expect(req.body.mixedArray[1]).toEqual(42);
    expect(req.body.mixedArray[2].name).not.toContain('<img');
    expect(req.body.mixedArray[3]).toEqual(true);
    expect(req.body.mixedArray[4]).toEqual('normal string');
    expect(next).toHaveBeenCalled();
  });

  it('should retain rich text formatting in context property', () => {
    const richTextContent = '<h3><strong>Some</strong> <em>rich</em> <ins>text</ins> <del>that</del> is formatted.</h3>\n<ol>\n<li>Item A</li>\n<li>Item B</li>\n<li>Item C</li>\n</ol>\n<p>Second List</p>\n<ul>\n<li>Bullet Item A</li>\n<li>Bullet Item B</li>\n</ul>\n';

    req.body = {
      context: richTextContent,
    };

    middleware(req, res, next);

    // Verify all safe formatting tags are preserved
    expect(req.body.context).toContain('<h3>');
    expect(req.body.context).toContain('<strong>');
    expect(req.body.context).toContain('<em>');
    expect(req.body.context).toContain('<ins>');
    expect(req.body.context).toContain('<del>');
    expect(req.body.context).toContain('<ol>');
    expect(req.body.context).toContain('<li>');
    expect(req.body.context).toContain('<ul>');
    expect(req.body.context).toContain('<p>');
    expect(req.body.context).toContain('Item A');
    expect(req.body.context).toContain('Item B');
    expect(req.body.context).toContain('Item C');
    expect(req.body.context).toContain('Bullet Item A');
    expect(req.body.context).toContain('Bullet Item B');
    expect(next).toHaveBeenCalled();
  });

  it('should handle errors and log them with winston logger', () => {
    // Create an object that throws when trying to iterate over keys
    req.body = new Proxy({}, {
      ownKeys() {
        throw new Error('Test error');
      },
    });

    middleware(req, res, next);

    expect(loggerModule.logger.error).toHaveBeenCalledWith(
      'Error sanitizing request body:',
      expect.objectContaining({
        error: 'Test error',
        stack: expect.any(String),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Test error',
    });
  });

  describe('payload size limit', () => {
    it('should reject payloads exceeding the size limit', () => {
      const largePayload = 'x'.repeat(1000001); // 1MB + 1 byte
      req.body = { data: largePayload };

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum size of 1000000 bytes',
      });
      expect(loggerModule.logger.warn).toHaveBeenCalledWith(
        'Request body exceeds maximum size',
        expect.objectContaining({ size: expect.any(Number), maxSize: 1000000 }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept payloads within the size limit', () => {
      const validPayload = 'x'.repeat(1000); // 1KB
      req.body = { data: validPayload };

      middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should allow custom size limits', () => {
      const customMiddleware = sanitizeRequestBody(500); // 500 bytes
      const largePayload = 'x'.repeat(501);
      req.body = { data: largePayload };

      customMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum size of 500 bytes',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should calculate payload size from JSON stringified body', () => {
      const customMiddleware = sanitizeRequestBody(100); // 100 bytes
      req.body = { key: 'x'.repeat(200) }; // Will be more than 100 bytes when stringified

      customMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('recursion depth limit', () => {
    it('should reject objects exceeding recursion depth limit', () => {
      // Depth limit of 3 (allows 0-3, rejects at 4+)
      const customMiddleware = sanitizeRequestBody(1000000, 3);

      // Create deeply nested object at depth 4
      req.body = {
        l1: { l2: { l3: { l4: { value: 'too deep' } } } },
      };

      customMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Sanitization depth limit exceeded: maximum depth is 3',
      });
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error sanitizing request body:',
        expect.objectContaining({
          error: 'Sanitization depth limit exceeded: maximum depth is 3',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept objects within recursion depth limit', () => {
      const customMiddleware = sanitizeRequestBody(1000000, 5);

      // Create deeply nested object at depth 4
      req.body = {
        l1: { l2: { l3: { l4: { value: 'OK' } } } },
      };

      customMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject deeply nested arrays exceeding depth limit', () => {
      const customMiddleware = sanitizeRequestBody(1000000, 2); // Depth limit of 2

      req.body = {
        arr: [
          [
            [
              [
                'too deep',
              ],
            ],
          ],
        ],
      };

      customMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: expect.stringContaining('Sanitization depth limit exceeded'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use default depth limit of 100', () => {
      const testMiddleware = sanitizeRequestBody(); // Use defaults

      // Create object at depth 100 (nesting 50 levels should be fine with default of 100)
      let deepObj = { value: 'deep' };
      for (let i = 0; i < 50; i += 1) {
        deepObj = { nested: deepObj };
      }
      req.body = deepObj;

      testMiddleware(req, res, next);

      // Should succeed with default limit of 100
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should throw depth limit error and not continue processing', () => {
      const customMiddleware = sanitizeRequestBody(1000000, 1);

      req.body = {
        l1: {
          l2: {
            malicious: '<script>alert("XSS")</script>',
          },
        },
      };

      customMiddleware(req, res, next);

      // Error should be thrown before sanitization is complete
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('combined limits (size and depth)', () => {
    it('should check size limit before processing depth', () => {
      const customMiddleware = sanitizeRequestBody(500, 2);
      const largePayload = 'x'.repeat(501);
      req.body = {
        a: {
          b: {
            c: largePayload,
          },
        },
      };

      customMiddleware(req, res, next);

      // Should fail on size first
      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload Too Large',
        message: expect.any(String),
      });
    });

    it('should handle both limits correctly in same request', () => {
      const customMiddleware = sanitizeRequestBody(10000, 3);

      // Valid size, but too deep
      req.body = {
        l1: {
          l2: {
            l3: {
              l4: { value: 'test' },
            },
          },
        },
      };

      customMiddleware(req, res, next);

      // Should fail on depth
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: expect.stringContaining('Sanitization depth limit exceeded'),
      });
    });
  });
});
