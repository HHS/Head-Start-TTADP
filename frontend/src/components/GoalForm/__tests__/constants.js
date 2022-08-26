import { validateListOfResources } from '../constants';

describe('validateListOfResources', () => {
  it('returns false if there is an invalid resource', () => {
    const resources = [
      { value: 'https://www.google.com' },
      { value: 'not a valid url' },
      { value: 'https://www.google.com' },
    ];
    expect(validateListOfResources(resources)).toBe(false);
  });
});
