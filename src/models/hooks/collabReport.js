const { REPORT_STATUSES } = require('@ttahub/common');

export default async function validateSubmission(instance) {
  const changed = instance.changed();
  const isSubmission = Array.isArray(changed) && changed.includes('status')
     && !instance.previous('status') === REPORT_STATUSES.SUBMITTED
     && instance.status !== REPORT_STATUSES.SUBMITTED;

  const requiredFields = [
    'name',
    'startDate',
    'endDate',
    'duration',
    'isStateActivity',
    'conductMethod',
    'description',
  ];

  if (isSubmission) {
    requiredFields.forEach((field) => {
      if (!instance[field]) {
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
