const { generateS3Config } = require('./s3');

const oldEnv = process.env;
const VCAP_SERVICES = {
  s3: [
    {
      binding_name: null,
      credentials: {
        access_key_id: 'superSecretKeyId',
        additional_buckets: [],
        bucket: 'ourTestBucket',
        fips_endpoint: 'localhost',
        region: 'us-gov-west-1',
        secret_access_key: 'superSecretAccessKey',
        uri: 's3://username:password@localhost/ourTestBucket',
      },
      instance_name: 'ttasmarthub-test',
      label: 's3',
      name: 'ttasmarthub-test',
      plan: 'basic',
      provider: null,
      syslog_drain_url: null,
      tags: [
        'AWS',
        'S3',
        'object-storage',
      ],
      volume_mounts: [],
    },
  ],
};

process.env.VCAP_SERVICES = JSON.stringify(VCAP_SERVICES);

describe('Tests s3 client setup', () => {
  afterAll(() => { process.env = oldEnv; });
  it('returns proper config with process.env.VCAP_SERVICES set', () => {
    const { credentials } = VCAP_SERVICES.s3[0];
    const want = {
      bucketName: credentials.bucket,
      s3Config: {
        accessKeyId: credentials.access_key_id,
        endpoint: credentials.fips_endpoint,
        secretAccessKey: credentials.secret_access_key,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
    const got = generateS3Config();
    expect(got).toMatchObject(want);
  });
  it('returns proper config with process.env.VCAP_SERVICES not set', () => {
    delete process.env.VCAP_SERVICES;
    process.env.S3_BUCKET = 'test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'superSecretAccessKeyId';
    process.env.AWS_SECRET_ACCESS_KEY = 'superSecretAccessKey';
    process.env.S3_ENDPOINT = 'localhost';

    const want = {
      bucketName: process.env.S3_BUCKET,
      s3Config: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        endpoint: process.env.S3_ENDPOINT,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    };
    const got = generateS3Config();
    expect(got).toMatchObject(want);
  });
});
