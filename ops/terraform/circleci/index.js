import { getLastTest, getTestMetadata, getTestArtifacts } from './src/circleci';
import fs from 'fs';

const exportLastMainTests = async (fileName = "test_report.md") => {
  const lastTestPipeline = await getLastTest();
  let data = "# Test Results Report\n";
  for (let job of lastTestPipeline) {
    let { success, other, exceptions } = await getTestMetadata(job.build_num);
    let artifacts = await getTestArtifacts(job.build_num);
    const hasTestReults = success.length > 0 || other.length > 0 || exceptions != null;
    const hasArtifacts = artifacts.length > 0;
    if (hasTestReults || hasArtifacts) {
      data += `\n## ${job.workflows.job_name}\n`;
      if (hasTestReults) {
        data += "### Test Results:\n"
        data += `#### Success:\n\`\`\`\n${JSON.stringify(success, null, 2)}\n\`\`\`\n`;
        data += `#### Failure:\n\`\`\`\n${JSON.stringify(other, null, 2)}\n\`\`\`\n`
        data += `#### Exceptions:\n\`\`\`\n${JSON.stringify(exceptions, null, 2)}\n\`\`\`\n`
      }
      if (hasArtifacts) {
        data += `### Artifacts:\n\`\`\`\n${JSON.stringify(artifacts, null, 2)}\n\`\`\`\n`;
      }
    }
  }
  fs.writeFile(fileName, data, (err) => {
    if (err) throw err;
    console.log("Done");
  })
}

export {
  exportLastMainTests
}
