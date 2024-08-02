import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { auditLogger } from '../../../logger';
import { generateS3Config } from '../../s3';
import S3ClientWrapper from '../s3';

jest.mock('@aws-sdk/client-s3');
jest.mock('../../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

describe('S3ClientWrapper', () => {
  let s3ClientWrapper;
  let mockS3;

  beforeAll(() => {
    jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    mockS3 = {
      send: jest.fn(),
    };
    S3Client.mockImplementation(() => mockS3);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an S3 client with default configuration', () => {
      const s3Config = generateS3Config();
      const client = new S3ClientWrapper();
      expect(S3Client).toHaveBeenCalledWith(s3Config.s3Config);
      expect(client.bucketName).toBe(s3Config.bucketName);
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
      const client = new S3ClientWrapper(customConfig);
      expect(S3Client).toHaveBeenCalledWith(customConfig.s3Config);
      expect(client.bucketName).toBe(customConfig.bucketName);
    });
  });

  describe('uploadFileAsStream', () => {
    it('should upload file as stream', async () => {
      const key = 'test-key';
      const stream = new Readable();
      // eslint-disable-next-line no-underscore-dangle
      stream._read = () => {}; // Mock implementation of _read to avoid errors

      mockS3.send.mockResolvedValueOnce({});

      await s3ClientWrapper.uploadFileAsStream(key, stream);

      expect(mockS3.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        Body: stream,
      });
    });

    it('should throw error and log if upload fails', async () => {
      const key = 'test-key';
      const stream = new Readable();
      // eslint-disable-next-line no-underscore-dangle
      stream._read = () => {}; // Mock implementation of _read to avoid errors
      const error = new Error('Upload failed');
      mockS3.send.mockRejectedValue(error);

      await expect(s3ClientWrapper.uploadFileAsStream(key, stream)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error uploading file:', error);
    });
  });

  describe('downloadFileAsStream', () => {
    it('should download file as stream', async () => {
      const key = 'test-key';
      const response = { Body: Buffer.from('test-data') };
      mockS3.send.mockResolvedValueOnce(response);

      const result = await s3ClientWrapper.downloadFileAsStream(key);

      expect(mockS3.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(result).toBeInstanceOf(Readable);
    });

    it('should throw error and log if download fails', async () => {
      const key = 'test-key';
      const error = new Error('Download failed');
      mockS3.send.mockRejectedValueOnce(error);

      await expect(s3ClientWrapper.downloadFileAsStream(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error downloading file:', error);
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata', async () => {
      const key = 'test-key';
      const response = { Metadata: { size: '1024' } };
      mockS3.send.mockResolvedValueOnce(response);

      const result = await s3ClientWrapper.getFileMetadata(key);

      expect(mockS3.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(result).toEqual(response);
    });

    it('should throw error and log if getting file metadata fails', async () => {
      const key = 'test-key';
      const error = new Error('Failed to get file metadata');
      mockS3.send.mockRejectedValueOnce(error);

      await expect(s3ClientWrapper.getFileMetadata(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error getting file metadata:', error);
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const key = 'test-key';

      mockS3.send.mockResolvedValueOnce({});

      await s3ClientWrapper.deleteFile(key);

      expect(mockS3.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
    });

    it('should throw error and log if deleting file fails', async () => {
      const key = 'test-key';
      const error = new Error('Failed to delete file');
      mockS3.send.mockRejectedValue(error);

      await expect(s3ClientWrapper.deleteFile(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error deleting file:', error);
    });
  });

  describe('listFiles', () => {
    it('should list files', async () => {
      const response = { Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }] };
      mockS3.send.mockResolvedValueOnce(response);

      const result = await s3ClientWrapper.listFiles();

      expect(mockS3.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
      });
      expect(result).toEqual(response);
    });

    it('should throw error and log if listing files fails', async () => {
      const error = new Error('Failed to list files');
      mockS3.send.mockRejectedValueOnce(error);

      await expect(s3ClientWrapper.listFiles()).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error listing files:', error);
    });
  });
});
