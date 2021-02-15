const axios = require('axios');
const { processFile } = require('./files');
const { s3 } = require('./s3');

const s3Return = {
  AcceptRanges: 'bytes',
  LastModified: '2021-02-15T20:50:03.000Z',
  ContentLength: 11,
  ETag: '"5e133420022085db9eec34950b8e48fe"',
  ContentType: 'text/plain',
  Metadata: {},
  Body: Buffer.from('Hello World!'),
};
const mockS3 = jest.spyOn(s3, 'getObject').mockImplementation(() => ({ promise: () => Promise.resolve(s3Return) }));
const mockAxios = jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: 'everything ok: true\n' }));

describe('File Upload', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Scanner tests', () => {
    it('tests a file scan', async () => {
      const got = processFile('test.txt');
      await expect(got).resolves.toBe('everything ok: true\n');
      expect(mockS3).toBeCalled();
      expect(mockAxios).toBeCalled();
    });
  });
});
