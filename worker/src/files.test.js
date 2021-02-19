const axios = require('axios');
const { processFile, fileStatuses } = require('./files');
const { s3 } = require('./s3');
const { File } = require('./models');

const s3Return = {
  AcceptRanges: 'bytes',
  LastModified: '2021-02-15T20:50:03.000Z',
  ContentLength: 11,
  ETag: '"5e133420022085db9eec34950b8e48fe"',
  ContentType: 'text/plain',
  Metadata: {},
  Body: Buffer.from('Hello World!'),
};

const mockS3 = jest.spyOn(s3, 'getObject').mockImplementation(() => ({ promise: () => Promise.resolve(s3Return) }));

const mockAxios = jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve());
const axiosCleanResponse = { status: 200, data: { Status: 'OK', Description: '' } };
const axiosDirtyError = new Error();
axiosDirtyError.response = { status: 406, data: { Status: 'FOUND', Description: 'Eicar-Test-Signature' } };
const axiosServerError = new Error();
axiosServerError.response = { status: 500 };

const mockFindOne = jest.spyOn(File, 'findOne').mockImplementation(
  () => Promise.resolve({ dataValues: { id: 1 } }),
);
const mockUpdate = jest.spyOn(File, 'update').mockImplementation(() => Promise.resolve());
const fileKey = '9f830aaa-5bfc-4f9c-a8c6-30753d1440b4.pdf';

describe('File Scanner tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('tests a clean file scan', async () => {
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    const got = await processFile(fileKey);
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual({ Status: 'OK', Description: '' });
    expect(mockS3).toBeCalled();
    expect(mockAxios).toBeCalled();
    expect(mockFindOne).toBeCalledWith({ where: { key: fileKey } });
    expect(mockUpdate).toBeCalledWith(
      { status: fileStatuses.APPROVED },
      { where: { id: 1 } },
    );
  });
  it('tests a dirty file scan', async () => {
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosDirtyError));
    const got = await processFile(fileKey);
    expect(got.status).toBe(406);
    expect(got.data).toStrictEqual({ Status: 'FOUND', Description: 'Eicar-Test-Signature' });
    expect(mockS3).toBeCalled();
    expect(mockAxios).toBeCalled();
    expect(mockFindOne).toBeCalledWith({ where: { key: fileKey } });
    expect(mockUpdate).toBeCalledWith(
      { status: fileStatuses.REJECTED },
      { where: { id: 1 } },
    );
  });
  it('tests an error', async () => {
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosServerError));
    const got = processFile(fileKey);
    await expect(got).rejects.toBe(axiosServerError);
  });
});
