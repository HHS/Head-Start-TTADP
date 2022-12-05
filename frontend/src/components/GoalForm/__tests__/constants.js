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
    expect(validateListOfResources([{ value: 'http://google.comhttp://ask.comhttp://aol.com' }])).toBe(false);
    expect(validateListOfResources([{ value: ' https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/healthy-children-ready-learn.pdf cf.hhs.gov/policy/45-cfr-chap-xiii/1302-subpart-d-health-program-services •\tHealth Competencies https://eclkc.ohs.acf.hhs.gov/sites/default/files/pdf/health-competencies.pdf Non-ECLKC resources\t https://nrckids.org/CFOC/ https://ufhealth.org/well-child-visits#:~:text=15%20months,2%201%2F2%20years",117689' }])).toBe(false);
    // eslint-disable-next-line no-useless-escape
    expect(validateListOfResources([{ value: 'http:\lkj http:/test.v' }])).toBe(false);
    expect(validateListOfResources([
      { value: 'https://www.google.com' },
      { value: 'not a valid url' },
      { value: 'https://www.google.com' },
    ])).toBe(false);
  });
});
