import fs from 'fs';
import path from 'path';
import { DISPLAY_DATE_FORMATS } from './constants';

describe('DISPLAY_DATE_FORMATS', () => {
  /**
   * The list only works if it matches what the form date picker will let a user
   * submit. frontend/src/utils.js is read as text rather than imported: it pulls
   * in browser-side dependencies that have no place in the backend Jest run, and
   * the point here is the literal list, not the module's behavior.
   */
  it('matches frontend/src/utils.js SUPPORTED_DATE_FORMATS', () => {
    const utils = fs.readFileSync(
      path.join(__dirname, '..', 'frontend', 'src', 'utils.js'),
      'utf8'
    );

    const match = utils.match(/export const SUPPORTED_DATE_FORMATS = \[([^\]]*)\]/);
    expect(match).not.toBeNull();

    const frontendFormats = (match[1].match(/'([^']+)'/g) || []).map((quoted) =>
      quoted.slice(1, -1)
    );

    expect(frontendFormats.length).toBeGreaterThan(0);
    expect([...DISPLAY_DATE_FORMATS].sort()).toEqual([...frontendFormats].sort());
  });
});
