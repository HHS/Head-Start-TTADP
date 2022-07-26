import { Op } from 'sequelize';
import {
  sequelize,
  ActivityReport,
} from '../models';
import { auditLogger } from '../logger';

export const NEEDLE = '{"value":""}';

export default async function removeCruftFromArResources() {
  return sequelize.transaction(async (transaction) => {
    const eclkcWhere = {
      id: {
        [Op.in]: sequelize.literal('(SELECT "id" from "ActivityReports" WHERE \'{"value":""}\' = ANY("ECLKCResourcesUsed"))'),
      },
    };

    const eclkcReports = await ActivityReport.findAll({
      where: eclkcWhere,
      transaction,
    });

    auditLogger.info(`found ${eclkcReports.length} ECLKC reports`);

    await Promise.all(eclkcReports.map((report) => {
      const resources = report.ECLKCResourcesUsed.filter((resource) => resource !== NEEDLE);
      auditLogger.info(`updating report ${report.id} with ${resources}`);
      return report.update({ ECLKCResourcesUsed: resources }, { transaction });
    }));

    const nonEclkcWhere = {
      id: {
        [Op.in]: sequelize.literal('(SELECT "id" from "ActivityReports" WHERE \'{"value":""}\' = ANY("nonECLKCResourcesUsed"))'),
      },
    };

    const nonEclkcReports = await ActivityReport.findAll({
      where: nonEclkcWhere,
      transaction,
    });

    auditLogger.info(`found ${nonEclkcReports.length} nonECLKC reports`);

    return Promise.all(nonEclkcReports.map((report) => {
      const resources = report.nonECLKCResourcesUsed.filter((resource) => resource !== NEEDLE);
      auditLogger.info(`updating report ${report.id} with ${resources}`);
      return report.update({ nonECLKCResourcesUsed: resources }, { transaction });
    }));
  });
}
