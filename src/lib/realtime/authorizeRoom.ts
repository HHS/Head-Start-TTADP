import db from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import CollabReportPolicy from '../../policies/collabReport';
import { userById } from '../../services/users';
import type { RealtimeUser } from '.';

const REPORT_ATTRIBUTES = ['id', 'userId', 'regionId', 'calculatedStatus', 'submissionStatus'];
const userIdOnly = (as: string) => ({ model: db.User, as, attributes: ['id'] });

/**
 * Loads only what ActivityReportPolicy#canGet reads, rather than the full
 * report the page fetches, since every room join runs this.
 */
const activityReportForPolicy = (id: number) =>
  db.ActivityReport.findByPk(id, {
    attributes: REPORT_ATTRIBUTES,
    include: [
      {
        model: db.ActivityReportCollaborator,
        as: 'activityReportCollaborators',
        attributes: ['id'],
        required: false,
        include: [userIdOnly('user')],
      },
      {
        model: db.ActivityReportApprover,
        as: 'approvers',
        attributes: ['id', 'status'],
        required: false,
        include: [userIdOnly('user')],
      },
    ],
  });

/** Loads only what CollabReportPolicy#canGet reads. */
const collabReportForPolicy = (id: number) =>
  db.CollabReport.findByPk(id, {
    attributes: REPORT_ATTRIBUTES,
    include: [
      {
        model: db.CollabReportSpecialist,
        as: 'collabReportSpecialists',
        attributes: ['id'],
        required: false,
        include: [userIdOnly('specialist')],
      },
      {
        model: db.CollabReportApprover,
        as: 'approvers',
        attributes: ['id', 'status'],
        required: false,
        include: [userIdOnly('user')],
      },
    ],
  });

/**
 * A user may join a report's room only if they could fetch that report over
 * the HTTP API, so room membership never reveals more than the report does.
 */
export default async function authorizeRoom(user: RealtimeUser, room: string): Promise<boolean> {
  const [prefix, rawId] = room.split('-');
  const id = Number(rawId);

  if (prefix === 'ar') {
    const [report, fullUser] = await Promise.all([
      activityReportForPolicy(id),
      userById(user.userId),
    ]);
    return !!report && !!fullUser && new ActivityReportPolicy(fullUser, report).canGet();
  }

  if (prefix === 'cr') {
    const [report, fullUser] = await Promise.all([
      collabReportForPolicy(id),
      userById(user.userId),
    ]);
    return !!report && !!fullUser && new CollabReportPolicy(fullUser, report).canGet();
  }

  return false;
}
