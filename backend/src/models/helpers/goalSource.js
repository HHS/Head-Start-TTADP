/* eslint-disable import/prefer-default-export */
const { GOAL_SOURCES } = require('@ttahub/common');

const onlyAllowTrGoalSourceForGoalsCreatedViaTr = (_sequelize, instance) => {
  const changed = instance.changed();
  if (instance.id !== null
        && Array.isArray(changed)
        && changed.includes('source')
        && (instance.createdVia === 'tr' && instance.source !== GOAL_SOURCES[4])) {
    throw new Error(`Goals created via a Training Report must have a source of "${GOAL_SOURCES[4]}".`);
  }
};

export {
  onlyAllowTrGoalSourceForGoalsCreatedViaTr,
};
