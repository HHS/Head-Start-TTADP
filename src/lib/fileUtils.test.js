import { fileHash } from './fileUtils';

describe('fileUtils', () => {
  it('fileHash', () => {
    expect(fileHash('./src/lib/fileUtils.test.hash'))
      .toStrictEqual('94782dd987baf2016ca27379beb578ee7dd8485c5bc4c297649a2bc6d70df67f');
    expect(fileHash('bad path')).toStrictEqual(null);
    expect(fileHash('')).toStrictEqual(null);
    expect(fileHash(null)).toStrictEqual(null);
    expect(fileHash(undefined)).toStrictEqual(null);
  });
});
