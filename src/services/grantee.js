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

export async function granteeByIdAndRegion(granteeId, regionId = null) {
  const grantsWhere = regionId ? { regionId } : {};

  return Grantee.findOne({
    attributes: [
      'name',
    ],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        model: Grant,
        as: 'grants',
        where: grantsWhere,
      },
    ],
    raw: true,
  });
}
