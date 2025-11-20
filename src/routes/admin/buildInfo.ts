import httpCodes from 'http-codes';
import simpleGit from 'simple-git';
import { handleError } from '../../lib/apiErrorHandler';

const namespace = 'ADMIN:BUILDINFO';
const logContext = { namespace };
let git;

export default async function buildInfo(req, res) {
  if (!git) {
    git = simpleGit();
  }
  try {
    // Check for existing environment variables, or fetch from Git if undefined
    const branch = process.env.BUILD_BRANCH || (
      (process.env.NODE_ENV !== 'production')
        ? await git.revparse(['--abbrev-ref', 'HEAD'])
        : ''
    ).trim();
    const commit = process.env.BUILD_COMMIT || (
      (process.env.NODE_ENV !== 'production')
        ? await git.revparse(['HEAD'])
        : ''
    ).trim();
    const buildNumber = process.env.BUILD_NUMBER || '001';
    const timestamp = process.env.BUILD_TIMESTAMP || new Date().toISOString();

    // Send the response with the resolved values
    res.status(httpCodes.OK).json({
      branch,
      commit,
      buildNumber,
      timestamp,
    });
  } catch (err) {
    // Handle any errors and log context
    await handleError(req, res, err, logContext);
  }
}
