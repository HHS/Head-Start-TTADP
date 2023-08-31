/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';

const autoPopulateMapsTo = async (sequelize, instance, options) => {
  if (instance.active === true) {
    // Update all programPersonnel with the same grantId, programId, and role to map to this id.
    await sequelize.models.ProgramPersonnel.update(
      {
        mapsTo: instance.id,
        active: false,
      },
      {
        where: {
          grantId: instance.grantId,
          programId: instance.programId,
          role: instance.role,
          id: { [Op.ne]: instance.id },
        },
      },
    );
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateMapsTo(sequelize, instance, options);
};

export {
  afterCreate,
};
