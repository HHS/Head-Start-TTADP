import { deriveLineGraphLegendConfig } from '../constants';

describe('deriveLineGraphLegendConfig', () => {
  it('returns fallback config when data is not an array', () => {
    const fallbackConfig = [{ label: 'Fallback' }];

    expect(deriveLineGraphLegendConfig(undefined, fallbackConfig)).toBe(fallbackConfig);
    expect(deriveLineGraphLegendConfig({}, fallbackConfig)).toBe(fallbackConfig);
  });

  it('returns fallback config when data is empty', () => {
    const fallbackConfig = [{ label: 'Fallback' }];

    expect(deriveLineGraphLegendConfig([], fallbackConfig)).toBe(fallbackConfig);
  });

  it('returns fallback config when any trace entry is invalid', () => {
    const fallbackConfig = [{ label: 'Fallback' }];
    const data = [
      {
        id: 'series-a',
        trace: 'circle',
        name: 'Series A',
      },
      {
        id: 'series-b',
        trace: 'invalid-shape',
        name: 'Series B',
      },
    ];

    expect(deriveLineGraphLegendConfig(data, fallbackConfig)).toBe(fallbackConfig);
  });

  it('derives legend config from valid trace data', () => {
    const data = [
      {
        id: 'series-a',
        trace: 'circle',
        name: 'Series A',
      },
      {
        id: 'series-b',
        trace: 'triangle',
        name: 'Series B',
      },
    ];

    expect(deriveLineGraphLegendConfig(data)).toEqual([
      {
        label: 'Series A',
        selected: true,
        shape: 'circle',
        id: 'series-a-checkbox',
        traceId: 'series-a',
      },
      {
        label: 'Series B',
        selected: true,
        shape: 'triangle',
        id: 'series-b-checkbox',
        traceId: 'series-b',
      },
    ]);
  });

  it('applies the custom label formatter', () => {
    const data = [
      {
        id: 'series-a',
        trace: 'square',
        name: 'Hours of Training',
      },
    ];
    const formatter = (name) => name.replace(/^Hours of\s+/i, '');

    expect(deriveLineGraphLegendConfig(data, [], formatter)).toEqual([
      {
        label: 'Training',
        selected: true,
        shape: 'square',
        id: 'series-a-checkbox',
        traceId: 'series-a',
      },
    ]);
  });
});
