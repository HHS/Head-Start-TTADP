const JIRA_KEY_PATTERN = /\bTTAHUB-\d+\b/gi;
const JIRA_ISSUE_LINK_PATTERN = /https:\/\/jira\.acf\.gov\/browse\/(TTAHUB-\d+)\b/gi;
const PLACEHOLDER_JIRA_LINK_PATTERN = /https:\/\/jira\.acf\.gov\/browse\/TTAHUB-0\b/i;
const ISSUES_HEADINGS = ['Jira Issue(s)', 'Jira Issue', 'Issue(s)', 'Issue'];
const PLACEHOLDER_JIRA_KEY = 'TTAHUB-0';

function standardizeLineEndings(text = '') {
  return text.replace(/\r\n/g, '\n');
}

function stripHtmlComments(text = '') {
  return text.replace(/<!--[\s\S]*?-->/g, ' ');
}

function extractSectionContent(body = '', heading = '') {
  const bodyWithStandardLineEndings = standardizeLineEndings(body);
  const headings = [...bodyWithStandardLineEndings.matchAll(/^##\s+.*$/gm)];
  const sectionHeading = headings.find((match) => match[0].trim() === `## ${heading}`);

  if (!sectionHeading) {
    return '';
  }

  const currentIndex = headings.findIndex((match) => match.index === sectionHeading.index);
  const nextHeading = headings[currentIndex + 1];
  const contentEnd = nextHeading ? nextHeading.index : bodyWithStandardLineEndings.length;

  return bodyWithStandardLineEndings
    .slice(sectionHeading.index + sectionHeading[0].length, contentEnd)
    .trim();
}

function extractJiraKeys(text = '') {
  const keys = standardizeLineEndings(text).match(JIRA_KEY_PATTERN) || [];

  return [...new Set(keys.map((key) => key.toUpperCase()))];
}

function extractLinkedJiraIssues(text = '') {
  const matches = [...standardizeLineEndings(text).matchAll(JIRA_ISSUE_LINK_PATTERN)];

  return [
    ...new Set(
      matches.map((match) => match[1].toUpperCase()).filter((key) => key !== PLACEHOLDER_JIRA_KEY)
    ),
  ];
}

function extractIssuesSection(body = '') {
  return (
    ISSUES_HEADINGS.map((heading) => extractSectionContent(body, heading)).find(
      (section) => section && section.trim()
    ) || ''
  );
}

function validatePullRequestBody(body = '') {
  const issuesSection = extractIssuesSection(body);
  const issuesSectionWithoutComments = stripHtmlComments(issuesSection);
  const bodyWithoutComments = stripHtmlComments(body);
  const linkedIssues = extractLinkedJiraIssues(issuesSectionWithoutComments);
  const placeholderUsed = PLACEHOLDER_JIRA_LINK_PATTERN.test(issuesSectionWithoutComments);
  const linkedIssuesElsewhere = extractLinkedJiraIssues(bodyWithoutComments);
  const jiraKeysInIssuesSection = extractJiraKeys(issuesSectionWithoutComments).filter(
    (key) => key !== PLACEHOLDER_JIRA_KEY
  );

  if (!issuesSection.trim()) {
    return {
      valid: false,
      jiraKeys: [],
      message: 'PR validation failed: add a Jira issue link to the `Jira Issue(s)` section.',
    };
  }

  if (placeholderUsed) {
    return {
      valid: false,
      jiraKeys: linkedIssues,
      message: `PR validation failed: remove the ${PLACEHOLDER_JIRA_KEY} placeholder from the \`Jira Issue(s)\` section and keep only Jira issue links.`,
    };
  }

  if (!linkedIssues.length) {
    const keyFormatHint = jiraKeysInIssuesSection.length
      ? ` Jira key(s) found without links: ${jiraKeysInIssuesSection.join(', ')}. Use the full https://jira.acf.gov/browse/TTAHUB-#### issue link format.`
      : '';
    const locationHint = linkedIssuesElsewhere.length
      ? ` Jira issue link(s) found outside \`Jira Issue(s)\`: ${linkedIssuesElsewhere.join(', ')}.`
      : '';

    return {
      valid: false,
      jiraKeys: [],
      message: `PR validation failed: the \`Jira Issue(s)\` section must include at least one Jira issue link.${keyFormatHint}${locationHint}`,
    };
  }

  return {
    valid: true,
    jiraKeys: linkedIssues,
    message: `Validated Jira issue link(s): ${linkedIssues.join(', ')}`,
  };
}

module.exports = {
  extractIssuesSection,
  validatePullRequestBody,
};
