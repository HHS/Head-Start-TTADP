import { Op } from 'sequelize';
import {
  ActivityReport,
} from '../models';
import { auditLogger } from '../logger';
import { CREATOR_ROLES_REPORTS_TO_UPDATE } from './creatorRolesToUpdate';

const rolesToUpdate = [
  { role: 'Early Childhood Specialist', ids: [], legacyIds: [] },
  { role: 'Family Engagement', ids: [], legacyIds: [] },
  { role: 'Grantee Specialist', ids: [], legacyIds: [] },
  { role: 'Health Specialist', ids: [], legacyIds: [] },
  { role: 'System Specialist', ids: [], legacyIds: [] },
];

export default async function updateCreatorRoles() {
  // Loop and Bucket Report Ids by Role.
  CREATOR_ROLES_REPORTS_TO_UPDATE.forEach((r) => {
    const index = rolesToUpdate.findIndex((item) => item.role === r.role);
    if (index !== -1) {
      if (r.id.includes('-AR-')) {
        // Add to Legacy Ids.
        rolesToUpdate[index].legacyIds.push(r.id);
      } else {
        // Add to regular Ids.
        const numId = parseInt(r.id, 10);
        rolesToUpdate[index].ids.push(numId);
      }
    }
  });

  // Loop and Update Reports by Role.
  await Promise.all(rolesToUpdate.map((r) => ActivityReport.update({
    creatorRole: r.role,
  }, {
    where: [{
      [Op.or]: [{
        [Op.or]: r.ids.map((i) => ({
          id: {
            [Op.eq]: [i],
          },
        })),
        [Op.or]: r.ids.map((i) => ({
          legacyId: {
            [Op.eq]: [i],
          },
        })),
      }],
      [Op.and]: [{ creatorRole: { [Op.is]: null } }],
    }],
    transaction: options.transaction,
    hooks: false,
  })));
}
