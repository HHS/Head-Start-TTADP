/* eslint-env jest */

const ORIGINAL_ENV = { ...process.env };

const loadModule = (env = {}) => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, ...env };
  const recordedCommands = [];
  const makeCommand = (name) => jest.fn((params) => {
    const cmd = { name, params };
    recordedCommands.push(cmd);
    return cmd;
  });

  const mockSend = jest.fn();
  const mockDone = jest.fn().mockResolvedValue({ Key: 'uploaded-key' });
  const mockUpload = jest.fn().mockImplementation(() => ({ done: mockDone }));
  const mockGetSignedUrl = jest.fn();
  const mockAuditLogger = { info: jest.fn(), error: jest.fn() };
  const mockErrorLogger = {
    error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), trace: jest.fn(),
  };

  jest.doMock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({ send: mockSend })),
    GetBucketVersioningCommand: makeCommand('GetBucketVersioningCommand'),
    PutBucketVersioningCommand: makeCommand('PutBucketVersioningCommand'),
    GetObjectCommand: makeCommand('GetObjectCommand'),
    DeleteObjectCommand: makeCommand('DeleteObjectCommand'),
  }));

  jest.doMock('@aws-sdk/lib-storage', () => ({ Upload: mockUpload }));
  jest.doMock('aws4', () => ({ sign: mockGetSignedUrl }));
  jest.doMock('../logger', () => ({ auditLogger: mockAuditLogger, errorLogger: mockErrorLogger }));
  /* eslint-disable global-require */
  const mod = require('./s3');

  return {
    ...mod,
    mockSend,
    mockDone,
    mockUpload,
    mockGetSignedUrl,
    recordedCommands,
    mockAuditLogger,
    mockErrorLogger,
  };
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.resetModules();
  jest.clearAllMocks();
});

describe('generateS3Config', () => {
  it('reads credentials from VCAP_SERVICES', () => {
    const credentials = {
      bucket: 'vcap-bucket',
      access_key_id: 'VCAP_AK',
      secret_access_key: 'VCAP_SK',
      region: 'us-gov-west-1',
    };
    const services = { s3: [{ credentials }] };
    const { generateS3Config, mockErrorLogger } = loadModule({
      VCAP_SERVICES: JSON.stringify(services),
    });

    const cfg = generateS3Config();
    expect(cfg).toStrictEqual({
      s3Bucket: 'vcap-bucket',
      s3Config: {
        credentials: {
          accessKeyId: 'VCAP_AK',
          secretAccessKey: 'VCAP_SK',
        },
        logger: mockErrorLogger,
        region: 'us-gov-west-1',
        forcePathStyle: true,
      },
    });
  });

  it('prefers environment variables when VCAP_SERVICES is not set', () => {
    const env = {
      S3_BUCKET: 'env-bucket',
      AWS_ACCESS_KEY_ID: 'ENV_AK',
      AWS_SECRET_ACCESS_KEY: 'ENV_SK',
      AWS_REGION: 'us-gov-west-1',
    };
    const { generateS3Config, mockErrorLogger } = loadModule(env);

    const cfg = generateS3Config();
    expect(cfg).toEqual({
      s3Bucket: 'env-bucket',
      s3Config: {
        credentials: {
          accessKeyId: 'ENV_AK',
          secretAccessKey: 'ENV_SK',
        },
        logger: mockErrorLogger,
        region: 'us-gov-west-1',
        forcePathStyle: true,
      },
    });
  });

  it('returns defaults when no S3 configuration is present', () => {
    const { generateS3Config } = loadModule();
    const cfg = generateS3Config();
    expect(cfg).toEqual({ s3Bucket: null, s3Config: { region: 'us-gov-west-1' } });
  });
});

