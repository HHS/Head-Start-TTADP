import { Readable } from 'stream';
<<<<<<< HEAD
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
=======
import { mockClient } from 'aws-sdk-client-mock';
import { auditLogger } from '../../../logger';
>>>>>>> 17a90ca92 (attempt)
import S3Client from '../s3';
import { auditLogger } from '../../../logger';

<<<<<<< HEAD
// Mock @aws-sdk/lib-storage Uploa
jest.mock('@aws-sdk/lib-storage', () => {
  const doneMock = jest.fn().mockResolvedValue(undefined);
  const UploadMock = jest.fn().mockImplementation(() => ({
    done: doneMock,
  }));
  return { Upload: UploadMock };
});

// Mock logger used by the module under test
jest.mock('../../logger', () => ({
=======
jest.mock('../../../logger', () => ({
>>>>>>> 17a90ca92 (attempt)
  auditLogger: {
    error: jest.fn(),
  },
}));

<<<<<<< HEAD
// Now import S3 and the S3Client under test
=======
describe('S3Client', () => {
  let mockS3;
>>>>>>> 17a90ca92 (attempt)

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

describe('S3Client', () => {
  const BUCKET = 'test-bucket';

  beforeEach(() => {
<<<<<<< HEAD
=======
    mockS3 = mockClient(S3Client);
  });

  afterEach(() => {
>>>>>>> 17a90ca92 (attempt)
    jest.clearAllMocks();
    mockS3.reset();
  });

<<<<<<< HEAD
=======
  describe('constructor', () => {
    it('should create an S3 client with default configuration', () => {
      const s3Config = generateS3Config();
      const client = new S3Client();
      expect(mockS3).toHaveBeenCalledWith(s3Config.s3Config);
    });

    it('should create an S3 client with custom configuration', () => {
      const customConfig = {
        bucketName: 'custom-bucket',
        s3Config: {
          accessKeyId: 'customAccessKeyId',
          endpoint: 'customEndpoint',
          region: 'customRegion',
          secretAccessKey: 'customSecretAccessKey',
          signatureVersion: 'v4',
          s3ForcePathStyle: true,
        },
      };
      const client = new S3Client(customConfig);
      expect(mockS3).toHaveBeenCalledWith(customConfig.s3Config);
    });
  });

>>>>>>> 17a90ca92 (attempt)
  describe('uploadFileAsStream', () => {
    it('calls Upload and waits for done()', async () => {
      const uploadDone = jest.fn().mockResolvedValue(undefined);
      (Upload).mockImplementation(() => ({ done: uploadDone }));

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      const stream = Readable.from(Buffer.from('hello'));
      await client.uploadFileAsStream('file.txt', stream);
=======
      await mockS3.uploadFileAsStream(key, stream);
>>>>>>> 17a90ca92 (attempt)

      expect(Upload).toHaveBeenCalled();
      expect(uploadDone).toHaveBeenCalled();
    });

    it('logs and rethrows when upload fails', async () => {
      const error = new Error('upload failed');
      const uploadDone = jest.fn().mockRejectedValue(error);
      (Upload).mockImplementation(() => ({ done: uploadDone }));

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      const stream = Readable.from(Buffer.from('data'));

      await expect(client.uploadFileAsStream('file.txt', stream)).rejects.toThrow(error);
=======
      await expect(mockS3.uploadFileAsStream(key, stream)).rejects.toThrowError(error);
>>>>>>> 17a90ca92 (attempt)
      expect(auditLogger.error).toHaveBeenCalledWith('Error uploading file:', error);
    });
  });

  describe('downloadFileAsStream', () => {
    it('returns a readable stream with the object body', async () => {
      const body = Buffer.from('downloaded-content');
      jest.spyOn(S3.prototype, 'getObject').mockResolvedValue({ Body: body });

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      const stream = await client.downloadFileAsStream('file.txt');
      const text = await streamToString(stream);
=======
      const result = await mockS3.downloadFileAsStream(key);
>>>>>>> 17a90ca92 (attempt)

      expect(text).toBe(body.toString('utf8'));
    });

    it('logs and rethrows when getObject fails', async () => {
      const error = new Error('not found');
      jest.spyOn(S3.prototype, 'getObject').mockRejectedValue(error);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });

      await expect(client.downloadFileAsStream('missing.txt')).rejects.toThrow(error);
=======
      await expect(mockS3.downloadFileAsStream(key)).rejects.toThrowError(error);
>>>>>>> 17a90ca92 (attempt)
      expect(auditLogger.error).toHaveBeenCalledWith('Error downloading file:', error);
    });
  });

  describe('getFileMetadata', () => {
    it('returns headObject response', async () => {
      const meta = { ContentLength: 42 };
      jest.spyOn(S3.prototype, 'headObject').mockResolvedValue(meta);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      const response = await client.getFileMetadata('file.txt');
=======
      const result = await mockS3.getFileMetadata(key);
>>>>>>> 17a90ca92 (attempt)

      expect(response).toBe(meta);
    });

    it('logs and rethrows when headObject fails', async () => {
      const error = new Error('head failed');
      jest.spyOn(S3.prototype, 'headObject').mockRejectedValue(error);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });

      await expect(client.getFileMetadata('file.txt')).rejects.toThrow(error);
=======
      await expect(mockS3.getFileMetadata(key)).rejects.toThrowError(error);
>>>>>>> 17a90ca92 (attempt)
      expect(auditLogger.error).toHaveBeenCalledWith('Error getting file metadata:', error);
    });
  });

  describe('deleteFile', () => {
    it('calls deleteObject and resolves', async () => {
      jest.spyOn(S3.prototype, 'deleteObject').mockResolvedValue({});

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      await expect(client.deleteFile('file.txt')).resolves.toBeUndefined();
=======
      await mockS3.deleteFile(key);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: key });
      expect(mockS3.promise).toHaveBeenCalled();
>>>>>>> 17a90ca92 (attempt)
    });

    it('logs and rethrows when deleteObject fails', async () => {
      const error = new Error('delete failed');
      jest.spyOn(S3.prototype, 'deleteObject').mockRejectedValue(error);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });

      await expect(client.deleteFile('file.txt')).rejects.toThrow(error);
=======
      await expect(mockS3.deleteFile(key)).rejects.toThrowError(error);
>>>>>>> 17a90ca92 (attempt)
      expect(auditLogger.error).toHaveBeenCalledWith('Error deleting file:', error);
    });
  });

  describe('listFiles', () => {
    it('returns listObjectsV2 response', async () => {
      const list = { Contents: [{ Key: 'a' }, { Key: 'b' }] };
      jest.spyOn(S3.prototype, 'listObjectsV2').mockResolvedValue(list);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });
      const response = await client.listFiles();
=======
      const result = await mockS3.listFiles();
>>>>>>> 17a90ca92 (attempt)

      expect(response).toBe(list);
    });

    it('logs and rethrows when listObjectsV2 fails', async () => {
      const error = new Error('list failed');
      jest.spyOn(S3.prototype, 'listObjectsV2').mockRejectedValue(error);

<<<<<<< HEAD
      const client = new S3Client({ bucketName: BUCKET, s3Config: {} });

      await expect(client.listFiles()).rejects.toThrow(error);
=======
      await expect(mockS3.listFiles()).rejects.toThrowError(error);
>>>>>>> 17a90ca92 (attempt)
      expect(auditLogger.error).toHaveBeenCalledWith('Error listing files:', error);
    });
  });
});
