const AWS = require('aws-sdk');

export const s3 = new AWS.S3({
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
  const res = await s3Client.getBucketVersioning(params, (err, data) => {
    if (err) {
      return err;
    }
    console.log(data)
    if (!data || data.Status !== 'Enabled' || data.MFADelete === 'Disabled') {
      params = {
        Bucket: bucket,
        VersioningConfiguration: versioningConfiguration,
      };
      return s3Client.putBucketVersioning(params);
    }
    return new Promise((resolve) => resolve(data));
  });
  return res;
};

const s3Uploader = async (buffer, name, type, s3Client = s3) => {
  const params = {
    Body: buffer,
    Bucket: process.env.bucket,
    ContentType: type.mime,
    Key: name,
  };
  // Only check for versioning if not using Minio
  if (!process.env.S3_ENDPOINT.includes('minio')) {
    await verifyVersioning();
  }

  return s3Client.upload(params).promise();
};
export default s3Uploader;
