const { GOAL_STATUS } = require('./constants');

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

const entityMap = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#47;',
  '[': '&#91;',
  ']': '&#93;',
};

function escapeHtml(str) {
  return str.replace(/[<>&"'\/]/g, function (s) {
    return entityMap[s];
  });
}

module.exports = {
  determineMergeGoalStatus,
  escapeHtml,
}