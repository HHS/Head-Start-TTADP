import AWS from 'aws-sdk';
import { Readable } from 'stream';
import { auditLogger } from '../../../logger';
import S3Client from '../s3';

jest.mock('aws-sdk');

describe('S3Client', () => {
  let s3Client;
  let mockS3;

  beforeEach(() => {
    mockS3 = {
      upload: jest.fn().mockReturnThis(),
      promise: jest.fn(),
      getObject: jest.fn().mockReturnThis(),
      headObject: jest.fn().mockReturnThis(),
      deleteObject: jest.fn().mockReturnThis(),
      listObjectsV2: jest.fn().mockReturnThis(),
    };
    AWS.S3.mockImplementation(() => mockS3);

    s3Client = new S3Client({ bucketName: 'test-bucket', s3Config: { signatureVersion: 'v4', s3ForcePathStyle: true } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFileAsStream', () => {
    it('should upload file as stream', async () => {
      const key = 'test-key';
      const stream = new Readable();

      await s3Client.uploadFileAsStream(key, stream);

      expect(mockS3.upload).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: key, Body: stream });
      expect(mockS3.promise).toHaveBeenCalled();
    });

    it('should throw error and log if upload fails', async () => {
      const key = 'test-key';
      const stream = new Readable();
      const error = new Error('Upload failed');
      mockS3.promise.mockRejectedValue(error);

      await expect(s3Client.uploadFileAsStream(key, stream)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error uploading file:', error);
    });
  });

  describe('downloadFileAsStream', () => {
    it('should download file as stream', async () => {
      const key = 'test-key';
      const response = { Body: Buffer.from('test-data') };
      mockS3.getObject.mockReturnValueOnce({ promise: jest.fn().mockResolvedValue(response) });

      const result = await s3Client.downloadFileAsStream(key);

      expect(mockS3.getObject).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: key });
      expect(result).toBeInstanceOf(Readable);
    });

    it('should throw error and log if download fails', async () => {
      const key = 'test-key';
      const error = new Error('Download failed');
      mockS3.getObject.mockReturnValueOnce({ promise: jest.fn().mockRejectedValue(error) });

      await expect(s3Client.downloadFileAsStream(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error downloading file:', error);
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata', async () => {
      const key = 'test-key';
      const response = { Metadata: { size: '1024' } };
      mockS3.headObject.mockReturnValueOnce({ promise: jest.fn().mockResolvedValue(response) });

      const result = await s3Client.getFileMetadata(key);

      expect(mockS3.headObject).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: key });
      expect(result).toEqual(response);
    });

    it('should throw error and log if getting file metadata fails', async () => {
      const key = 'test-key';
      const error = new Error('Failed to get file metadata');
      mockS3.headObject.mockReturnValueOnce({ promise: jest.fn().mockRejectedValue(error) });

      await expect(s3Client.getFileMetadata(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error getting file metadata:', error);
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const key = 'test-key';

      await s3Client.deleteFile(key);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: key });
      expect(mockS3.promise).toHaveBeenCalled();
    });

    it('should throw error and log if deleting file fails', async () => {
      const key = 'test-key';
      const error = new Error('Failed to delete file');
      mockS3.promise.mockRejectedValue(error);

      await expect(s3Client.deleteFile(key)).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error deleting file:', error);
    });
  });

  describe('listFiles', () => {
    it('should list files', async () => {
      const response = { Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }] };
      mockS3.listObjectsV2.mockReturnValueOnce({ promise: jest.fn().mockResolvedValue(response) });

      const result = await s3Client.listFiles();

      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({ Bucket: 'test-bucket' });
      expect(result).toEqual(response);
    });

    it('should throw error and log if listing files fails', async () => {
      const error = new Error('Failed to list files');
      mockS3.listObjectsV2.mockReturnValueOnce({ promise: jest.fn().mockRejectedValue(error) });

      await expect(s3Client.listFiles()).rejects.toThrowError(error);
      expect(auditLogger.error).toHaveBeenCalledWith('Error listing files:', error);
    });
  });
});
