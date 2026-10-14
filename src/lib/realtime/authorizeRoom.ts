import ActivityReportPolicy from '../../policies/activityReport';
import CollabReportPolicy from '../../policies/collabReport';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { collabReportById } from '../../services/collabReports';
import { userById } from '../../services/users';
import type { RealtimeUser } from '.';

/**
 * A user may join a report's room only if they could fetch that report over
 * the HTTP API, so room membership never reveals more than the report does.
 */
export default async function authorizeRoom(user: RealtimeUser, room: string): Promise<boolean> {
  const [prefix, id] = room.split('-');

  if (prefix === 'ar') {
    const [[report], fullUser] = await Promise.all([
      activityReportAndRecipientsById(id),
      userById(user.userId),
    ]);
    return !!report && !!fullUser && new ActivityReportPolicy(fullUser, report).canGet();
  }

  if (prefix === 'cr') {
    const [report, fullUser] = await Promise.all([collabReportById(id), userById(user.userId)]);
    return !!report && !!fullUser && new CollabReportPolicy(fullUser, report).canGet();
  }

  return false;
}
