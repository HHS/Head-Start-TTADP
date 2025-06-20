import { getIdParamArray } from '../constants';

describe('recipient record > pages > constants', () => {
  describe('getIdParamArray', () => {
    it('should return an empty array if no id[] query parameter is present', () => {
      const search = '?foo=bar&baz=qux';
      const result = getIdParamArray(search);
      expect(result).toEqual([]);
    });

    it('should return an array of integers if id[] query parameter is present', () => {
      const search = '?id[]=1&id[]=2&id[]=3';
      const result = getIdParamArray(search);
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
