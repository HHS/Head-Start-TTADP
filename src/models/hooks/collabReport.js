const { REPORT_STATUSES } = require('@ttahub/common');

export async function validateSubmission(instance) {
  const changed = instance.changed();
  const isSubmission = Array.isArray(changed) && changed.includes('submissionStatus')
     && instance.previous('submissionStatus') !== REPORT_STATUSES.SUBMITTED
     && instance.submissionStatus === REPORT_STATUSES.SUBMITTED;

  // we can expand this as we go to also query for related models
  // like next steps
  const requiredFields = [
    'name',
    'startDate',
    'endDate',
    'duration',
    'isStateActivity',
    'conductMethod',
    'description',
    'participants',
    'reportReasons',
    'steps',
  ];

  if (isSubmission) {
    requiredFields.forEach((field) => {
      const value = instance[field];
      // we allow false in the case of boolean fields
      if (value !== false && !value) {
        throw new Error(`Required field not provided: ${field}`);
      }
    });
  }
}

const beforeUpdate = async (_sequelize, instance) => {
  await validateSubmission(instance);
};

export {
  beforeUpdate,
};
