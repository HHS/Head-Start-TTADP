import {
  S3Client,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { sign } from 'aws4';
import { Upload } from '@aws-sdk/lib-storage';
import { auditLogger, errorLogger } from '../logger';

const DEFAULT_REGION = 'us-gov-west-1';

const generateS3Config = () => {
  // Take configuration from cloud.gov if it is available. If not, use env variables.
  if (process.env.VCAP_SERVICES) {
    const services = JSON.parse(process.env.VCAP_SERVICES);

    // Check if the s3 service is available in VCAP_SERVICES
    if (services.s3 && services.s3.length > 0) {
      const { credentials } = services.s3[0];
      return {
        s3Bucket: credentials.bucket,
        s3Config: {
          region: credentials.region,
          forcePathStyle: true,
          logger: errorLogger,
          credentials: {
            accessKeyId: credentials.access_key_id,
            secretAccessKey: credentials.secret_access_key,
          },
        },
      };
    }
  }

  // Check for the presence of S3-related environment variables
  const {
    S3_BUCKET,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
  } = process.env;

  if (S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    return {
      s3Bucket: S3_BUCKET,
      s3Config: {
        region: process.env.AWS_REGION || DEFAULT_REGION,
        forcePathStyle: true,
        logger: errorLogger,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      },
    };
  }

  // Return null if S3 is not configured
  return {
    s3Bucket: null,
    s3Config: { region: DEFAULT_REGION },
  };
};

const { s3Bucket, s3Config } = generateS3Config();
const s3Client = s3Config ? new S3Client(s3Config) : null;

const deleteFileFromS3 = async (key, bucket = s3Bucket, client = s3Client) => {
  if (!client || !bucket) {
    throw new Error(`S3 not configured (${client}, ${bucket})`);
  }
  const params = {
    Bucket: bucket,
    Key: key,
  };
  return client.send(new DeleteObjectCommand(params));
};

const deleteFileFromS3Job = async (job, client = s3Client) => {
  const {
    fileId, fileKey, bucket,
  } = job.data;
  let res;
  try {
    res = await deleteFileFromS3(fileKey, bucket, client);
    return ({ status: 200, data: { fileId, fileKey, res } });
  } catch (error) {
    auditLogger.error(`S3 Queue Error: Unable to DELETE file '${fileId}' for key '${fileKey}': ${error.message}`);
    return { data: job.data, status: res ? res.statusCode : 500, res: res || undefined };
  }
};

const verifyVersioning = async (bucket = s3Bucket, client = s3Client) => {
  if (!client || !bucket) {
    throw new Error(`S3 not configured (${client}, ${bucket})`);
  }
  const versioningConfiguration = {
    MFADelete: 'Disabled',
    Status: 'Enabled',
  };
  let params = {
    Bucket: bucket,
  };

  const data = await client.send(new GetBucketVersioningCommand(params));
  if (!(data) || data.Status !== 'Enabled') {
    params = {
      Bucket: bucket,
      VersioningConfiguration: versioningConfiguration,
    };
    return client.send(new PutBucketVersioningCommand(params));
  }
  return data;
};

const downloadFile = async (key, client = s3Client, bucket = s3Bucket) => {
  if (!client || !bucket) {
    throw new Error(`S3 not configured (${client}, ${bucket})`);
  }
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const res = await client.send(new GetObjectCommand(params));
  if (res.Body) {
    const byteChunks = await res.Body.transformToByteArray();
    res.Body = Buffer.from(byteChunks);
  }
  return res;
};

const getSignedDownloadUrl = (key, bucket = s3Bucket, client = s3Client, expires = 360) => {
  const url = { url: null, error: null };
  if (!client || !bucket) {
    url.error = new Error(`S3 not configured (${client}, ${bucket})`);
    return url;
  }

  const opts = {
    service: 's3',
    host: `${s3Bucket}.s3.${s3Config.region}.amazonaws.com`,
    path: `${key}`,
    region: s3Config.region,
    headers: { 'X-Amz-Expires': expires },
    signQuery: true,
  };
  const creds = {
    accessKeyId: s3Config.credentials.accessKeyId,
    secretAccessKey: s3Config.credentials.secretAccessKey,
  };
  try {
    const result = sign(opts, creds);
    url.url = `https://${result.host}/${result.path}`;
    auditLogger.info(`Generated signed download URL for key ${key}`);
  } catch (error) {
    auditLogger.error(`Failed to generate: ${error.message}`);
    url.error = error;
  }
  return url;
};

const uploadFile = async (buffer, name, type, client = s3Client, bucket = s3Bucket) => {
  if (!client || !bucket) {
    throw new Error(`S3 not configured (${client}, ${bucket})`);
  }
  const params = {
    Body: buffer,
    Bucket: bucket,
    ContentType: type.mime,
    Key: name,
  };
  // Only check for versioning if not running locally
  if (process.env.NODE_ENV === 'production') {
    await verifyVersioning(bucket, client);
  }
  const response = await new Upload({ client, params }).done();
  auditLogger.info(`File uploaded to S3: ${response.Key}`);
  return response;
};

export {
  s3Client,
  downloadFile,
  getSignedDownloadUrl,
  uploadFile,
  generateS3Config,
  verifyVersioning,
  deleteFileFromS3,
  deleteFileFromS3Job,
};
