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

export {
  GOAL_FORM_FIELDS,
  mapObjectivesAndRootCauses,
};
