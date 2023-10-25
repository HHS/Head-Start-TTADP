import fetchMock from 'fetch-mock';
import join from 'url-join';
import { findAllofEnum } from '../enum';

describe('enumFetchers', () => {
  describe('findAllOfEnum', () => {
    it('fetches data from the server with the given enumName and enumType', async () => {
      fetchMock.get(join('/', 'api', 'enum', 'enumName', 'testEnum', 'enumType', 'testEnumType'), {
        id: 1,
        name: 'test enum',
      });

      const enumData = await findAllofEnum('testEnum', 'testEnumType');

      expect(fetchMock.called()).toBe(true);
      expect(fetchMock.lastUrl()).toBe(join('/', 'api', 'enum', 'enumName', 'testEnum', 'enumType', 'testEnumType'));
      expect(enumData).toEqual({ id: 1, name: 'test enum' });
    });
  });
});
