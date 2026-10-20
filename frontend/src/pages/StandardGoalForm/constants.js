/* eslint-disable import/prefer-default-export */

const GOAL_FORM_FIELDS = {
  SELECTED_GRANT: 'selectedGrant',
  SELECTED_GOAL: 'selectedGoal',
  OBJECTIVES: 'objectives',
  ROOT_CAUSES: 'rootCauses',
};

const mapObjectivesAndRootCauses = (data) => ({
  objectives: data.objectives ? data.objectives.map((o) => ({ title: o.value })) : [],
  rootCauses: data.rootCauses ? data.rootCauses.map((r) => r.id) : null,
});

const DEFAULT_STATUS_CHANGE_BLOCKING_REASONS = {
  activeActivityReport: false,
  incompleteObjectives: false,
  fromApi: false,
  invalidStatusChangeAttempted: false,
};

export { DEFAULT_STATUS_CHANGE_BLOCKING_REASONS, GOAL_FORM_FIELDS, mapObjectivesAndRootCauses };
