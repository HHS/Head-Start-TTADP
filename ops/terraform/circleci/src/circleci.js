import https from 'https';
import { filter, take, partition } from 'lodash';

const artifactFileNames = /(?:(?:lcov-report\/index|cucumber_report)\.html)|(?:^reports\/.*\.png)$/;
const buildJobsInWorkflow = 8;
const workflowName = 'build_test_deploy';
const vcsType = process.env.CIRCLECI_VCS || 'github';
const org = process.env.CIRCLECI_ORG || 'HHS';
const project = process.env.CIRCLECI_PROJECT || 'Head-Start-TTADP';
const circleToken = process.env.CIRCLECI_AUTH_TOKEN;
const baseUrl = process.env.CIRCLECI_API_BASE_URL || 'https://circleci.com/api/v1.1';

if (!circleToken) {
  throw new Error('CIRCLECI_AUTH_TOKEN environment variable is required');
}

const requestJson = (path, params = {}) => new Promise((resolve, reject) => {
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, `${value}`);
    }
  });

  const req = https.get(url, {
    headers: {
      'Circle-Token': circleToken,
      Accept: 'application/json',
    },
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Unable to parse CircleCI response: ${error.message}`));
        }
      } else {
        reject(new Error(`CircleCI request failed (${res.statusCode}): ${body}`));
      }
    });
  });

  req.on('error', reject);
});

const projectPath = `/project/${vcsType}/${org}/${project}`;

const getLastTest = async () => {
  const lastBuilds = await requestJson(`${projectPath}/tree/main`, {
    limit: 50,
    filter: 'completed',
    shallow: 'false',
  });
  return take(
    filter(
      lastBuilds,
      (b) => (b.workflows && b.workflows.workflow_name === workflowName),
    ),
    buildJobsInWorkflow,
  );
};

const getTestMetadata = async (buildNum) => {
  const { tests = [], exceptions = null } = await requestJson(`${projectPath}/${buildNum}/tests`);
  const [success, other] = partition(tests, ({ result }) => (result === 'success'));

  return {
    success,
    other,
    exceptions,
  };
};

const getTestArtifacts = async (buildNum) => {
  const artifacts = await requestJson(`${projectPath}/${buildNum}/artifacts`);
  return filter(artifacts, ({ path }) => (path.match(artifactFileNames)));
};

export {
  getLastTest,
  getTestMetadata,
  getTestArtifacts,
};
