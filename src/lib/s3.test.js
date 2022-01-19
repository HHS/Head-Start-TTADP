import { v4 as uuidv4 } from 'uuid';
import {
  s3,
  verifyVersioning,
  uploadFile,
  getPresignedURL,
  generateS3Config,
  deleteFileFromS3,
} from './s3';

const oldEnv = { ...process.env };
const VCAP_SERVICES = {
  s3: [
    {
      binding_name: null,
      credentials: {
        access_key_id: 'superSecretKeyId',
        additional_buckets: [],
        bucket: 'ourTestBucket',
        fips_endpoint: 'localhost',
        region: 'us-gov-west-1',
        secret_access_key: 'superSecretAccessKey',
        uri: 's3://username:password@localhost/ourTestBucket',
      },
      instance_name: 'ttasmarthub-test',
      label: 's3',
      name: 'ttasmarthub-test',
      plan: 'basic',
      provider: null,
      syslog_drain_url: null,
      tags: [
        'AWS',
        'S3',
        'object-storage',
      ],
      volume_mounts: [],
    },
  ],
};

describe('Tests s3 client setup', () => {
  afterEach(() => { process.env = oldEnv; });
  it('returns proper config with process.env.VCAP_SERVICES set', () => {
    process.env.VCAP_SERVICES = JSON.stringify(VCAP_SERVICES);
    const { credentials } = VCAP_SERVICES.s3[0];
    const want = {
      bucketName: credentials.bucket,
      s3Config: {
        accessKeyId: credentials.access_key_id,
        endpoint: credentials.fips_endpoint,
        secretAccessKey: credentials.secret_access_key,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
    const got = generateS3Config();
    expect(got).toMatchObject(want);
  });
  it('returns proper config with process.env.VCAP_SERVICES not set', () => {
    process.env.S3_BUCKET = 'test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'superSecretAccessKeyId';
    process.env.AWS_SECRET_ACCESS_KEY = 'superSecretAccessKey';
    process.env.S3_ENDPOINT = 'localhost';

    const want = {
      bucketName: process.env.S3_BUCKET,
      s3Config: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        endpoint: process.env.S3_ENDPOINT,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
    const got = generateS3Config();
    expect(got).toMatchObject(want);
  });
});

const mockVersioningData = {
  MFADelete: 'Disabled',
  Status: 'Enabled',
};

describe('verifyVersioning', () => {
  let mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementation(async () => mockVersioningData);
  const mockPut = jest.spyOn(s3, 'putBucketVersioning').mockImplementation(async (params) => new Promise((res) => { res(params); }));
  beforeEach(() => {
    mockGet.mockClear();
    mockPut.mockClear();
  });
  it('Doesn\'t change things if versioning is enabled', async () => {
    const got = await verifyVersioning();
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(0);
    expect(got).toBe(mockVersioningData);
  });
  it('Enables versioning if it is disabled', async () => {
    mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementationOnce(async () => { });
    const got = await verifyVersioning(process.env.S3_BUCKET);
    expect(mockGet.mock.calls.length).toBe(1);
    expect(mockPut.mock.calls.length).toBe(1);
    expect(got.Bucket).toBe(process.env.S3_BUCKET);
    expect(got.VersioningConfiguration.MFADelete).toBe(mockVersioningData.MFADelete);
    expect(got.VersioningConfiguration.Status).toBe(mockVersioningData.Status);
  });
});

describe('uploadFile', () => {
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
    promise: () => new Promise((resolve) => { resolve(response); }),
  };
  const mockUpload = jest.spyOn(s3, 'upload').mockImplementation(() => promise);
  const mockGet = jest.spyOn(s3, 'getBucketVersioning').mockImplementation(async () => mockVersioningData);
  beforeEach(() => {
    mockUpload.mockClear();
    mockGet.mockClear();
  });
  afterAll(() => {
    process.env = oldEnv;
  });

  it('Correctly Uploads the file', async () => {
    process.env.NODE_ENV = 'development';
    const got = await uploadFile(buf, name, goodType);
    expect(mockGet.mock.calls.length).toBe(0);
    await expect(got).toBe(response);
  });
  it('Correctly Uploads the file and checks versioning', async () => {
    process.env.NODE_ENV = 'production';
    const got = await uploadFile(buf, name, goodType);
    expect(mockGet.mock.calls.length).toBe(1);
    await expect(got).toBe(response);
  });
});

describe('getPresignedUrl', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const fakeError = new Error('fake error');
  const mockGetURL = jest.spyOn(s3, 'getSignedUrl').mockImplementation(() => 'https://example.com');
  beforeEach(() => {
    mockGetURL.mockClear();
  });
  it('calls getSignedUrl() with correct parameters', () => {
    const url = getPresignedURL(Key, Bucket);
    expect(url).toMatchObject({ url: 'https://example.com', error: null });
    expect(mockGetURL).toHaveBeenCalled();
    expect(mockGetURL).toHaveBeenCalledWith('getObject', { Bucket, Key, Expires: 360 });
  });
  it('calls getSignedUrl() with incorrect parameters', async () => {
    mockGetURL.mockImplementationOnce(() => { throw fakeError; });
    const url = getPresignedURL(Key, Bucket);
    expect(url).toMatchObject({ url: null, error: fakeError });
    expect(mockGetURL).toHaveBeenCalled();
    expect(mockGetURL).toHaveBeenCalledWith('getObject', { Bucket, Key, Expires: 360 });
  });
});
describe('s3Uploader.deleteFileFromS3', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const anotherFakeError = Error('fake');
  it('calls deleteFileFromS3() with correct parameters', async () => {
    const mockDeleteObject = jest.spyOn(s3, 'deleteObject').mockImplementation(() => ({ promise: () => Promise.resolve('good') }));
    const got = deleteFileFromS3(Key, Bucket);
    await expect(got).resolves.toBe('good');
    expect(mockDeleteObject).toHaveBeenCalledWith({ Bucket, Key });
  });
  it('throws an error if promise rejects', async () => {
    const mockDeleteObject = jest.spyOn(s3, 'deleteObject').mockImplementationOnce(
      () => ({ promise: () => Promise.reject(anotherFakeError) }),
    );
    const got = deleteFileFromS3(Key);
    await expect(got).rejects.toBe(anotherFakeError);
    expect(mockDeleteObject).toHaveBeenCalledWith({ Bucket, Key });
  });
});
