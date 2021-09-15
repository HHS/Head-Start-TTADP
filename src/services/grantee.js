import { Grant, Grantee } from '../models';

export async function allGrantees() {
  return Grantee.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

export async function granteeByIdAndRegion(granteeId, regionId) {
  return Grantee.findOne({
    attributes: [
      'name',
    ],
    where: {
      id: granteeId,
    },
    include: [
      {
        // eslint-disable-next-line array-bracket-spacing
        attributes: ['id', 'number', 'regionId', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        model: Grant,
        as: 'grants',
        where: {
          regionId,
        },
      },
    ],
    raw: true,
  });
}
