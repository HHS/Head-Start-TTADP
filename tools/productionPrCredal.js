const Joi = require('joi');

const DEFAULT_ENDPOINT = 'https://api.credal.acf.gov/api/v0/copilots/sendMessage';
const DEFAULT_AGENT_ID = 'e85a3cc2-5944-11f1-aad1-9f8702339566';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const JIRA_ISSUE_LINE_PATTERN = /^\*\s+https:\/\/jira\.acf\.gov\/browse\/TTAHUB-\d+$/;

// Keep in sync with docs/credalProductionPrPrompt.md's Title Rules cap.
const TITLE_MAX_LENGTH = 80;

/**
 * Marks a failure as deterministic (malformed response, non-retryable HTTP
 * status) so callCredalAgent's retry loop can tell it apart from a transient
 * one without relying on matching error message text.
 */
class CredalNonRetryableError extends Error {}

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
  descriptionOfChange: Joi.string().trim().min(1).required(),
  howToTest: Joi.string().trim().min(1).required(),
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
      return validateProductionPrContent(content);
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
  parseCredalResponse,
  buildCredalRequestBody,
  callCredalAgent,
};
