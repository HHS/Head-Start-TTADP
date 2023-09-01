import db, { sequelize } from '../models';

const { Grant, ProgramPersonnel } = db;

export default async function recipientLeadershipHistory(recipientId: number, regionId: number) {
  return ProgramPersonnel.findAll({
    attributes: [
      [
        sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            'id',
            sequelize.col('"ProgramPersonnel".id'),
            'grantId',
            sequelize.col('grantId'),
            'prefix',
            sequelize.col('prefix'),
            'firstName',
            sequelize.col('firstName'),
            'lastName',
            sequelize.col('lastName'),
            'suffix',
            sequelize.col('suffix'),
            'effectiveDate',
            sequelize.col('effectiveDate'),
          ),
        ),
        'history',
      ],
      'role',
    ],
    where: {
      '$grant.recipientId$': recipientId,
      '$grant.regionId$': regionId,
    },
    include: [
      {
        required: true,
        model: Grant,
        as: 'grant',
        attributes: [],
      },
    ],
    group: ['role', 'grant->recipient.id'],
    raw: true,
  });
}
