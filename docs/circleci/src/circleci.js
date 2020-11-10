import CircleCI from 'circleci';
import { filter, take, partition } from 'lodash';

const artifactFileNames = /(lcov-report\/index|cucumber_report)\.html/;
const buildJobsInWorkflow = 7;
const workflowName = "build_test_deploy";

const ci = new CircleCI({
  auth: process.env.CIRCLECI_AUTH_TOKEN
});

const getLastTest = async () => {
  const lastBuilds = await ci.getBranchBuilds({
    username: "HHS",
    project: "Head-Start-TTADP",
    branch: "main",
  });
  return take(
    filter(
      lastBuilds,
      (b) => (b.workflows.workflow_name === workflowName)
    ),
    buildJobsInWorkflow);
}

const getTestMetadata = async (buildNum) => {
  const { tests, exceptions } = await ci.getTestMetadata({
    username: "HHS",
    project: "Head-Start-TTADP",
    build_num: buildNum
  });
  const [ success, other ] = partition(tests, ({result}) => (result === "success"));

  return {
    success,
    other,
    exceptions
  }
}

const getTestArtifacts = async (buildNum) => {
  const artifacts = await ci.getBuildArtifacts({
    username: "HHS",
    project: "Head-Start-TTADP",
    build_num: buildNum
  });
  return filter(artifacts, ({path}) => (path.match(artifactFileNames)));
}

export default ci;
export {
  getLastTest,
  getTestMetadata,
  getTestArtifacts
}
