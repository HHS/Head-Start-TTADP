import { fileHash } from './fileUtils';

describe('fileUtils', () => {
  it('fileHash', () => {
    expect(fileHash('./src/lib/fileUtils.test.hash'))
      .toStrictEqual('ce8e0d68940617ff72d4655f78452abaa2c7ca1126986f1670b625550804807egenerateFullName');
    expect(fileHash('bad path')).toStrictEqual(null);
    expect(fileHash('')).toStrictEqual(null);
    expect(fileHash(null)).toStrictEqual(null);
    expect(fileHash(undefined)).toStrictEqual(null);
  });
});
