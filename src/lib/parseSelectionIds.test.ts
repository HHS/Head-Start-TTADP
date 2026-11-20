import parseSelectionIds from './parseSelectionIds';

describe('parseSelectionIds', () => {
  it('reads numeric and numeric string values', () => {
    expect(parseSelectionIds([{ value: 1 }, { value: '2', label: 'Two' }])).toEqual([1, 2]);
  });

  it('skips null, undefined and valueless entries', () => {
    expect(parseSelectionIds([null, undefined, {}, { value: null }, { value: 3 }])).toEqual([3]);
  });

  it.each([99.1, '99.1', -1, 0, '', 'abc', '1e2', Number.NaN, {}, []])(
    'drops the invalid value %p',
    (value) => {
      expect(parseSelectionIds([{ value }])).toEqual([]);
    }
  );

  it('removes duplicates', () => {
    expect(parseSelectionIds([{ value: 4 }, { value: '4' }])).toEqual([4]);
  });

  it.each([[[]], [undefined], [null], ['1'], [{ value: 1 }]])(
    'returns an empty list for %p',
    (selections) => {
      expect(parseSelectionIds(selections)).toEqual([]);
    }
  );
});
