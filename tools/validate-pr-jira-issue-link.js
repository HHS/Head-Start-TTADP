const { validatePullRequestBody } = require('./pr-jira-issue-link');

const result = validatePullRequestBody(process.env.PR_BODY || '');

if (!result.valid) {
  console.error(result.message);
  process.exit(1);
}

console.log(result.message);
