import { fileHash } from './fileUtils';

describe('fileUtils', () => {
  it('fileHash', () => {
    expect(fileHash('./src/lib/fileUtils.js'))
      .toStrictEqual('f9bc48b8fbd5f9aad8b1c422c0d3f45761a019732e3625af1ed50ecff9e23b13');
    expect(fileHash('bad path')).toStrictEqual(null);
    expect(fileHash('')).toStrictEqual(null);
    expect(fileHash(null)).toStrictEqual(null);
    expect(fileHash(undefined)).toStrictEqual(null);
  });
});
