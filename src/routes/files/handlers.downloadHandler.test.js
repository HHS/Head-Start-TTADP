import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import { getSignedDownloadUrl } from '../../lib/s3';
import { currentUserId } from '../../services/currentUser';
import userCanDownloadFile from '../../services/fileAccess';
import { getFileById } from '../../services/files';
import { userById } from '../../services/users';
import { downloadHandler } from './handlers';

jest.mock('../../services/scanQueue', () => jest.fn());
jest.mock('bull');
jest.mock('axios');
jest.mock('smartsheet');
jest.mock('../../services/users');
jest.mock('../../services/currentUser');
jest.mock('../../services/fileAccess');
jest.mock('../../services/files', () => ({
  ...jest.requireActual('../../services/files'),
  getFileById: jest.fn(),
}));
jest.mock('../../lib/s3', () => ({
  deleteFileFromS3: jest.fn(),
  uploadFile: jest.fn(),
  getSignedDownloadUrl: jest.fn(),
}));
jest.mock('../../lib/apiErrorHandler', () => jest.fn());

describe('downloadHandler', () => {
  const req = { params: { fileId: '7' } };
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      sendStatus: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      set: jest.fn(),
      redirect: jest.fn(),
    };
    currentUserId.mockResolvedValue(1);
    userById.mockResolvedValue({ id: 1 });
    getFileById.mockResolvedValue({ id: 7, key: 'abc.pdf' });
    userCanDownloadFile.mockResolvedValue(true);
    getSignedDownloadUrl.mockReturnValue({ url: 'https://s3/signed', error: null });
  });

  it('redirects to a freshly signed url without caching it', async () => {
    await downloadHandler(req, res);

    expect(getSignedDownloadUrl).toHaveBeenCalledWith('abc.pdf');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.redirect).toHaveBeenCalledWith(httpCodes.TEMPORARY_REDIRECT, 'https://s3/signed');
  });

  it('returns 404 when the file does not exist', async () => {
    getFileById.mockResolvedValue(null);

    await downloadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('returns 403 and never signs a url when the user cannot read the file', async () => {
    userCanDownloadFile.mockResolvedValue(false);

    await downloadHandler(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    expect(getSignedDownloadUrl).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('returns 500 when a link cannot be signed', async () => {
    getSignedDownloadUrl.mockReturnValue({ url: null, error: new Error('no s3') });

    await downloadHandler(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('hands unexpected errors to the error handler', async () => {
    getFileById.mockRejectedValue(new Error('db down'));

    await downloadHandler(req, res);

    expect(handleErrors).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
