import { verifyVersioning, s3 } from './s3Uploader';

const mockData = {
  MFADelete: 'Disabled',
  Status: 'Enabled',
};

// make sure we save to original value so we can restore it
// const oldEndpoint = process.env.S3_ENDPOINT;

describe('s3Uploader.verifyVersioning', () => {
  let mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementation(async () => mockData);
  const mockPut = jest.spyOn(s3, 'putBucketVersioning').mockImplementation(async (params) => new Promise((res) => res(params)));
  beforeEach(() => {
    mockGet.mockClear();
    mockPut.mockClear();
  });
  it('Doesn\'t change things if versioning is enabled', async () => {
    const got = await verifyVersioning();
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(0);
    expect(got).toBe(mockData);
  });
  it('Enables versioning if it is disabled', async () => {
    mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementationOnce(async () => {});
    const got = await verifyVersioning();
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(1);
    expect(got.Bucket).toBe(process.env.S3_BUCKET);
    expect(got.VersioningConfiguration.MFADelete).toBe(mockData.MFADelete);
    expect(got.VersioningConfiguration.Status).toBe(mockData.Status);
  });
});
