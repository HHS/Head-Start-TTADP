import {
  S3Client,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { auditLogger } from '../logger';

const generateS3Config = () => {
  // Take configuration from cloud.gov if it is available. If not, use env variables.
  if (process.env.VCAP_SERVICES) {
    const services = JSON.parse(process.env.VCAP_SERVICES);

    // Check if the s3 service is available in VCAP_SERVICES
    if (services.s3 && services.s3.length > 0) {
      const { credentials } = services.s3[0];
      return {
        bucketName: credentials.bucket,
        s3Config: {
          accessKeyId: credentials.access_key_id,
          secretAccessKey: credentials.secret_access_key,
          endpoint: credentials.fips_endpoint,
          region: credentials.region,
          signatureVersion: 'v4',
          s3ForcePathStyle: true,
        },
      };
    }
  }

  // Check for the presence of S3-related environment variables
  const {
    S3_BUCKET,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    S3_ENDPOINT,
  } = process.env;

  if (S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    return {
      bucketName: S3_BUCKET,
      s3Config: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        endpoint: S3_ENDPOINT,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
  }

  // Return null if S3 is not configured
  return {
    bucketName: null,
    s3Config: null,
  };
};

const { defaultBucket, s3Config } = generateS3Config();
const s3 = s3Config ? new S3Client(s3Config) : null;

const deleteFileFromS3 = async (key, bucket = defaultBucket, s3Client = s3) => {
  if (!s3Client || !bucket) {
    throw new Error('S3 is not configured.');
  }
  const params = {
    Bucket: bucket,
    Key: key,
  };
  return s3Client.send(new DeleteObjectCommand(params));
};

const deleteFileFromS3Job = async (job, s3Client = s3) => {
  const {
    fileId, fileKey, bucket,
  } = job.data;
  let res;
  try {
    res = await deleteFileFromS3(fileKey, bucket, s3Client);
    return ({ status: 200, data: { fileId, fileKey, res } });
  } catch (error) {
    auditLogger.error(`S3 Queue Error: Unable to DELETE file '${fileId}' for key '${fileKey}': ${error.message}`);
    return { data: job.data, status: res ? res.statusCode : 500, res: res || undefined };
  }
};

const verifyVersioning = async (bucket = defaultBucket, s3Client = s3) => {
  if (!s3Client || !bucket) {
    throw new Error('S3 is not configured.');
  }
  const versioningConfiguration = {
    MFADelete: 'Disabled',
    Status: 'Enabled',
  };
  let params = {
    Bucket: bucket,
  };

  const data = await s3Client.send(new GetBucketVersioningCommand(params));
  if (!(data) || data.Status !== 'Enabled') {
    params = {
      Bucket: bucket,
      VersioningConfiguration: versioningConfiguration,
    };
    return s3Client.send(new PutBucketVersioningCommand(params));
  }
  return data;
};

const downloadFile = async (key, s3Client = s3, bucketName = defaultBucket) => {
  if (!s3Client || !bucketName) {
    throw new Error('S3 is not configured.');
  }
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  return s3Client.send(new GetObjectCommand(params)).done();
};

const getPresignedURL = async (Key, Bucket = defaultBucket, s3Client = s3, Expires = 360) => {
  const url = { url: null, error: null };
  if (!s3Client || !Bucket) {
    url.error = new Error('S3 is not configured.');
    return url;
  }
  try {
    const command = new GetObjectCommand({ Bucket, Key });
    url.url = await getSignedUrl(s3Client, command, { expiresIn: Expires });
  } catch (error) {
    auditLogger.error(`Error generating presigned URL for key ${Key}: ${error.message}`);
    url.error = error;
  }
  return url;
};

const uploadFile = async (buffer, name, type, s3Client = s3, bucketName = defaultBucket) => {
  if (!s3Client || !bucketName) {
    throw new Error('S3 is not configured.');
  }
  const params = {
    Body: buffer,
    Bucket: bucketName,
    ContentType: type.mime,
    Key: name,
  };
  // Only check for versioning if not running locally
  if (process.env.NODE_ENV === 'production') {
    await verifyVersioning(bucketName, s3Client);
  }
  return Upload({
    client: s3Client,
    params,
  }).done();
};

export {
  s3,
  downloadFile,
  getPresignedURL,
  uploadFile,
  generateS3Config,
  verifyVersioning,
  deleteFileFromS3,
  deleteFileFromS3Job,
};
