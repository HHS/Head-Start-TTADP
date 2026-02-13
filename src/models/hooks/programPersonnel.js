/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize'

const autoPopulateMapsTo = async (sequelize, instance, _options) => {
  if (instance.active === true) {
    // Update all programPersonnel with the same grantId, programId, and role to map to this id.
    return sequelize.models.ProgramPersonnel.update(
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
      }
    )
  }
  return Promise.resolve()
}

const afterBulkCreate = async (sequelize, instances, options) => {
  // Loop all instances and call autoPopulateMapsTo.
  await Promise.all(instances.map(async (instance) => autoPopulateMapsTo(sequelize, instance, options)))
}

export { afterBulkCreate }
