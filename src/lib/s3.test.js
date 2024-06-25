import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  s3,
  verifyVersioning,
  uploadFile,
  getPresignedURL,
  generateS3Config,
  deleteFileFromS3,
  deleteFileFromS3Job,
} from './s3';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

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
  let mockS3Send;

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send = jest.spyOn(s3, 'send').mockImplementation((command) => {
      if (command.constructor.name === 'GetBucketVersioningCommand') {
        return Promise.resolve(mockVersioningData);
      }
      if (command.constructor.name === 'PutBucketVersioningCommand') {
        return Promise.resolve({
          Bucket: process.env.S3_BUCKET,
          VersioningConfiguration: mockVersioningData,
        });
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Doesn\'t change things if versioning is enabled', async () => {
    const got = await verifyVersioning();
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(got).toBe(mockVersioningData);
  });

  it('Enables versioning if it is disabled', async () => {
    process.env.S3_BUCKET = 'test-bucket';
    // First call to GetBucketVersioningCommand will return empty data to
    // simulate disabled versioning
    mockS3Send.mockImplementationOnce(async (command) => {
      if (command.constructor.name === 'GetBucketVersioningCommand') {
        return {};
      }
      return {};
    });

    const got = await verifyVersioning(process.env.S3_BUCKET);
    expect(mockS3Send).toHaveBeenCalledTimes(2);
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

  let mockS3Send;

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send = jest.spyOn(s3, 'send').mockImplementation((command) => {
      if (command.constructor.name === 'PutObjectCommand') return Promise.resolve(response);
      if (command.constructor.name === 'GetBucketVersioningCommand') return mockVersioningData;
      return undefined;
    });
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('Correctly Uploads the file', async () => {
    process.env.NODE_ENV = 'development';
    const got = await uploadFile(buf, name, goodType);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(got).toBe(response);
  });

  it('Correctly Uploads the file and checks versioning', async () => {
    process.env.NODE_ENV = 'production';
    const got = await uploadFile(buf, name, goodType);
    expect(mockS3Send).toHaveBeenCalledTimes(2);
    expect(got).toBe(response);
  });
});

describe('getPresignedUrl', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const fakeError = new Error('fake error');

  let mockGetURL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetURL = jest.spyOn(s3, 'send').mockImplementation(() => 'https://example.com');
  });

  it('calls getSignedUrl() with correct parameters', async () => {
    getSignedUrl.mockResolvedValueOnce('https://example.com');
    const url = await getPresignedURL(Key, Bucket);
    expect(url).toMatchObject({ url: 'https://example.com', error: null });
    expect(getSignedUrl).toHaveBeenCalled();
  });

  it('calls getSignedUrl() with incorrect parameters', async () => {
    getSignedUrl.mockImplementationOnce(() => { throw fakeError; });
    const url = await getPresignedURL(Key, Bucket);
    expect(url).toMatchObject({ url: null, error: fakeError });
    expect(getSignedUrl).toHaveBeenCalled();
  });
});

describe('s3Uploader.deleteFileFromS3', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const anotherFakeError = Error('fake');

  let mockDeleteObject;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteObject = jest.spyOn(s3, 'send').mockImplementation((command) => {
      if (command.constructor.name === 'DeleteObjectCommand') return Promise.resolve('good');
      return undefined;
    });
  });

  it('calls deleteFileFromS3() with correct parameters', async () => {
    const got = deleteFileFromS3(Key, Bucket);
    await expect(got).resolves.toBe('good');
    expect(mockDeleteObject).toHaveBeenCalled();
  });

  it('throws an error if promise rejects', async () => {
    mockDeleteObject.mockImplementationOnce((command) => {
      if (command.constructor.name === 'DeleteObjectCommand') return Promise.reject(anotherFakeError);
      return undefined;
    });
    const got = deleteFileFromS3(Key);
    await expect(got).rejects.toBe(anotherFakeError);
    expect(mockDeleteObject).toHaveBeenCalled();
  });
});

describe('s3Uploader.deleteFileFromS3Job', () => {
  const Bucket = 'fakeBucket';
  const Key = 'fakeKey';
  const anotherFakeError = Error({ statusCode: 500 });

  let mockDeleteObject;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteObject = jest.spyOn(s3, 'send').mockImplementation((command) => {
      if (command.constructor.name === 'DeleteObjectCommand') return Promise.resolve({ status: 200, data: {} });
      return undefined;
    });
  });

  it('calls deleteFileFromS3Job() with correct parameters', async () => {
    const got = deleteFileFromS3Job({ data: { fileId: 1, fileKey: Key, bucket: Bucket } });
    await expect(got).resolves.toStrictEqual({
      status: 200, data: { fileId: 1, fileKey: Key, res: { data: {}, status: 200 } },
    });
    expect(mockDeleteObject).toHaveBeenCalled();
  });

  it('throws an error if promise rejects', async () => {
    mockDeleteObject.mockImplementationOnce((command) => {
      if (command.constructor.name === 'DeleteObjectCommand') return Promise.reject(anotherFakeError);
      return undefined;
    });
    const got = deleteFileFromS3Job({ data: { fileId: 1, fileKey: Key, bucket: Bucket } });
    await expect(got).resolves.toStrictEqual({ data: { bucket: 'fakeBucket', fileId: 1, fileKey: 'fakeKey' }, res: undefined, status: 500 });
    expect(mockDeleteObject).toHaveBeenCalled();
  });
});
