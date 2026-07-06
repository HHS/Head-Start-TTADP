import { OBJECTIVE_STATUS } from '../constants';
import { auditLogger } from '../logger';
import { ActivityReportObjective, sequelize } from '../models';

const formatStatusToken = (value) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

export const parseActivityReportObjectiveId = (id) => {
  if (id === null || id === undefined) {
    return null;
  }

  const idString = String(id).trim();
  if (!/^\d+$/.test(idString)) {
    return null;
  }

  const parsedId = Number(idString);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
};

export const parseObjectiveStatus = (status) => {
  if (!status || typeof status !== 'string') {
    return null;
  }

  const validStatuses = Object.entries(OBJECTIVE_STATUS).reduce((acc, [key, value]) => {
    acc[formatStatusToken(key)] = value;
    acc[formatStatusToken(value)] = value;
    return acc;
  }, {});

  return validStatuses[formatStatusToken(status)] || null;
};

/**
 * Updates only ActivityReportObjective.status. This intentionally does not update
 * the linked Objective.status.
 */
export default async function changeActivityReportObjectiveStatus(id, status) {
  const activityReportObjectiveId = parseActivityReportObjectiveId(id);
  const parsedStatus = parseObjectiveStatus(status);

  if (!activityReportObjectiveId) {
    throw new Error(`Invalid ActivityReportObjective id: ${id}`);
  }

  if (!parsedStatus) {
    throw new Error(`Invalid objective status: ${status}`);
  }

  return sequelize.transaction(async (transaction) => {
    const activityReportObjective = await ActivityReportObjective.findOne({
      where: { id: activityReportObjectiveId },
      transaction,
    });

    if (!activityReportObjective) {
      throw new Error(`ActivityReportObjective not found: ${activityReportObjectiveId}`);
    }

    auditLogger.info(
      `Changing status of ActivityReportObjective: ${activityReportObjectiveId} from ${activityReportObjective.status} to ${parsedStatus}`
    );

    return activityReportObjective.update(
      {
        status: parsedStatus,
      },
      { transaction }
    );
  });
}
