import { v4 as uuidv4 } from 'uuid';
import { S3 } from 'aws-sdk';
import {
  s3,
  downloadFile,
  verifyVersioning,
  uploadFile,
  getPresignedURL,
  generateS3Config,
  deleteFileFromS3,
  deleteFileFromS3Job,
} from './s3';

jest.mock('aws-sdk', () => {
  const mS3 = {
    getBucketVersioning: jest.fn(),
    putBucketVersioning: jest.fn(),
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    deleteObject: jest.fn(),
    getObject: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };
  return { S3: jest.fn(() => mS3) };
});

const mockS3 = /* s3 || */ S3();

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
describe('S3', () => {
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
      process.env.S3_BUCKET = 'ttadp-test';
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

    it('returns null config when no S3 environment variables or VCAP_SERVICES are set', () => {
      const oldVCAP = process.env.VCAP_SERVICES;
      const oldBucket = process.env.S3_BUCKET;
      const oldAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const oldSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const oldEndpoint = process.env.S3_ENDPOINT;

      delete process.env.VCAP_SERVICES;
      delete process.env.S3_BUCKET;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.S3_ENDPOINT;

      const want = {
        bucketName: null,
        s3Config: null,
      };
      const got = generateS3Config();
      expect(got).toMatchObject(want);

      process.env.VCAP_SERVICES = oldVCAP;
      process.env.S3_BUCKET = oldBucket;
      process.env.AWS_ACCESS_KEY_ID = oldAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = oldSecretKey;
      process.env.S3_ENDPOINT = oldEndpoint;
    });
  });

  const mockVersioningData = {
    MFADelete: 'Disabled',
    Status: 'Enabled',
  };

  describe('verifyVersioning', () => {
    let mockGet;
    let mockPut;

    beforeEach(() => {
      mockS3.getBucketVersioning = jest.fn();
      mockS3.putBucketVersioning = jest.fn();
      mockGet = mockS3.getBucketVersioning.mockImplementation(async () => mockVersioningData);
      mockPut = mockS3.putBucketVersioning.mockImplementation(
        async (params) => new Promise((res) => {
          res(params);
        }),
      );
      mockGet.mockClear();
      mockPut.mockClear();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('throws an error if S3 is not configured', async () => {
      await expect(verifyVersioning(VCAP_SERVICES.s3[0].binding_name, null)).rejects.toThrow('S3 is not configured.');
    });

    it('Doesn\'t change things if versioning is enabled', async () => {
      const { bucketName } = generateS3Config();
      const got = await verifyVersioning(bucketName, mockS3);
      expect(mockGet.mock.calls.length).toBe(1);
      expect(mockPut.mock.calls.length).toBe(0);
      expect(got).toBe(mockVersioningData);
    });

    it('Enables versioning if it is disabled', async () => {
      mockGet.mockImplementationOnce(async () => { }); // Simulate disabled versioning
      const got = await verifyVersioning(process.env.S3_BUCKET, mockS3);
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
    let mockGet;

    beforeEach(() => {
      mockS3.upload = jest.fn();
      mockS3.getBucketVersioning = jest.fn();
      mockS3.upload.mockImplementation(() => promise);
      mockGet = mockS3.getBucketVersioning.mockImplementation(async () => mockVersioningData);
    });

    afterAll(() => {
      process.env = oldEnv;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('throws an error if S3 is not configured', async () => {
      await expect(uploadFile(buf, name, goodType, null)).rejects.toThrow('S3 is not configured.');
    });

    it('Correctly Uploads the file and checks versioning', async () => {
      const { bucketName } = generateS3Config();
      process.env.NODE_ENV = 'production';
      const got = await uploadFile(buf, name, goodType, mockS3, bucketName);
      expect(mockGet.mock.calls.length).toBe(1);
      expect(got).toBe(response);
    });
  });

  describe('downloadFile', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });
    it('returns an error if S3 is not configured', () => {
      expect(() => downloadFile(null, null)).toThrow('S3 is not configured.');
    });
    it('downloads a file successfully', async () => {
      const { bucketName } = generateS3Config();
      const key = 'test-file.txt';
      // Mock the promise to resolve with some file content
      mockS3.promise.mockResolvedValue({ Body: 'file-content' });
      mockS3.getObject.mockImplementation(() => mockS3);

      // Call the function
      const result = await downloadFile(key, mockS3, bucketName);

      // Verify getObject was called with the right parameters
      expect(mockS3.getObject).toHaveBeenCalledWith({
        Bucket: bucketName,
        Key: key,
      });

      // Verify the result
      expect(result).toEqual({ Body: 'file-content' });
    });
  });

  describe('getPresignedURL', () => {
    const Bucket = 'ttadp-test';
    const Key = 'fakeKey';
    const fakeError = new Error('fake error');
    let mockGetURL;

    beforeEach(() => {
      mockS3.getSignedUrl = jest.fn();
      mockGetURL = mockS3.getSignedUrl.mockImplementation(() => 'https://example.com');
    });

    it('returns an error if S3 is not configured', () => {
      const url = getPresignedURL(Key, Bucket, null);
      expect(url).toMatchObject({ url: null, error: new Error('S3 is not configured.') });
    });

    it('calls getSignedUrl() with correct parameters', () => {
      const url = getPresignedURL(Key, Bucket, mockS3);
      expect(url).toMatchObject({ url: 'https://example.com', error: null });
      expect(mockGetURL).toHaveBeenCalled();
      expect(mockGetURL).toHaveBeenCalledWith('getObject', { Bucket, Key, Expires: 360 });
    });

    it('calls getSignedUrl() with incorrect parameters', async () => {
      mockGetURL.mockImplementationOnce(() => { throw fakeError; });
      const url = getPresignedURL(Key, Bucket, mockS3);
      expect(url).toMatchObject({ url: null, error: fakeError });
      expect(mockGetURL).toHaveBeenCalled();
      expect(mockGetURL).toHaveBeenCalledWith('getObject', { Bucket, Key, Expires: 360 });
    });
  });

  describe('s3Uploader.deleteFileFromS3', () => {
    const Bucket = 'ttadp-test';
    const Key = 'fakeKey';
    const anotherFakeError = Error('fake');
    let mockDeleteObject;

    afterEach(() => {
      jest.resetAllMocks();
    });

    beforeEach(() => {
      mockS3.deleteObject = jest.fn();
      mockS3.deleteObject.mockImplementation(() => ({ promise: () => Promise.resolve('good') }));
    });

    it('throws an error if S3 is not configured', async () => {
      await expect(deleteFileFromS3(Key, Bucket, null)).rejects.toThrow('S3 is not configured.');
    });

    it('calls deleteFileFromS3() with correct parameters', async () => {
      const got = deleteFileFromS3(Key, Bucket, mockS3);
      await expect(got).resolves.toBe('good');
      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket, Key });
    });

    it('throws an error if promise rejects', async () => {
      const { bucketName } = generateS3Config();
      mockS3.deleteObject.mockImplementation(
        () => ({ promise: () => Promise.reject(anotherFakeError) }),
      );
      const got = deleteFileFromS3(Key, bucketName, mockS3);
      await expect(got).rejects.toBe(anotherFakeError);
      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket: bucketName, Key });
    });
  });

  describe('s3Uploader.deleteFileFromS3Job', () => {
    const Bucket = 'ttadp-test';
    const Key = 'fakeKey';
    const anotherFakeError = Error({ statusCode: 500 });

    beforeEach(() => {
      mockS3.deleteObject = jest.fn();
      mockS3.deleteObject.mockImplementation(() => ({
        promise: () => Promise.resolve({ status: 200, data: {} }),
      }));
    });

    it('returns a 500 status with error data if S3 is not configured', async () => {
      const expectedOutput = {
        data: { bucket: 'ttadp-test', fileId: 1, fileKey: 'fakeKey' },
        res: undefined,
        status: 500,
      };

      const job = { data: { fileId: 1, fileKey: 'fakeKey', bucket: 'ttadp-test' } };
      // Pass null for s3Client to simulate S3 not being configured
      const got = await deleteFileFromS3Job(job, null);

      expect(got).toStrictEqual(expectedOutput);
    });

    it('calls deleteFileFromS3Job() with correct parameters', async () => {
      const { bucketName } = generateS3Config();
      const got = deleteFileFromS3Job(
        { data: { fileId: 1, fileKey: Key, bucket: bucketName } },
        mockS3,
      );
      await expect(got).resolves.toStrictEqual({
        status: 200, data: { fileId: 1, fileKey: Key, res: { data: {}, status: 200 } },
      });
      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket: bucketName, Key });
    });

    it('throws an error if promise rejects', async () => {
      const { bucketName } = generateS3Config();
      mockS3.deleteObject.mockImplementationOnce(
        () => ({
          promise: () => Promise.reject(anotherFakeError),
        }),
      );

      const got = deleteFileFromS3Job(
        { data: { fileId: 1, fileKey: Key, bucket: bucketName } },
        mockS3,
      );
      await expect(got).resolves.toStrictEqual({
        data: { bucket: bucketName, fileId: 1, fileKey: 'fakeKey' },
        res: undefined,
        status: 500,
      });
      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket: bucketName, Key });
    });
  });
});
