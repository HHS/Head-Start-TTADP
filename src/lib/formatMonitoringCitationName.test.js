import formatMonitoringCitationName from './formatMonitoringCitationName';

describe('formatMonitoringCitationName', () => {
  const cases = [
    {
      description: 'omits null findingSource',
      input: {
        acro: 'ANC',
        citation: '1302.101(a)(1)',
        findingSource: null,
      },
      expected: 'ANC - 1302.101(a)(1)',
    },
    {
      description: 'omits undefined findingSource',
      input: {
        acro: 'ANC',
        citation: '1302.101(a)(1)',
        findingSource: undefined,
      },
      expected: 'ANC - 1302.101(a)(1)',
    },
    {
      description: 'trims all parts before joining',
      input: {
        acro: ' ANC ',
        citation: ' 1302.101(a)(1) ',
        findingSource: ' Monitoring ',
      },
      expected: 'ANC - 1302.101(a)(1) - Monitoring',
    },
    {
      description: 'rejects whitespace-only descriptors',
      input: {
        acro: ' ',
        citation: '1302.101(a)(1)',
        findingSource: ' ',
      },
      expected: '',
    },
    {
      description: 'allows findingSource when acro is missing',
      input: {
        acro: undefined,
        citation: '1302.101(a)(1)',
        findingSource: 'Monitoring',
      },
      expected: '1302.101(a)(1) - Monitoring',
    },
    {
      description: 'rejects whitespace-only citation text',
      input: {
        acro: 'ANC',
        citation: ' ',
        findingSource: 'Monitoring',
      },
      expected: '',
    },
  ];

  it.each(cases)('$description', ({ input, expected }) => {
    expect(formatMonitoringCitationName(input)).toBe(expected);
  });
});
