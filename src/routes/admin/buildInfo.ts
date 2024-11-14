import httpCodes from 'http-codes';
import { handleError } from '../../lib/apiErrorHandler';
import simpleGit from 'simple-git';

const namespace = 'ADMIN:BUILDINFO';
const logContext = { namespace };
const git = simpleGit();

export default async function buildInfo(req, res) {
  try {
    // Check for existing environment variables, or fetch from Git if undefined
    const branch = process.env.BUILD_BRANCH || (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    const commit = process.env.BUILD_COMMIT || (await git.revparse(['HEAD'])).trim();
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
