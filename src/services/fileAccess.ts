import parsePositiveInteger from '../lib/parsePositiveInteger';
import { ActivityReportObjective } from '../models';
import ActivityReportPolicy from '../policies/activityReport';
import CommunicationLogPolicy from '../policies/communicationLog';
import EventPolicy from '../policies/event';
import { activityReportAndRecipientsById } from './activityReports';
import { logById, regionIdFromRecipients } from './communicationLog';
import { findEventBySmartsheetId } from './event';
import { findSessionById } from './sessionReports';

// The associations a File is loaded with by getFileById (src/services/files.js).
interface FileWithParents {
  reportFiles?: { activityReportId: number }[];
  reportObjectiveFiles?: { activityReportObjectiveId: number }[];
  sessionFiles?: { sessionReportPilotId: number }[];
  supportingAttachments?: { sessionReportPilotId: number }[];
  communicationLogFiles?: { communicationLogId: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type User = any;

const canReadReport = async (user: User, reportId: number): Promise<boolean> => {
  const [report] = await activityReportAndRecipientsById(reportId);
  return !!report && new ActivityReportPolicy(user, report).canGet();
};

const canReadReportObjective = async (user: User, objectiveId: number): Promise<boolean> => {
  const objective = await ActivityReportObjective.findOne({
    attributes: ['activityReportId'],
    where: { id: objectiveId },
  });
  return !!objective && canReadReport(user, objective.activityReportId);
};

const canReadSession = async (user: User, sessionId: number): Promise<boolean> => {
  const session = await findSessionById(sessionId);
  if (!session) return false;
  const event = await findEventBySmartsheetId(session.eventId);
  return !!event && new EventPolicy(user, event).canRead();
};

const canReadCommunicationLog = async (user: User, logId: number): Promise<boolean> => {
  const log = await logById(logId);
  if (!log) return false;

  // The log's own region decides who can read it. Logs saved without a region use their
  // recipients' region when it is unambiguous; otherwise only administrators can read the log.
  const regionId =
    parsePositiveInteger(log.data?.regionId) ??
    (await regionIdFromRecipients((log.recipients ?? []).map(({ id }) => id)));
  return new CommunicationLogPolicy(user, regionId ?? 0, log).canReadLog();
};

/**
 * Whether the user may download the file: they can read at least one record the file is
 * attached to. A file attached to nothing, or only to an import, is not downloadable here.
 * Expects a File loaded by getFileById.
 */
export default async function userCanDownloadFile(
  user: User,
  file: FileWithParents
): Promise<boolean> {
  const checks: (() => Promise<boolean>)[] = [
    ...(file.reportFiles ?? []).map(
      ({ activityReportId }) =>
        () =>
          canReadReport(user, activityReportId)
    ),
    ...(file.reportObjectiveFiles ?? []).map(
      ({ activityReportObjectiveId }) =>
        () =>
          canReadReportObjective(user, activityReportObjectiveId)
    ),
    ...[...(file.sessionFiles ?? []), ...(file.supportingAttachments ?? [])].map(
      ({ sessionReportPilotId }) =>
        () =>
          canReadSession(user, sessionReportPilotId)
    ),
    ...(file.communicationLogFiles ?? []).map(
      ({ communicationLogId }) =>
        () =>
          canReadCommunicationLog(user, communicationLogId)
    ),
  ];

  // In order, stopping at the first parent that allows it.
  for (const check of checks) {
    // eslint-disable-next-line no-await-in-loop
    if (await check()) return true;
  }
  return false;
}
