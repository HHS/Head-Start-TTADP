const Joi = require('joi');
const { extractIssuesSection } = require('./pr-jira-issue-link');

const DEFAULT_ENDPOINT = 'https://api.credal.acf.gov/api/v0/copilots/sendMessage';
const DEFAULT_AGENT_ID = 'e85a3cc2-5944-11f1-aad1-9f8702339566';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const JIRA_ISSUE_LINE_PATTERN = /^\*\s+https:\/\/jira\.acf\.gov\/browse\/TTAHUB-\d+$/;
const JIRA_KEY_PATTERN = /\bTTAHUB-\d+\b/gi;
const JIRA_LINK_PATTERN = /https:\/\/jira\.acf\.gov\/browse\/(TTAHUB-\d+)\b/gi;
const JIRA_PLACEHOLDER_KEY = 'TTAHUB-0';

// Keep in sync with docs/credalProductionPrPrompt.md's Title Rules cap.
const TITLE_MAX_LENGTH = 80;

/**
 * Marks a failure as deterministic (malformed response, non-retryable HTTP
 * status) so callCredalAgent's retry loop can tell it apart from a transient
 * one without relying on matching error message text.
 */
class CredalNonRetryableError extends Error {}

const OUTER_HEADING_PATTERN = /^##[^#]/m;
// Matches the marker namespace, not the full `<!--` opener. The SAST job
// (Semgrep with p/default) fails to parse a regex literal that starts with the
// HTML comment opener in this file, which makes the whole scan incomplete.
const MANAGED_MARKER_PATTERN = /production-pr:/i;

/**
 * Rejects structure that would break the rendered PR body when it appears
 * inside a prose field.
 *
 * An embedded `##` (H2) heading line: without this, generated content
 * containing e.g. "## Jira Issue(s)" plus its own Jira link gets written
 * verbatim into the body by wrapManagedSection, and pr-notifications.yml's
 * naive awk based section extractor, which matches the first line satisfying
 * `^## (Jira )?Issue` anywhere in the body and not specifically the real
 * template section, would pick up the injected block instead of (or as well
 * as) the real, already validated `issues` field, sending whatever tickets it
 * contains to the Jira transition webhook.
 *
 * A managed section marker: after the first run, the markers are part of the
 * existing PR body that is sent back to Credal. If generated text echoes an
 * end marker, setManagedSection stops at that first marker on the next update
 * and the rest of the generated text is left outside the managed section for
 * good.
 *
 * `issues` needs neither check: its own per line format validator already
 * rejects anything that is not a bare Jira link line, which a heading or a
 * marker line could never satisfy.
 */
function rejectStructuralInjection(value, helpers) {
  if (OUTER_HEADING_PATTERN.test(value)) {
    return helpers.message(
      'must not contain a markdown "##" heading - that could inject a fake section into the rendered PR body'
    );
  }

  if (MANAGED_MARKER_PATTERN.test(value)) {
    return helpers.message(
      'must not contain a production-pr managed section marker - that could break the section boundary on the next update'
    );
  }

  return value;
}

/**
 * An empty issues field is valid here on purpose: whether it is acceptable
 * depends on the release scope, which this schema cannot see. A release that
 * declares no tickets must have an empty field, and one that declares tickets
 * must not, and validateIssuesAgainstReleaseScope enforces both.
 */
function validateIssuesFormat(value, helpers) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const invalidLine = lines.find((line) => !JIRA_ISSUE_LINE_PATTERN.test(line));

  if (invalidLine) {
    return helpers.message(
      `"issues" contains a line that isn't a Jira issue link: "${invalidLine}"`
    );
  }

  return value;
}

const PRODUCTION_PR_CONTENT_SCHEMA = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(TITLE_MAX_LENGTH)
    .pattern(/^\[Prod\]/)
    .required()
    .messages({
      'string.pattern.base': '"title" must start with "[Prod]"',
    }),
  descriptionOfChange: Joi.string().trim().min(1).custom(rejectStructuralInjection).required(),
  howToTest: Joi.string().trim().min(1).custom(rejectStructuralInjection).required(),
  issues: Joi.string().trim().allow('').custom(validateIssuesFormat).required(),
}).required();

