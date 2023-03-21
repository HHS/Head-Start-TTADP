import { isArrayOrArrayOfNumbers } from './helpers';

describe('isArrayOrArrayOfNumbers', () => {
  it('returns true if the value is an array of numbers', () => {
    expect(isArrayOrArrayOfNumbers([1, 2, 3])).toBe(true);
  });

  it('returns false if something other than an array is passed in', () => {
    expect(isArrayOrArrayOfNumbers('foo')).toBe(false);
  });

  it('returns false if an array of non-numbers is passed in', () => {
    expect(isArrayOrArrayOfNumbers(['foo', 'bar'])).toBe(false);
  });

  it('returns false if an array of mixed numbers and non-numbers is passed in', () => {
    expect(isArrayOrArrayOfNumbers([1, 'foo', 3])).toBe(false);
  });

  it('returns false if the array is empty and the second paramter is true', () => {
    expect(isArrayOrArrayOfNumbers([], true)).toBe(false);
  });
});
