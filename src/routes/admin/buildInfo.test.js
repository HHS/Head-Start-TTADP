import httpCodes from 'http-codes';
import simpleGit from 'simple-git';
import buildInfo from './buildInfo';
import { handleError } from '../../lib/apiErrorHandler';

jest.mock('../../lib/apiErrorHandler');
jest.mock('simple-git');

// Mock simple-git instance and revparse
const mockGit = {
  revparse: jest.fn(),
};
simpleGit.mockReturnValue(mockGit);

describe('buildInfo function', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Ensure environment variables are explicitly undefined
    delete process.env.BUILD_BRANCH;
    delete process.env.BUILD_COMMIT;
    delete process.env.BUILD_NUMBER;
    delete process.env.BUILD_TIMESTAMP;

    jest.clearAllMocks();
    simpleGit.mockReturnValue(mockGit); // Ensure the mock is applied in every test
  });

  it('returns all environment variables if they are all set', async () => {
    process.env.BUILD_BRANCH = 'main';
    process.env.BUILD_COMMIT = 'abcdef1234567890';
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(httpCodes.OK);
    expect(res.json).toHaveBeenCalledWith({
      branch: 'main',
      commit: 'abcdef1234567890',
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('falls back to Git branch if BUILD_BRANCH is not set', async () => {
    mockGit.revparse.mockResolvedValueOnce('feature-branch');
    process.env.BUILD_BRANCH = undefined;
    process.env.BUILD_COMMIT = 'abcdef1234567890';
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD']);
    expect(res.json).toHaveBeenCalledWith({
      branch: 'feature-branch',
      commit: 'abcdef1234567890',
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('falls back to Git commit if BUILD_COMMIT is not set', async () => {
    mockGit.revparse
      .mockResolvedValueOnce('main') // First call for branch
      .mockResolvedValueOnce('1234567890abcdef'); // Second call for commit
    process.env.BUILD_BRANCH = 'main';
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(mockGit.revparse).toHaveBeenCalledWith(['HEAD']);
    expect(res.json).toHaveBeenCalledWith({
      branch: 'main',
      commit: '1234567890abcdef',
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('uses default build number if BUILD_NUMBER is not set', async () => {
    process.env.BUILD_BRANCH = 'main';
    process.env.BUILD_COMMIT = 'abcdef1234567890';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(res.json).toHaveBeenCalledWith({
      branch: 'main',
      commit: 'abcdef1234567890',
      buildNumber: '001', // Default value
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('uses current timestamp if BUILD_TIMESTAMP is not set', async () => {
    process.env.BUILD_BRANCH = 'main';
    process.env.BUILD_COMMIT = 'abcdef1234567890';
    process.env.BUILD_NUMBER = '100';

    await buildInfo(req, res);

    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.branch).toBe('main');
    expect(jsonResponse.commit).toBe('abcdef1234567890');
    expect(jsonResponse.buildNumber).toBe('100');
    expect(new Date(jsonResponse.timestamp).getTime()).toBeCloseTo(new Date().getTime(), -3);
  });

  it('falls back to empty string if Git branch returns empty', async () => {
    mockGit.revparse.mockResolvedValueOnce(''); // Git returns empty string for branch
    process.env.BUILD_COMMIT = 'abcdef1234567890';
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD']);
    expect(res.json).toHaveBeenCalledWith({
      branch: '', // Fallback to empty string
      commit: 'abcdef1234567890',
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('falls back to empty string if Git commit returns empty', async () => {
    mockGit.revparse
      .mockResolvedValueOnce('main') // First call for branch
      .mockResolvedValueOnce(''); // Git returns empty string for commit
    process.env.BUILD_BRANCH = 'main';
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    await buildInfo(req, res);

    expect(mockGit.revparse).toHaveBeenCalledWith(['HEAD']);
    expect(res.json).toHaveBeenCalledWith({
      branch: 'main',
      commit: '', // Fallback to empty string
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });
  });

  it('handles errors if Git command for branch fails', async () => {
    const error = new Error('Git branch error');
    mockGit.revparse.mockRejectedValueOnce(error);

    await buildInfo(req, res);

    expect(handleError).toHaveBeenCalledWith(req, res, error, { namespace: 'ADMIN:BUILDINFO' });
  });

  it('handles errors if Git command for commit fails', async () => {
    process.env.BUILD_BRANCH = 'main';
    const error = new Error('Git commit error');
    mockGit.revparse
      .mockResolvedValueOnce('main') // First call for branch
      .mockRejectedValueOnce(error); // Second call for commit

    await buildInfo(req, res);

    expect(handleError).toHaveBeenCalledWith(req, res, error, { namespace: 'ADMIN:BUILDINFO' });
  });
});
