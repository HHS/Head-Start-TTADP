import { validateListOfResources } from '../constants';

describe('validateListOfResources', () => {
  it('returns false if there is an invalid resource', () => {
    expect(validateListOfResources([{ value: 'https://test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'http://test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'https://www.test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'http://www.test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'file://test.com' }])).toBe(false);
    expect(validateListOfResources([{ value: 'http://test' }])).toBe(false);
    expect(validateListOfResources([{ value: 'https://test' }])).toBe(false);
    // eslint-disable-next-line no-useless-escape
    expect(validateListOfResources([{ value: 'http:\lkj http:/test.v' }])).toBe(false);
    expect(validateListOfResources([
      { value: 'https://www.google.com' },
      { value: 'not a valid url' },
      { value: 'https://www.google.com' },
    ])).toBe(false);
  });
});
