import { fileHash } from './fileUtils';

describe('fileUtils', () => {
  it('fileHash', () => {
    expect(fileHash('./src/lib/fileUtils.test.hash'))
      .toStrictEqual('d5c29a15ce6af61c44efc3cafdd5ba3f1747e21c93df528f3f44b98f55b1d812');
    expect(fileHash('bad path')).toStrictEqual(null);
    expect(fileHash('')).toStrictEqual(null);
    expect(fileHash(null)).toStrictEqual(null);
    expect(fileHash(undefined)).toStrictEqual(null);
  });
});
