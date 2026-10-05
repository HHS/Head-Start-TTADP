import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { getImageSize } from 'plotly.js/src/traces/image/helpers';

const requireFromPlotly = createRequire(require.resolve('plotly.js/package.json'));
const parserPath = requireFromPlotly.resolve('probe-image-size/sync');

describe('Plotly image parsing', () => {
  it('reads SVG dimensions through the parser resolved by Plotly', () => {
    const parse = requireFromPlotly('probe-image-size/sync');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"></svg>';

    expect(parse(Buffer.from(svg))).toMatchObject({ width: 120, height: 80, type: 'svg' });
  });

  it('reads PNG dimensions from a base64 image', () => {
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

    expect(getImageSize(`data:image/png;base64,${png}`)).toMatchObject({
      width: 1,
      height: 1,
      type: 'png',
    });
  });

  it('rejects an unterminated SVG header without blocking on repeated opening tags', () => {
    // A child-process timeout can interrupt a synchronous parser regression;
    // Jest's timeout cannot interrupt a blocked event loop.
    const output = execFileSync(
      process.execPath,
      [
        '-e',
        `
      const parse = require(${JSON.stringify(parserPath)});
      const result = parse(Buffer.from('<a'.repeat(100000)));
      process.stdout.write(JSON.stringify(result));
    `,
      ],
      { timeout: 5000, encoding: 'utf8' }
    );

    expect(output).toBe('null');
  });
});
