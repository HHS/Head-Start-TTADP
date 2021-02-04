import { S3 } from 'aws-sdk';

let s3Config;

let bucketName = process.env.S3_BUCKET;
if (process.env.VCAP_SERVICES) {
  const { credentials } = JSON.parse(process.env.VCAP_SERVICES).s3[0];
  bucketName = credentials.bucket;
  s3Config = {
    accessKeyId: credentials.access_key_id,
    endpoint: credentials.fips_endpoint,
    secretAccessKey: credentials.secret_access_key,
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
  };
} else {
  s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    endpoint: process.env.S3_ENDPOINT,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
  };
}
export const s3 = new S3(s3Config);

export const getPresignedURL = async (Key, Bucket = bucketName, s3Client = s3, Expires = 360) => {
  let url;
  try {
    const params = {
      Bucket,
      Key,
      Expires,
    };
    url = await s3Client.getSignedUrl('getObject', params);
  } catch (error) {
    return error;
  }
  return url;
};

export const verifyVersioning = async (bucket = bucketName, s3Client = s3) => {
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
  return new Promise((resolve) => resolve(data));
};

const s3Uploader = async (buffer, name, type, s3Client = s3) => {
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

  const upload = await s3Client.upload(params);
  return upload.promise();
};
export default s3Uploader;
