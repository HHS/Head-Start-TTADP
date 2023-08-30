/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

const autoPopulateMapsTo = async (sequelize, instance, options) => {
  console.log('\n\n\n------- Called hook: ', instance.active);
  if (instance.active === true) {
    // Update all programPersonnel with the same grantId, programId, and role to map to this id.
    console.log('\n\n\n------Before', instance.id);
    let returnValues;
    try {
      returnValues = await sequelize.models.ProgramPersonnel.update(
        { mapsTo: instance.id },
        {
          logging: console.log,
          where: {
            grantId: instance.grantId,
            programId: instance.programId,
            role: instance.role,
            id: { [Op.ne]: instance.id },
          },
        },
      );
    } catch (err) {
      console.log('\n\n\n------Error: ', err);
    }

    console.log('\n\n\n------After', returnValues);
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateMapsTo(sequelize, instance, options);
};

export {
  afterCreate,
};
