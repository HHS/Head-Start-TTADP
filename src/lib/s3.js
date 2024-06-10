import {
  S3Client,
  DeleteObjectCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auditLogger } from '../logger';

const generateS3Config = () => {
  // take configuration from cloud.gov if it is available. If not, use env variables.
  if (process.env.VCAP_SERVICES) {
    const { credentials } = JSON.parse(process.env.VCAP_SERVICES).s3[0];
    return {
      bucketName: credentials.bucket,
      s3Config: {
        accessKeyId: credentials.access_key_id,
        endpoint: credentials.fips_endpoint,
        region: credentials.region,
        secretAccessKey: credentials.secret_access_key,
      },
    };
  }
  return {
    bucketName: process.env.S3_BUCKET,
    s3Config: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      endpoint: process.env.S3_ENDPOINT,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    },
  };
};

const { bucketName, s3Config } = generateS3Config();
const s3 = new S3Client(s3Config);

const deleteFileFromS3 = async (key, bucket = bucketName, s3Client = s3) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  return s3Client.send(new DeleteObjectCommand(params));
};

const deleteFileFromS3Job = async (job) => {
  const {
    fileId, fileKey, bucket,
  } = job.data;
  let res;
  try {
    res = await deleteFileFromS3(fileKey, bucket);
    return ({ status: 200, data: { fileId, fileKey, res } });
  } catch (error) {
    auditLogger.error(`S3 Queue Error: Unable to DELETE file '${fileId}' for key '${fileKey}': ${error.message}`);
    return {
      data: job.data,
      status: res ? res.$metadata.httpStatusCode : 500,
      res: res || undefined,
    };
  }
};

const verifyVersioning = async (bucket = bucketName, s3Client = s3) => {
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

const downloadFile = async (key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  return s3.send(command).then((data) => data.Body);
};

const getPresignedURL = async (Key, Bucket = bucketName, s3Client = s3, Expires = 360) => {
  const url = { url: null, error: null };
  try {
    const params = {
      Bucket,
      Key,
      Expires,
    };
    const command = new GetObjectCommand(params);
    url.url = await getSignedUrl(s3Client, command, { expiresIn: Expires });
  } catch (error) {
    url.error = error;
  }
  return url;
};

const uploadFile = async (buffer, name, type, s3Client = s3) => {
  const params = {
    Body: buffer,
    Bucket: bucketName,
    ContentType: type.mime,
    Key: name,
  };
  // Only check for versioning if not using Minio
  if (process.env.NODE_ENV === 'production') {
    await verifyVersioning();
  }

  return s3Client.send(new PutObjectCommand(params));
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
