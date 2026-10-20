import editorLinkCallback, { normalizeLinkTarget } from './editorLinkCallback';

describe('normalizeLinkTarget', () => {
  it('leaves links with a scheme unchanged', () => {
    expect(normalizeLinkTarget('https://example.com/a?b=c')).toBe('https://example.com/a?b=c');
    expect(normalizeLinkTarget('https://example.com:8443/a')).toBe('https://example.com:8443/a');
    expect(normalizeLinkTarget('mailto:someone@example.com')).toBe('mailto:someone@example.com');
    expect(normalizeLinkTarget('tel:5551234')).toBe('tel:5551234');
    expect(normalizeLinkTarget('tel:+1-555-123-4567')).toBe('tel:+1-555-123-4567');
  });

  it('prefixes scheme-less host and port links with http://', () => {
    expect(normalizeLinkTarget('example.com:8080/path')).toBe('http://example.com:8080/path');
    expect(normalizeLinkTarget('example.com:8080')).toBe('http://example.com:8080');
    expect(normalizeLinkTarget('example.com:8080?q=1')).toBe('http://example.com:8080?q=1');
    expect(normalizeLinkTarget('localhost:3000/admin')).toBe('http://localhost:3000/admin');
  });

  it('leaves relative and anchor links unchanged', () => {
    expect(normalizeLinkTarget('/activity-reports')).toBe('/activity-reports');
    expect(normalizeLinkTarget('#section')).toBe('#section');
  });

  it('prefixes scheme-less links with http://', () => {
    expect(normalizeLinkTarget('example.com')).toBe('http://example.com');
    expect(normalizeLinkTarget('  www.example.com/path ')).toBe('http://www.example.com/path');
  });

  it('turns bare email addresses into mailto links', () => {
    expect(normalizeLinkTarget('someone@example.com')).toBe('mailto:someone@example.com');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeLinkTarget('')).toBe('');
    expect(normalizeLinkTarget('   ')).toBe('');
  });

  it('handles very long input quickly', () => {
    const start = Date.now();
    normalizeLinkTarget(`mailto:${'a'.repeat(200000)}`);
    normalizeLinkTarget('a'.repeat(200000));
    normalizeLinkTarget(`${'a.'.repeat(100000)}:x`);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe('editorLinkCallback', () => {
  it('normalizes the target and keeps the other params', () => {
    expect(
      editorLinkCallback({ title: 'Example', target: 'example.com', targetOption: '_blank' })
    ).toEqual({ title: 'Example', target: 'http://example.com', targetOption: '_blank' });
  });
});
