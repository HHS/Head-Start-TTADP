// const { Op } = require('sequelize');
// import { auditLogger } from '../../logger';

const automaticStatusChangeOnUse = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne(
    {
      where: {
        id: instance.objectiveId,
        status: ['Draft', 'Not Started', 'Suspended'],
      },
      transaction: options.transaction,
    },
  );
  if (objective) {
    objective.status = 'In Progress';
    return objective.save();
  }
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
