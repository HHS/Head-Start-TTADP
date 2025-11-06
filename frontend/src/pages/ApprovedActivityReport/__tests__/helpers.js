import { formatSimpleArray } from '../../../components/ReportView/helpers';

describe('formatSimpleArray', () => {
  it('return an empty string if passed undefined', () => {
    expect(formatSimpleArray()).toEqual('');
  });
  it('returns an empty string if the array is empty', () => {
    expect(formatSimpleArray([])).toEqual('');
  });
  it('returns a comma separated string if the array has values', () => {
    expect(formatSimpleArray(['one', 'two', 'three'])).toEqual('one, three, two');
  });
});