/**
 * Validates Credal's output before it's allowed anywhere near `gh pr
 * create`/`gh pr edit`. Per the plan's fail-loudly decision, an invalid
 * response is a thrown error, never a best-effort fallback.
 */
function validateProductionPrContent(content) {
  const { error, value } = PRODUCTION_PR_CONTENT_SCHEMA.validate(content, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new CredalNonRetryableError(`Credal response failed validation: ${error.message}`);
  }

  return value;
}

function extractJiraKeys(text) {
  // `?? ''` rather than a default parameter, since release-commit fields
  // (prTitle/prBody) are explicitly `null` for an unresolved commit, not
  // `undefined` - a default parameter alone wouldn't catch that.
  const keys = (text ?? '').match(JIRA_KEY_PATTERN) || [];
  return [...new Set(keys.map((key) => key.toUpperCase()))];
}

function extractLinkedJiraKeys(text) {
  return [...(text ?? '').matchAll(JIRA_LINK_PATTERN)].map((match) => match[1].toUpperCase());
}

// Dependabot pull requests declare their ticket on a standalone `Jira: <url>`
// line instead of a Jira Issue(s) section.
function extractStandaloneJiraLines(body) {
  return (body ?? '')
    .split(/\r?\n/)
    .filter((line) => /^\s*Jira:/i.test(line))
    .join('\n');
}

/**
 * The Jira tickets a commit declares. A ticket mentioned in the prose of a PR
 * body, such as a follow up or a separate piece of work, is not declared, and
 * counting it would make Credal list it and the notification workflow
 * transition it. Declared means: in the commit subject, in the PR title, as a
 * link in the PR's issues section (using the same headings that
 * pr-jira-issue-link.js accepts), or on a standalone `Jira:` line.
 */
function extractDeclaredJiraKeys({ subject, prTitle, prBody }) {
  const body = prBody ?? '';

  return [
    ...new Set([
      ...extractJiraKeys(subject),
      ...extractJiraKeys(prTitle),
      ...extractLinkedJiraKeys(extractIssuesSection(body)),
      ...extractLinkedJiraKeys(extractStandaloneJiraLines(body)),
    ]),
  ];
}

/**
 * The Jira tickets declared by the release scope's source commits - the only
 * tickets Credal's "issues" output is allowed to mention, and all of them
 * must be mentioned.
 */
function extractExpectedJiraKeys(releaseCommits = []) {
  const keys = releaseCommits.flatMap((commit) => extractDeclaredJiraKeys(commit));

  return [...new Set(keys)].filter((key) => key !== JIRA_PLACEHOLDER_KEY);
}

/**
 * Cross-checks Credal's "issues" output against the release scope's actual
 * Jira tickets, rather than trusting link-syntax validity alone. The
 * downstream notification workflow transitions every ticket this section
 * lists, so a ticket Credal silently dropped, or a syntactically valid ID it
 * substituted in instead, is operationally significant, not cosmetic.
 */
function validateIssuesAgainstReleaseScope(issues, releaseCommits = []) {
  const expected = new Set(extractExpectedJiraKeys(releaseCommits));
  const actual = new Set(extractJiraKeys(issues).filter((key) => key !== JIRA_PLACEHOLDER_KEY));
  const hasPlaceholder = new RegExp(`\\b${JIRA_PLACEHOLDER_KEY}\\b`).test(issues);

  const missing = [...expected].filter((key) => !actual.has(key));
  const invented = [...actual].filter((key) => !expected.has(key));

  if (!hasPlaceholder && missing.length === 0 && invented.length === 0) {
    return;
  }

  const problems = [];

  if (hasPlaceholder) {
    problems.push(`still contains the placeholder ${JIRA_PLACEHOLDER_KEY}`);
  }

  if (missing.length > 0) {
    problems.push(`is missing ticket(s) present in the release scope: ${missing.join(', ')}`);
  }

  if (invented.length > 0) {
    problems.push(`includes ticket(s) not present in the release scope: ${invented.join(', ')}`);
  }

  throw new CredalNonRetryableError(`Credal response's "issues" ${problems.join('; ')}`);
}

