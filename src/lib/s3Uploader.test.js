import { v4 as uuidv4 } from 'uuid';
import s3Uploader, { verifyVersioning, s3, getPresignedURL } from './s3Uploader';

const mockData = {
  MFADelete: 'Disabled',
  Status: 'Enabled',
};

// make sure we save to original value so we can restore it
const oldEnv = process.env.NODE_ENV;

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

describe('s3Uploader', () => {
  const goodType = { ext: 'pdf', mime: 'application/pdf' };
  const buf = Buffer.from('Testing, Testing', 'UTF-8');
  const name = `${uuidv4()}.${goodType.ext}`;
  const response = {
    ETag: '"8b03d1d48774bfafdb26691256fc7b2b"',
    Location: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${name}`,
    key: `${name}`,
    Key: `${name}`,
    Bucket: `${process.env.S3_BUCKET}`,
  };
  const promise = {
    promise: () => new Promise((resolve) => resolve(response)),
  };
  const mockUpload = jest.spyOn(s3, 'upload').mockImplementation(async () => promise);
  const mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementation(async () => mockData);
  beforeEach(() => {
    mockUpload.mockClear();
    mockGet.mockClear();
  });
  afterAll(() => {
    process.env.NODE_ENV = oldEnv;
  });

  it('Correctly Uploads the file', async () => {
    process.env.NODE_ENV = 'development';
    const got = await s3Uploader(buf, name, goodType);
    expect(mockGet.mock.calls.length).toBe(0);
    await expect(got).toBe(response);
  });
  it('Correctly Uploads the file and checks versioning', async () => {
    process.env.NODE_ENV = 'production';
    const got = await s3Uploader(buf, name, goodType);
    expect(mockGet.mock.calls.length).toBe(1);
    await expect(got).toBe(response);
  });
});

describe('s3Uploader.getPresignedUrl', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const mockGet = jest.spyOn(s3, 'getSignedUrl').mockImplementation(async () => mockData);
  beforeEach(() => {
    mockGet.mockClear();
  });
  it('calls getSignedUrl() with correct parameters', async () => {
    const got = await getPresignedURL(Key, Bucket);
    console.log(got);
    expect(mockGet).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledWith('getObject', { Bucket, Key, Expires: 360 });
  });
});
