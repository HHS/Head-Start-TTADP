// const { Op } = require('sequelize');
// import { auditLogger } from '../../logger';

const automaticStatusChangeOnUse = async (sequelize, instance, options) => {
  await sequelize.models.Goal.update(
    { status: 'In Progress' },
    {
      where: {
        id: instance.goalId,
        status: ['Draft', 'Not Started', 'Suspended'],
      },
      transaction: options.transaction,
    },
  );
};

const afterCreate = async (sequelize, instance, options) => {
  await automaticStatusChangeOnUse(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await automaticStatusChangeOnUse(sequelize, instance, options);
};

const afterUpsert = async (sequelize, instance, options) => {
  await automaticStatusChangeOnUse(sequelize, instance, options);
};

export {
  automaticStatusChangeOnUse,
  afterCreate,
  afterUpdate,
  afterUpsert,
};
