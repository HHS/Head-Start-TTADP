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

    s3ClientWrapper = new S3ClientWrapper({ bucketName: 'test-bucket', s3Config: { signatureVersion: 'v4', s3ForcePathStyle: true } });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      const command = mockS3.send.mock.calls[0][0];
      expect(command).toEqual(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: key,
          Body: stream,
        }),
      }));
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
      const command = mockS3.send.mock.calls[0][0];
      expect(command).toEqual(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: key,
        }),
      }));
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
      const command = mockS3.send.mock.calls[0][0];
      expect(command).toEqual(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: key,
        }),
      }));
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
      const command = mockS3.send.mock.calls[0][0];
      expect(command).toEqual(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: key,
        }),
      }));
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
      const command = mockS3.send.mock.calls[0][0];
      expect(command).toEqual(expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'test-bucket',
        }),
      }));
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
