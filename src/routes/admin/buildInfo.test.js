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

jest.mock('simple-git');
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

  it('does not call Git commands in production environment', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.BUILD_BRANCH;
    delete process.env.BUILD_COMMIT;

    await buildInfo(req, res);

    expect(mockGit.revparse).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      branch: '',
      commit: '',
      buildNumber: '001',
      timestamp: expect.any(String),
    });

    delete process.env.NODE_ENV;
  });

  it('falls back to Git branch if BUILD_BRANCH is not set and NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development'; // Simulating non-production
    mockGit.revparse.mockResolvedValueOnce('feature-branch');
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

  it('falls back to Git commit if BUILD_COMMIT is not set and NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development'; // Simulating non-production

    // Mock sequential calls for branch and commit
    mockGit.revparse
      .mockResolvedValueOnce('main') // First call for branch
      .mockResolvedValueOnce('1234567890abcdef'); // Second call for commit

    delete process.env.BUILD_COMMIT; // Ensure BUILD_COMMIT is not set
    delete process.env.BUILD_BRANCH;
    process.env.BUILD_NUMBER = '100';
    process.env.BUILD_TIMESTAMP = '2024-11-13T12:34:56Z';

    // Call the function
    await buildInfo(req, res);

    // Assertions
    expect(mockGit.revparse).toHaveBeenCalledWith(['HEAD']); // Verify commit call
    expect(res.json).toHaveBeenCalledWith({
      branch: 'main',
      commit: '1234567890abcdef', // Ensure correct commit hash
      buildNumber: '100',
      timestamp: '2024-11-13T12:34:56Z',
    });

    delete process.env.NODE_ENV; // Clean up after test
  });

  it('handles errors if Git commands are called in non-production environment and fail', async () => {
    process.env.NODE_ENV = 'development'; // Simulating non-production
    const error = new Error('Git branch error');
    mockGit.revparse.mockRejectedValueOnce(error);

    await buildInfo(req, res);

    expect(handleError).toHaveBeenCalledWith(req, res, error, { namespace: 'ADMIN:BUILDINFO' });
  });

  it('returns default values when NODE_ENV is production and environment variables are not set', async () => {
    process.env.NODE_ENV = 'production';

    await buildInfo(req, res);

    expect(res.json).toHaveBeenCalledWith({
      branch: '',
      commit: '',
      buildNumber: '001',
      timestamp: expect.any(String),
    });

    delete process.env.NODE_ENV;
  });
});
