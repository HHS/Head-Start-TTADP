import { Grant, Grantee } from '../models';

// eslint-disable-next-line import/prefer-default-export
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
