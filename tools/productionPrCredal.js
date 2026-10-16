const Joi = require('joi');

const DEFAULT_ENDPOINT = 'https://api.credal.acf.gov/api/v0/copilots/sendMessage';
const DEFAULT_AGENT_ID = 'e85a3cc2-5944-11f1-aad1-9f8702339566';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const JIRA_ISSUE_LINE_PATTERN = /^\*\s+https:\/\/jira\.acf\.gov\/browse\/TTAHUB-\d+$/;
const JIRA_KEY_PATTERN = /\bTTAHUB-\d+\b/gi;
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

/**
 * Rejects an embedded `##` (H2) heading line inside a prose field. Without
 * this, generated content containing e.g. "## Jira Issue(s)" plus its own
 * Jira link gets written verbatim into the body by wrapManagedSection, and
 * pr-notifications.yml's naive awk-based section extractor - which just
 * matches the first line satisfying `^## (Jira )?Issue` anywhere in the body,
 * not specifically the real template section - would pick up the injected
 * block instead of (or as well as) the real, already-validated `issues`
 * field, sending whatever tickets it contains to the Jira transition webhook.
 * `issues` itself doesn't need this check: its own per-line format validator
 * already rejects anything that isn't a bare Jira link line, which a heading
 * line could never satisfy.
 */
function rejectEmbeddedHeading(value, helpers) {
  if (OUTER_HEADING_PATTERN.test(value)) {
    return helpers.message(
      'must not contain a markdown "##" heading - that could inject a fake section into the rendered PR body'
    );
  }

  return value;
}

function validateIssuesFormat(value, helpers) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return helpers.error('string.empty');
  }

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
  descriptionOfChange: Joi.string().trim().min(1).custom(rejectEmbeddedHeading).required(),
  howToTest: Joi.string().trim().min(1).custom(rejectEmbeddedHeading).required(),
  issues: Joi.string().trim().min(1).custom(validateIssuesFormat).required(),
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

/**
 * The Jira tickets actually present in the release scope's source commits -
 * the only tickets Credal's "issues" output is allowed to mention. Looks at
 * each commit's subject, source PR title, and source PR body, since a ticket
 * can appear in any of the three depending on how the commit was authored.
 */
function extractExpectedJiraKeys(releaseCommits = []) {
  const keys = releaseCommits.flatMap((commit) => [
    ...extractJiraKeys(commit.subject),
    ...extractJiraKeys(commit.prTitle),
    ...extractJiraKeys(commit.prBody),
  ]);

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
  extractExpectedJiraKeys,
  validateIssuesAgainstReleaseScope,
  parseCredalResponse,
  buildCredalRequestBody,
  callCredalAgent,
};
