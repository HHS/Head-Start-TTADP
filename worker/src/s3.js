const { S3 } = require('aws-sdk');

let s3Config;

// take configuration from cloud.gov if it is available. If not, use env variables.
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
const s3 = new S3(s3Config);

function downloadFile(key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  return s3.getObject(params).promise();
}

module.exports = {
  downloadFile,
  s3,
};
