import { ActivityReportObjective } from '../models';
import ActivityReportPolicy from '../policies/activityReport';
import CommunicationLogPolicy from '../policies/communicationLog';
import EventPolicy from '../policies/event';
import { activityReportAndRecipientsById } from './activityReports';
import { logById, regionIdFromRecipients } from './communicationLog';
import { findEventBySmartsheetId } from './event';
import userCanDownloadFile from './fileAccess';
import { findSessionById } from './sessionReports';

jest.mock('../models', () => ({ ActivityReportObjective: { findOne: jest.fn() } }));
jest.mock('../policies/activityReport');
jest.mock('../policies/communicationLog');
jest.mock('../policies/event');
jest.mock('./activityReports', () => ({ activityReportAndRecipientsById: jest.fn() }));
jest.mock('./communicationLog', () => ({
  logById: jest.fn(),
  regionIdFromRecipients: jest.fn(),
}));
jest.mock('./event', () => ({ findEventBySmartsheetId: jest.fn() }));
jest.mock('./sessionReports', () => ({ findSessionById: jest.fn() }));

const user = { id: 1 };

describe('userCanDownloadFile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (activityReportAndRecipientsById as jest.Mock).mockResolvedValue([{ id: 5, regionId: 1 }]);
    (findSessionById as jest.Mock).mockResolvedValue({ id: 9, eventId: 'E-1' });
    (findEventBySmartsheetId as jest.Mock).mockResolvedValue({ id: 3, regionId: 1 });
    (logById as jest.Mock).mockResolvedValue({ id: 4, data: { regionId: 2 }, recipients: [] });
  });

  const reportPolicy = (canGet: boolean) =>
    (ActivityReportPolicy as unknown as jest.Mock).mockImplementation(() => ({
      canGet: () => canGet,
    }));
  const eventPolicy = (canRead: boolean) =>
    (EventPolicy as unknown as jest.Mock).mockImplementation(() => ({ canRead: () => canRead }));
  const logPolicy = (canReadLog: boolean) =>
    (CommunicationLogPolicy as unknown as jest.Mock).mockImplementation(() => ({
      canReadLog: () => canReadLog,
    }));

  it('denies a file attached to nothing', async () => {
    expect(await userCanDownloadFile(user, {})).toBe(false);
  });

  it('allows a report file when the user can get the report', async () => {
    reportPolicy(true);
    expect(await userCanDownloadFile(user, { reportFiles: [{ activityReportId: 5 }] })).toBe(true);
  });

  it('denies a report file when the user cannot get the report', async () => {
    reportPolicy(false);
    expect(await userCanDownloadFile(user, { reportFiles: [{ activityReportId: 5 }] })).toBe(false);
  });

  it('denies when the report no longer exists', async () => {
    (activityReportAndRecipientsById as jest.Mock).mockResolvedValue([]);
    expect(await userCanDownloadFile(user, { reportFiles: [{ activityReportId: 5 }] })).toBe(false);
  });

  it('checks the report that owns an objective file', async () => {
    (ActivityReportObjective.findOne as jest.Mock).mockResolvedValue({ activityReportId: 5 });
    reportPolicy(true);

    const allowed = await userCanDownloadFile(user, {
      reportObjectiveFiles: [{ activityReportObjectiveId: 11 }],
    });

    expect(allowed).toBe(true);
    expect(activityReportAndRecipientsById).toHaveBeenCalledWith(5);
  });

  it('denies an objective file whose objective is gone', async () => {
    (ActivityReportObjective.findOne as jest.Mock).mockResolvedValue(null);
    expect(
      await userCanDownloadFile(user, { reportObjectiveFiles: [{ activityReportObjectiveId: 11 }] })
    ).toBe(false);
  });

  it.each(['sessionFiles', 'supportingAttachments'])(
    'allows a %s file when the user can read the event',
    async (association) => {
      eventPolicy(true);
      expect(
        await userCanDownloadFile(user, { [association]: [{ sessionReportPilotId: 9 }] })
      ).toBe(true);
      expect(findEventBySmartsheetId).toHaveBeenCalledWith('E-1');
    }
  );

  it('denies a session file when the user cannot read the event', async () => {
    eventPolicy(false);
    expect(await userCanDownloadFile(user, { sessionFiles: [{ sessionReportPilotId: 9 }] })).toBe(
      false
    );
  });

  it('denies a session file when the session or event is missing', async () => {
    (findSessionById as jest.Mock).mockResolvedValue(null);
    expect(await userCanDownloadFile(user, { sessionFiles: [{ sessionReportPilotId: 9 }] })).toBe(
      false
    );

    (findSessionById as jest.Mock).mockResolvedValue({ id: 9, eventId: 'E-1' });
    (findEventBySmartsheetId as jest.Mock).mockResolvedValue(null);
    expect(await userCanDownloadFile(user, { sessionFiles: [{ sessionReportPilotId: 9 }] })).toBe(
      false
    );
  });

  it("uses the log's own region for a communication log file", async () => {
    logPolicy(true);
    const allowed = await userCanDownloadFile(user, {
      communicationLogFiles: [{ communicationLogId: 4 }],
    });
    expect(allowed).toBe(true);
    expect(CommunicationLogPolicy).toHaveBeenCalledWith(user, 2, expect.anything());
  });

  it("falls back to the recipients' region, then to none, for a log without a region", async () => {
    logPolicy(false);
    (logById as jest.Mock).mockResolvedValue({ id: 4, data: {}, recipients: [{ id: 8 }] });
    (regionIdFromRecipients as jest.Mock).mockResolvedValue(6);

    await userCanDownloadFile(user, { communicationLogFiles: [{ communicationLogId: 4 }] });
    expect(regionIdFromRecipients).toHaveBeenCalledWith([8]);
    expect(CommunicationLogPolicy).toHaveBeenCalledWith(user, 6, expect.anything());

    (regionIdFromRecipients as jest.Mock).mockResolvedValue(null);
    await userCanDownloadFile(user, { communicationLogFiles: [{ communicationLogId: 4 }] });
    expect(CommunicationLogPolicy).toHaveBeenLastCalledWith(user, 0, expect.anything());
  });

  it('denies a communication log file when the log is missing', async () => {
    (logById as jest.Mock).mockResolvedValue(null);
    expect(
      await userCanDownloadFile(user, { communicationLogFiles: [{ communicationLogId: 4 }] })
    ).toBe(false);
  });

  it('allows when any one parent allows, even if another denies', async () => {
    reportPolicy(false);
    eventPolicy(true);
    const allowed = await userCanDownloadFile(user, {
      reportFiles: [{ activityReportId: 5 }],
      sessionFiles: [{ sessionReportPilotId: 9 }],
    });
    expect(allowed).toBe(true);
  });
});
