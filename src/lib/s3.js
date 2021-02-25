import { S3 } from 'aws-sdk';

const generateS3Config = () => {
  // take configuration from cloud.gov if it is available. If not, use env variables.
  if (process.env.VCAP_SERVICES) {
    const { credentials } = JSON.parse(process.env.VCAP_SERVICES).s3[0];
    return {
      bucketName: credentials.bucket,
      s3Config: {
        accessKeyId: credentials.access_key_id,
        endpoint: credentials.fips_endpoint,
        secretAccessKey: credentials.secret_access_key,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
  }
  return {
    bucketName: process.env.S3_BUCKET,
    s3Config: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      endpoint: process.env.S3_ENDPOINT,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      s3ForcePathStyle: true,
    },
  };
};

const { bucketName, s3Config } = generateS3Config();
const s3 = new S3(s3Config);

const verifyVersioning = async (bucket = bucketName, s3Client = s3) => {
  const versioningConfiguration = {
    MFADelete: 'Disabled',
    Status: 'Enabled',
  };
  let params = {
    Bucket: bucket,
  };
  const data = await s3Client.getBucketVersioning(params);
  if (!(data) || data.Status !== 'Enabled') {
    params = {
      Bucket: bucket,
      VersioningConfiguration: versioningConfiguration,
    };
    return s3Client.putBucketVersioning(params);
  }
  return data;
};

const downloadFile = (key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  return s3.getObject(params).promise();
};

const getPresignedURL = (Key, Bucket = bucketName, s3Client = s3, Expires = 360) => {
  const url = { url: null, error: null };
  try {
    const params = {
      Bucket,
      Key,
      Expires,
    };
    url.url = s3Client.getSignedUrl('getObject', params);
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

  return s3Client.upload(params).promise();
};

export {
  s3,
  downloadFile,
  getPresignedURL,
  uploadFile,
  generateS3Config,
  verifyVersioning,
};
