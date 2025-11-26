import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import {
  S3Client as S3LibClient,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  DeleteObjectCommandOutput,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { generateS3Config } from '../s3';
import { auditLogger } from '../../logger';

class S3Client {
  private client: S3LibClient; // Private property to store the AWS.S3 instance

  private bucketName: string; // Private property to store the bucket name

  constructor(
    config: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s3Bucket: any, // The name of the S3 bucket
      s3Config: {
        accessKeyId?: string, // Optional access key ID for authentication
        // endpoint?: string, // Optional endpoint URL for custom S3 service
        region?: string, // Optional region for S3 service
        secretAccessKey?: string, // Optional secret access key for authentication
        forcePathStyle: boolean, // Whether to use path-style or virtual-hosted style URLs
      }
    } = generateS3Config(), // Default configuration generator function
  ) {
    // Create an instance of AWS.S3 using the provided configuration
    this.client = new S3LibClient(config.s3Config);
    // Store the bucket name
    this.bucketName = config.s3Bucket;
  }

  /**
   * Uploads a file as a stream to the S3 bucket.
   * @param key - The key (filename) of the file in the bucket.
   * @param stream - The readable stream representing the file content.
   */
  async uploadFileAsStream(key: string, stream: Readable): Promise<void> {
    try {
      await new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
        },
      }).done();
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
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return Readable.from(response.Body as unknown as Buffer);
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
  async getFileMetadata(key: string): Promise<HeadObjectCommandOutput> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
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
  async deleteFile(key: string): Promise<DeleteObjectCommandOutput> {
    try {
      const response = await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return response;
    } catch (error) {
      auditLogger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Lists all files in the S3 bucket.
   * @returns The list of objects in the bucket.
   */
  async listFiles(): Promise<ListObjectsV2CommandOutput> {
    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
        }),
      );
      return response;
    } catch (error) {
      auditLogger.error('Error listing files:', error);
      throw error;
    }
  }
}

export default S3Client;
