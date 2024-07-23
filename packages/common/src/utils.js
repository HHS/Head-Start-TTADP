const { GOAL_STATUS, DISALLOWED_URLS, VALID_URL_REGEX } = require('./constants');

function isValidResourceUrl(attempted) {
  try {
    const httpOccurences = (attempted.match(/http/gi) || []).length;
    if (
      httpOccurences !== 1
      || DISALLOWED_URLS.some((disallowed) => disallowed.url === attempted)
    ) {
      return false;
    }

    const matches = [...attempted.matchAll(VALID_URL_REGEX)].map(({ groups }) => groups);

    if (matches?.length !== 1) {
      return false;
    }

    const u = new URL(attempted);
    return (u !== '');
  } catch (e) {
    return false;
  }
};

/**
 * Given a list of goal statuses, determine the final status
 * based on the criteria provided by OHS. Intended only
 * to be used for merge goals
 *
 * Note that this should be kept in sync with the status predicted by
 * the React component the user sees (FinalGoalCard)
 *
 * @param {string[]} statuses
 * @returns string one of Object.values(GOAL_STATUS)
 */
function determineMergeGoalStatus(statuses) {
    if (statuses.includes(GOAL_STATUS.IN_PROGRESS)) {
      return GOAL_STATUS.IN_PROGRESS;
    }
  
    if (statuses.includes(GOAL_STATUS.CLOSED)) {
      return GOAL_STATUS.CLOSED;
    }
  
    if (statuses.includes(GOAL_STATUS.SUSPENDED)) {
      return GOAL_STATUS.SUSPENDED;
    }
  
    if (statuses.includes(GOAL_STATUS.NOT_STARTED)) {
      return GOAL_STATUS.NOT_STARTED;
    }
    return GOAL_STATUS.DRAFT;
}

module.exports = {
  determineMergeGoalStatus,
  isValidResourceUrl,
}