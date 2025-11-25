const { generateS3Config } = require('./s3');

/* eslint-env jest */
describe('generateS3Config', () => {
  const awsMock = { S3Client: jest.fn().mockImplementation(() => ({})) };

  afterEach(() => {
    // clean up env and module registry between tests
    delete process.env.VCAP_SERVICES;
    delete process.env.S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_ENDPOINT;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('reads credentials from VCAP_SERVICES.services.s3[0] and maps fields correctly', () => {
    jest.resetModules();
    process.env.VCAP_SERVICES = JSON.stringify({
      s3: [
        {
          credentials: {
            bucket: 'vcap-bucket',
            access_key_id: 'VCAP_AK',
            secret_access_key: 'VCAP_SK',
            fips_endpoint: 'https://vcap-endpoint.example',
            region: 'us-west-2',
          },
        },
      ],
    });

    jest.doMock('@aws-sdk/client-s3', () => awsMock);

    const cfg = generateS3Config();
    expect(cfg).toEqual({
      bucketName: 'vcap-bucket',
      s3Config: {
        accessKeyId: 'VCAP_AK',
        endpoint: 'https://vcap-endpoint.example',
        region: 'us-west-2',
        secretAccessKey: 'VCAP_SK',
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    });
  });

  test('prefers environment S3_* vars when VCAP_SERVICES not present', () => {
    jest.resetModules();
    delete process.env.VCAP_SERVICES;
    process.env.S3_BUCKET = 'env-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'ENV_AK';
    process.env.AWS_SECRET_ACCESS_KEY = 'ENV_SK';
    process.env.S3_ENDPOINT = 'https://env-endpoint.example';

    jest.doMock('@aws-sdk/client-s3', () => awsMock);

    const cfg = generateS3Config();
    expect(cfg).toEqual({
      bucketName: 'env-bucket',
      s3Config: {
        accessKeyId: 'ENV_AK',
        endpoint: 'https://env-endpoint.example',
        secretAccessKey: 'ENV_SK',
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      },
    });
  });

  test('returns nulls when no S3 configuration is present', () => {
    jest.resetModules();
    delete process.env.VCAP_SERVICES;
    delete process.env.S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    jest.doMock('@aws-sdk/client-s3', () => awsMock);

    const cfg = generateS3Config();
    expect(cfg).toEqual({ bucketName: null, s3Config: null });
  });

  test('uses the first s3 service entry (services.s3[0]) when multiple are present', () => {
    jest.resetModules();
    process.env.VCAP_SERVICES = JSON.stringify({
      s3: [
        {
          credentials: {
            bucket: 'first-bucket',
            access_key_id: 'FIRST_AK',
            secret_access_key: 'FIRST_SK',
            fips_endpoint: 'https://first.example',
            region: 'us-east-1',
          },
        },
        {
          credentials: {
            bucket: 'second-bucket',
            access_key_id: 'SECOND_AK',
            secret_access_key: 'SECOND_SK',
            fips_endpoint: 'https://second.example',
            region: 'us-east-2',
          },
        },
      ],
    });

    jest.doMock('@aws-sdk/client-s3', () => awsMock);

    const cfg = generateS3Config();
    expect(cfg.bucketName).toBe('first-bucket');
    expect(cfg.s3Config.accessKeyId).toBe('FIRST_AK');
    expect(cfg.s3Config.secretAccessKey).toBe('FIRST_SK');
  });
});
