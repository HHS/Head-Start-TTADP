import { verifyVersioning, s3 } from './s3Uploader';

const mockData = {
  MFADelete: 'Disabled',
  Status: 'Enabled',
};

describe('s3Uploader', () => {
  const mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementation(async (data, callback) => callback(data));
  const mockPut = jest.spyOn(s3, 'putBucketVersioning').mockImplementation(async (params) => new Promise((res) => res(params)));
  beforeEach(() => {
    mockGet.mockClear();
    mockPut.mockClear();
  });
  it('Verifies that versioning is enabled', async () => {
    const got = await verifyVersioning(mockData);
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(0);
    expect(got).toBe(mockData);
  });
  it('Enables versioning if it is disabled', async () => {
    const got = await verifyVersioning();
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(1);
    expect(got).toBe(mockData);
  });
});
