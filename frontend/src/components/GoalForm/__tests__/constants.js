import {
  validateListOfResources,
  FORM_FIELD_DEFAULT_ERRORS,
  FORM_FIELD_INDEXES,
  objectivesWithValidResourcesOnly,
  grantsToMultiValue,
} from '../constants';

describe('form constants', () => {
  it('the amount of form fields and the amount of default errors should match', () => {
    expect(Object.keys(FORM_FIELD_INDEXES).length).toBe(FORM_FIELD_DEFAULT_ERRORS.length);
  });
});

describe('objectivesWithValidResourcesOnly', () => {
  it('strips invalid resources', () => {
    const objectives = [
      {
        resources: [
          { value: 'https://www.google.com' },
          { value: 'not a valid url' },
          { value: 'https://www.google.com' },
          { value: 'https://www.google.com ' },
          { value: ' https://www.google.com' },
        ],
      },
    ];

    expect(objectivesWithValidResourcesOnly(objectives)).toEqual([
      {
        resources: [
          { value: 'https://www.google.com' },
          { value: 'https://www.google.com' },
          { value: 'https://www.google.com' },
          { value: 'https://www.google.com' },
        ],
      },
    ]);
  });
});

describe('validateListOfResources', () => {
  it('returns false if there is an invalid resource', () => {
    expect(validateListOfResources([{ value: 'http://www.test-domain.com/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain/long-domain/long/long/domain' }])).toBe(true);
    expect(validateListOfResources([{ value: 'https://test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'http://test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'https://www.test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'http://www.test.com' }])).toBe(true);
    expect(validateListOfResources([{ value: 'file://test.com' }])).toBe(false);
    expect(validateListOfResources([{ value: 'http://test' }])).toBe(false);
    expect(validateListOfResources([{ value: 'https://test' }])).toBe(false);
    expect(validateListOfResources([{ value: 'http:mickeymouse.com' }])).toBe(false);
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

test('grantsToSources function should return the correct source object', () => {
  const grants = [
    { numberWithProgramTypes: '123' },
    { numberWithProgramTypes: '456' },
    { numberWithProgramTypes: '789' },
  ];

  const source = {
    123: 'Source 1',
    456: 'Source 2',
    1234: 'Source 1',
  };

  const expected = {
    123: 'Source 1',
    456: 'Source 2',
    789: '',
  };

  const result = grantsToMultiValue(grants, source);

  expect(result).toEqual(expected);
});
