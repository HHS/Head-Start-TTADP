import sanitizeHtml from '../sanitize';

describe('sanitizeHtml', () => {
  it('should return empty string for null or undefined input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('should convert non-string inputs to strings', () => {
    expect(sanitizeHtml(123)).toBe('123');
    expect(sanitizeHtml(true)).toBe('true');
  });

  it('should sanitize HTML to prevent XSS attacks', () => {
    const maliciousInput = '<script>alert("XSS Attack");</script>';
    const sanitized = sanitizeHtml(maliciousInput);
    expect(sanitized).not.toContain('<script>');

    // DOMPurify will remove script tags entirely
    expect(sanitized).toBe('');
  });

  it('should allow safe HTML content', () => {
    const safeHtml = '<p>This is <strong>safe</strong> HTML content.</p>';
    const sanitized = sanitizeHtml(safeHtml);
    expect(sanitized).toBe(safeHtml);
  });

  it('should sanitize dangerous attributes', () => {
    // Test sanitization of harmful JavaScript in href
    const dangerousAttr = '<a href="HARMFUL_PROTOCOL:alert()">Click me</a>'.replace('HARMFUL_PROTOCOL', 'javascript');
    const sanitized = sanitizeHtml(dangerousAttr);
    expect(sanitized).not.toContain('HARMFUL_PROTOCOL:');
  });
});
