import { REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../../middleware/scopeConstants';
import db from '../../models';
import { createReport, createUser, destroyReport, getUniqueId } from '../../testUtils';
import authorizeRoom from './authorizeRoom';

const {
  ActivityReportApprover,
  ActivityReportCollaborator,
  CollabReport,
  CollabReportApprover,
  CollabReportSpecialist,
  Permission,
  User,
} = db;

// Runs against the database so the trimmed policy queries are checked against
// the real associations, not just mocks.
describe('authorizeRoom', () => {
  const REGION = 1;
  let author;
  let collaborator;
  let approver;
  let regionalReader;
  let outsider;
  let draftReport;
  let approvedReport;
  let collabReport;

  const asRealtimeUser = (user) => ({ userId: user.id, username: user.name });

  beforeAll(async () => {
    [author, collaborator, approver, regionalReader, outsider] = await Promise.all(
      Array.from({ length: 5 }, () => createUser({ homeRegionId: REGION }))
    );
    await Permission.create({
      userId: regionalReader.id,
      regionId: REGION,
      scopeId: SCOPES.READ_REPORTS,
    });

    const activityRecipients = [{ grantId: getUniqueId() }];
    [draftReport, approvedReport] = await Promise.all([
      createReport({
        activityRecipients,
        userId: author.id,
        regionId: REGION,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        submissionStatus: REPORT_STATUSES.DRAFT,
      }),
      createReport({
        activityRecipients: [{ grantId: getUniqueId() }],
        userId: author.id,
        regionId: REGION,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      }),
    ]);
    await Promise.all([
      ActivityReportCollaborator.create({
        activityReportId: draftReport.id,
        userId: collaborator.id,
      }),
      ActivityReportApprover.create({ activityReportId: draftReport.id, userId: approver.id }),
    ]);

    collabReport = await CollabReport.create({
      name: 'Realtime room test',
      regionId: REGION,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      duration: 1,
      userId: author.id,
      conductMethod: 'email',
      isStateActivity: false,
      description: 'Realtime room test',
      submissionStatus: REPORT_STATUSES.DRAFT,
    });
    await Promise.all([
      CollabReportSpecialist.create({
        collabReportId: collabReport.id,
        specialistId: collaborator.id,
      }),
      CollabReportApprover.create({ collabReportId: collabReport.id, userId: approver.id }),
    ]);
  });

  afterAll(async () => {
    // collab report first: destroyReport also removes the author once they have no reports
    await CollabReportSpecialist.destroy({
      where: { collabReportId: collabReport.id },
      force: true,
    });
    await CollabReportApprover.destroy({
      where: { collabReportId: collabReport.id },
      force: true,
    });
    await CollabReport.destroy({ where: { id: collabReport.id }, force: true });
    await ActivityReportCollaborator.destroy({ where: { activityReportId: draftReport.id } });
    await ActivityReportApprover.destroy({
      where: { activityReportId: draftReport.id },
      force: true,
    });
    await destroyReport(draftReport);
    await destroyReport(approvedReport);
    await Permission.destroy({ where: { userId: regionalReader.id } });
    await User.destroy({
      where: { id: [author, collaborator, approver, regionalReader, outsider].map((u) => u.id) },
    });
  });

  it('lets the author, collaborators, and approvers into a draft activity report room', async () => {
    const room = `ar-${draftReport.id}`;

    expect(await authorizeRoom(asRealtimeUser(author), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(collaborator), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(approver), room)).toBe(true);
  });

  it('keeps everyone else out of a draft activity report room', async () => {
    const room = `ar-${draftReport.id}`;

    expect(await authorizeRoom(asRealtimeUser(regionalReader), room)).toBe(false);
    expect(await authorizeRoom(asRealtimeUser(outsider), room)).toBe(false);
  });

  it('lets regional readers into an approved activity report room', async () => {
    const room = `ar-${approvedReport.id}`;

    expect(await authorizeRoom(asRealtimeUser(regionalReader), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(outsider), room)).toBe(false);
  });

  it('applies the collaboration report policy to collaboration report rooms', async () => {
    const room = `cr-${collabReport.id}`;

    expect(await authorizeRoom(asRealtimeUser(author), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(collaborator), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(approver), room)).toBe(true);
    expect(await authorizeRoom(asRealtimeUser(outsider), room)).toBe(false);
  });

  it('denies rooms for reports that do not exist', async () => {
    expect(await authorizeRoom(asRealtimeUser(author), 'ar-999999999')).toBe(false);
    expect(await authorizeRoom(asRealtimeUser(author), 'cr-999999999')).toBe(false);
  });

  it('denies unknown room types', async () => {
    expect(await authorizeRoom(asRealtimeUser(author), `tr-${draftReport.id}`)).toBe(false);
  });
});
