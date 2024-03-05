import AWS from 'aws-sdk';
import { Readable } from 'stream';
import { generateS3Config } from '../s3';
import { auditLogger } from '../../logger';

class S3Client {
  private s3: AWS.S3; // Private property to store the AWS.S3 instance

  private bucketName: string; // Private property to store the bucket name

  constructor(
    config: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bucketName: any, // The name of the S3 bucket
      s3Config: {
        accessKeyId?: string, // Optional access key ID for authentication
        endpoint?: string, // Optional endpoint URL for custom S3 service
        region?: string, // Optional region for S3 service
        secretAccessKey?: string, // Optional secret access key for authentication
        signatureVersion: string, // Signature version for API requests
        s3ForcePathStyle: boolean, // Whether to use path-style or virtual-hosted style URLs
      }
    } = generateS3Config(), // Default configuration generator function
  ) {
    // Create an instance of AWS.S3 using the provided configuration
    this.s3 = new AWS.S3(config.s3Config);
    // Store the bucket name
    this.bucketName = config.bucketName;
  }

  /**
   * Uploads a file as a stream to the S3 bucket.
   * @param key - The key (filename) of the file in the bucket.
   * @param stream - The readable stream representing the file content.
   */
  async uploadFileAsStream(key: string, stream: Readable): Promise<void> {
    try {
      await this.s3
        .upload({
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
        })
        .promise();
    } catch (error) {
      auditLogger.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Downloads a file as a stream from the S3 bucket.
   * @param key - The key (filename) of the file in the bucket.
   * @returns A readable stream representing the file content.
   */
  async downloadFileAsStream(key: string): Promise<Readable> {
    try {
      const response = await this.s3
        .getObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();
      return Readable.from(response.Body as Buffer);
    } catch (error) {
      auditLogger.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Retrieves metadata of a file from the S3 bucket.
   * @param key - The key (filename) of the file in the bucket.
   * @returns The metadata object of the file.
   */
  async getFileMetadata(key: string): Promise<AWS.S3.GetObjectOutput> {
    try {
      const response = await this.s3
        .headObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();
      return response;
    } catch (error) {
      auditLogger.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Deletes a file from the S3 bucket.
   * @param key - The key (filename) of the file in the bucket.
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();
    } catch (error) {
      auditLogger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Lists all files in the S3 bucket.
   * @returns The list of objects in the bucket.
   */
  async listFiles(): Promise<AWS.S3.ListObjectsV2Output> {
    try {
      const response = await this.s3
        .listObjectsV2({
          Bucket: this.bucketName,
        })
        .promise();
      return response;
    } catch (error) {
      auditLogger.error('Error listing files:', error);
      throw error;
    }
  }
}

export default S3Client;
