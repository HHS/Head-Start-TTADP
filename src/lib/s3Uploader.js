import { S3 } from 'aws-sdk';

export const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  endpoint: process.env.S3_ENDPOINT,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

export const verifyVersioning = async (bucket = process.env.bucket, s3Client = s3) => {
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
    Bucket: process.env.S3_BUCKET,
    ContentType: type.mime,
    Key: name,
  };
  // Only check for versioning if not using Minio
  if ( process.env.LOCAL_DEV !== 'true') {
    await verifyVersioning();
  }

  const upload = await s3Client.upload(params);
  return upload.promise();
};
export default s3Uploader;
