/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import { Op } from 'sequelize';
import { auditLogger } from '../logger';
import { ActivityReport, ActivityRecipient, OtherEntity } from '../models';

const hubOtherEntities = {
  HSCO: 'Head Start Collaboration Office',
  'Local/State Education System': 'State Education System',
  'State Early Learning System / Guidelines': 'State Early Learning Standards',
  'State Advisory Council': 'QRIS System',
  'Regional TTA Team / Specialists': 'Regional TTA/Other Specialists',
  'State Early Learning Standards / Guidelines':
    'State Early Learning Standards',
};

const populateLegacyOtherEntities = async () => {
  const otherEntityReports = await ActivityReport.findAll({
    where: {
      [Op.and]: [
        { legacyId: { [Op.ne]: null } },
        {
          imported: {
            otherEntityActivity: {
              [Op.ne]: '',
            },
          },
        },
      ],
    },
  });

  for await (const otherEntityReport of otherEntityReports) {
    const otherEntityArray = otherEntityReport.imported.otherEntityActivity.split(
      '\n',
    );
    for await (const otherEntityName of otherEntityArray) {
      const translatedOtherEntityName = hubOtherEntities[otherEntityName] || otherEntityName;
      const otherEntity = await OtherEntity.findOne({
        where: { name: translatedOtherEntityName },
      });
      if (otherEntity) {
        auditLogger.info(
          `Processing other-entities ${otherEntity.id} for activity report ${otherEntityReport.id}`,
        );
        await ActivityRecipient.findOrCreate({
          where: {
            activityReportId: otherEntityReport.id,
            otherEntityId: otherEntity.id,
          },
        });
      }
    }
  }
};

export default populateLegacyOtherEntities;
