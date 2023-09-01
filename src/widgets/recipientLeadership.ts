import db from '../models';

const { Grant, ProgramPersonnel } = db;

export default async function recipientLeadership(recipientId: number, regionId: number) {
  return ProgramPersonnel.findAll({
    attributes: [
      'grantId',
      'prefix',
      'firstName',
      'lastName',
      'suffix',
      'email',
      'effectiveDate',
      'role',
      'fullName',

    ],
    where: {
      active: true,
    },
    include: [
      {
        required: true,
        model: Grant,
        as: 'grant',
        attributes: ['recipientId', 'id', 'regionId'],
        where: {
          recipientId,
          regionId,
        },
      },
    ],
  });
}
