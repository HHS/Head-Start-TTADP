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

export async function granteeByIdAndRegion(granteeId) {
  return Grantee.findOne({
    attributes: [
      'name',
    ],
    where: {
      id: granteeId,
    },
    raw: true,
  });
}