describe('S3 helpers', () => {
  describe('deleteFileFromS3', () => {
    it('sends a DeleteObjectCommand with provided bucket and client', async () => {
      const { deleteFileFromS3, recordedCommands } = loadModule();
      const client = { send: jest.fn().mockResolvedValue('deleted') };
      const res = await deleteFileFromS3('file.txt', 'bucket-one', client);
      expect(res).toBe('deleted');
      expect(recordedCommands[0]).toEqual({
        name: 'DeleteObjectCommand',
        params: { Bucket: 'bucket-one', Key: 'file.txt' },
      });
      expect(client.send).toHaveBeenCalledWith(recordedCommands[0]);
    });

    it('throws when bucket/client configuration is missing', async () => {
      const { deleteFileFromS3 } = loadModule();

      await expect(deleteFileFromS3('file.txt', null, null)).rejects.toThrow(/S3 not configured/);
    });
  });

  describe('deleteFileFromS3Job', () => {
    it('returns status 200 when deletion succeeds', async () => {
      const { deleteFileFromS3Job } = loadModule();
      const client = { send: jest.fn().mockResolvedValue({ statusCode: 204 }) };
      const job = { data: { fileId: 1, fileKey: 'key.txt', bucket: 'bucket-one' } };
      const res = await deleteFileFromS3Job(job, client);
      expect(res).toEqual({
        status: 200,
        data: { fileId: 1, fileKey: 'key.txt', res: { statusCode: 204 } },
      });
      expect(client.send).toHaveBeenCalled();
    });

    it('logs and returns error metadata when deletion fails', async () => {
      const error = new Error('boom');
      const { deleteFileFromS3Job, mockAuditLogger } = loadModule();
      const client = { send: jest.fn().mockRejectedValue(error) };
      const job = { data: { fileId: 2, fileKey: 'missing.txt', bucket: 'bucket-one' } };
      const res = await deleteFileFromS3Job(job, client);
      expect(mockAuditLogger.error).toHaveBeenCalledWith("S3 Queue Error: Unable to DELETE file '2' for key 'missing.txt': boom");
      expect(res).toEqual({ data: job.data, status: 500, res: undefined });
    });
  });

  describe('verifyVersioning', () => {
    it('enables versioning when it is not already enabled', async () => {
      const { verifyVersioning, recordedCommands } = loadModule();
      const client = {
        send: jest.fn()
          .mockResolvedValueOnce({ Status: 'Suspended' })
          .mockResolvedValueOnce({}),
      };
      await verifyVersioning('bucket-one', client);
      expect(client.send).toHaveBeenCalledTimes(2);
      expect(recordedCommands[0]).toEqual({
        name: 'GetBucketVersioningCommand',
        params: { Bucket: 'bucket-one' },
      });
      expect(recordedCommands[1]).toEqual({
        name: 'PutBucketVersioningCommand',
        params: {
          Bucket: 'bucket-one',
          VersioningConfiguration: { MFADelete: 'Disabled', Status: 'Enabled' },
        },
      });
    });

    it('returns existing configuration when already enabled', async () => {
      const { verifyVersioning, recordedCommands } = loadModule();
      const client = { send: jest.fn().mockResolvedValue({ Status: 'Enabled' }) };
      const res = await verifyVersioning('bucket-one', client);
      expect(res).toEqual({ Status: 'Enabled' });
      expect(client.send).toHaveBeenCalledTimes(1);
      expect(recordedCommands[0]).toEqual({
        name: 'GetBucketVersioningCommand',
        params: { Bucket: 'bucket-one' },
      });
    });
  });

  describe('downloadFile', () => {
    it('buffers the GetObject Body stream before returning', async () => {
      const { downloadFile, recordedCommands } = loadModule();
      const body = {
        transformToByteArray: jest.fn().mockResolvedValue(
          new Uint8Array([97, 98, 99]),
        ),
      };
      const response = { Body: body, ContentType: 'text/plain' };
      const client = { send: jest.fn().mockResolvedValue(response) };
      const res = await downloadFile('file.txt', client, 'bucket-one');
      expect(res).toBe(response);
      expect(res.Body).toEqual(Buffer.from('abc'));
      expect(body.transformToByteArray).toHaveBeenCalled();
      expect(recordedCommands[0]).toEqual({
        name: 'GetObjectCommand',
        params: { Bucket: 'bucket-one', Key: 'file.txt' },
      });
      expect(client.send).toHaveBeenCalledWith(recordedCommands[0]);
    });

    it('throws when not configured', async () => {
      const { downloadFile } = loadModule();

      await expect(downloadFile('file.txt', null, null)).rejects.toThrow(/S3 not configured/);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('returns an error when not configured', async () => {
      const { getSignedDownloadUrl } = loadModule();
      const res = getSignedDownloadUrl('file.txt', null, null);
      expect(res.url).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
    });

    it('creates a signed URL for the requested object', async () => {
      const env = {
        S3_BUCKET: 'env-bucket',
        AWS_ACCESS_KEY_ID: 'ENV_AK',
        AWS_SECRET_ACCESS_KEY: 'ENV_SK',
        AWS_REGION: 'us-gov-west-1',
      };
      const {
        getSignedDownloadUrl,
        mockGetSignedUrl,
        recordedCommands,
        mockAuditLogger,
      } = loadModule(env);
      const client = { send: jest.fn() };
      const result = { host: 'test.amazonaws.com', path: '/file.txt' };
      mockGetSignedUrl.mockResolvedValue(result);
      const res = getSignedDownloadUrl('file.txt', 'bucket-one', client, 120);
      expect(res).toEqual({ url: `https://${result.host}${result.path}`, error: null });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        client,
        recordedCommands[0],
        { expiresIn: 120 },
      );
      expect(recordedCommands[0]).toEqual({
        name: 'GetObjectCommand',
        params: { Bucket: 'bucket-one', Key: 'file.txt' },
      });
      expect(mockAuditLogger.info).toHaveBeenCalled();
    });

    it('logs and returns the error when presigning fails', async () => {
      const env = {
        S3_BUCKET: 'env-bucket',
        AWS_ACCESS_KEY_ID: 'ENV_AK',
        AWS_SECRET_ACCESS_KEY: 'ENV_SK',
        AWS_REGION: 'us-gov-west-1',
      };
      const {
        getSignedDownloadUrl, mockGetSignedUrl, mockAuditLogger,
      } = loadModule(env);
      const client = { send: jest.fn() };
      const fakeErr = new Error('presign failed');
      mockGetSignedUrl.mockImplementationOnce(() => { throw fakeErr; });
      const res = getSignedDownloadUrl('file.txt', 'bucket-one', client);
      expect(mockAuditLogger.error).toHaveBeenCalledWith(`Failed to generate: ${fakeErr.message}`);
      expect(res.url).toBeNull();
      expect(res.error).toBe(fakeErr);
    });
  });

  describe('uploadFile', () => {
    it('enables versioning in production before uploading', async () => {
      const {
        uploadFile, mockUpload, mockDone, recordedCommands,
      } = loadModule({ NODE_ENV: 'production' });
      mockUpload.mockImplementation(() => ({ done: mockDone }));
      const client = {
        send: jest.fn()
          .mockResolvedValueOnce({ Status: 'Suspended' })
          .mockResolvedValueOnce({}),
      };
      const buffer = Buffer.from('data');
      const type = { mime: 'text/plain' };

      await uploadFile(buffer, 'file.txt', type, client, 'bucket-one');

      expect(client.send).toHaveBeenCalledTimes(2);
      expect(recordedCommands[0]).toEqual({
        name: 'GetBucketVersioningCommand',
        params: { Bucket: 'bucket-one' },
      });
      expect(recordedCommands[1]).toEqual({
        name: 'PutBucketVersioningCommand',
        params: {
          Bucket: 'bucket-one',
          VersioningConfiguration: { MFADelete: 'Disabled', Status: 'Enabled' },
        },
      });
      expect(mockUpload).toHaveBeenCalledWith({
        client,
        params: {
          Body: buffer,
          Bucket: 'bucket-one',
          ContentType: 'text/plain',
          Key: 'file.txt',
        },
      });
      expect(mockDone).toHaveBeenCalled();
    });

    it('skips versioning outside production', async () => {
      const { uploadFile, mockUpload, mockDone } = loadModule({ NODE_ENV: 'test' });
      mockUpload.mockImplementation(() => ({ done: mockDone }));
      const client = { send: jest.fn() };
      const buffer = Buffer.from('data');
      const type = { mime: 'text/plain' };
      await uploadFile(buffer, 'file.txt', type, client, 'bucket-one');
      expect(client.send).not.toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalled();
    });
  });
});
