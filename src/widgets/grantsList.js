import { Op } from 'sequelize';
import { Grant, Grantee } from '../models';
import { DECIMAL_BASE } from '../constants';

export default async function grants(scopes, query) {
  const granteeId = parseInt(query['grantee.in'], DECIMAL_BASE);
  const res = await Grantee.findByPk(
    granteeId,
    {
      attributes: ['id'],
      include: [
        {
          attributes: ['id', 'number', 'status', 'regionId', 'startDate', 'endDate'],
          where: {
            [Op.and]: [
              scopes,
            ],
          },
          model: Grant,
          as: 'grants',
        },
      ],
    },
  );

  return res ? res.grants : [];
}