/**
 * Extracts and parses the agent's reply out of the sendMessage envelope.
 * `response.message` is the canonical source, not `response.structuredOutput`
 * - see docs/productionPrAutomationPlan.md for why (a test call showed
 * structuredOutput silently dropping a space that `message` had correctly).
 */
function parseCredalResponse(rawBody) {
  let envelope;

  try {
    envelope = JSON.parse(rawBody);
  } catch (error) {
    throw new CredalNonRetryableError(`Credal response was not valid JSON: ${error.message}`);
  }

  const message = envelope?.sendChatResult?.response?.message;

  if (typeof message !== 'string' || message.length === 0) {
    throw new CredalNonRetryableError(
      'Credal response was missing sendChatResult.response.message'
    );
  }

  try {
    return JSON.parse(message);
  } catch (error) {
    throw new CredalNonRetryableError(
      `Credal's "message" field was not valid JSON: ${error.message}`
    );
  }
}

function buildCredalRequestBody({ payload, agentId = DEFAULT_AGENT_ID, userEmail }) {
  return {
    agentId,
    message: JSON.stringify(payload),
    userEmail,
  };
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Calls the Credal agent, parses, and validates its response. Retries on
 * transient failures (timeout, network error, 429/5xx) up to maxAttempts;
 * never retries a parse/validation failure, since that's a deterministic
 * problem with the response content, not a transient one.
 */
async function callCredalAgent({
  payload,
  userEmail,
  endpoint = DEFAULT_ENDPOINT,
  agentId = DEFAULT_AGENT_ID,
  apiKey = process.env.CREDAL_API_KEY_ACF,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryDelayMs = RETRY_BASE_DELAY_MS,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) {
    throw new Error('Missing Credal API key (expected CREDAL_API_KEY_ACF)');
  }

  const body = JSON.stringify(buildCredalRequestBody({ payload, agentId, userEmail }));

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < maxAttempts) {
          lastError = new Error(`Credal request failed with status ${response.status}`);
          // eslint-disable-next-line no-await-in-loop
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw new CredalNonRetryableError(`Credal request failed with status ${response.status}`);
      }

      // eslint-disable-next-line no-await-in-loop
      const rawBody = await response.text();
      const content = parseCredalResponse(rawBody);
      const validated = validateProductionPrContent(content);
      validateIssuesAgainstReleaseScope(validated.issues, payload.releaseCommits);
      return validated;
    } catch (error) {
      const isAbort = error.name === 'AbortError';

      if (isAbort && attempt < maxAttempts) {
        lastError = new Error(`Credal request timed out after ${timeoutMs}ms`);
        // eslint-disable-next-line no-await-in-loop
        await sleep(retryDelayMs * attempt);
        continue;
      }

      if (isAbort) {
        throw new Error(`Credal request timed out after ${timeoutMs}ms`);
      }

      // A non-retryable status, parse, or validation failure is deterministic
      // given the same response - retrying won't fix it.
      if (error instanceof CredalNonRetryableError) {
        throw error;
      }

      if (attempt < maxAttempts) {
        lastError = error;
        // eslint-disable-next-line no-await-in-loop
        await sleep(retryDelayMs * attempt);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

module.exports = {
  CredalNonRetryableError,
  PRODUCTION_PR_CONTENT_SCHEMA,
  validateProductionPrContent,
  extractJiraKeys,
  extractDeclaredJiraKeys,
  extractExpectedJiraKeys,
  validateIssuesAgainstReleaseScope,
  parseCredalResponse,
  buildCredalRequestBody,
  callCredalAgent,
};
