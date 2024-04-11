import db, {
  Grant,
  ActivityReportApprover,
  ActivityReportCollaborator,
  User,
} from '../../models';
import {
  createReport, createGrant, createUser, destroyReport,
} from '../../testUtils';
import { updateLegacyReportUsers } from './legacyReports';

describe('LegacyReports, admin routes', () => {
  describe('updateLegacyReportUsers', () => {
    let grant;
    let report;
    let user;
    let userTwo;

    beforeAll(async () => {
      user = await createUser();
      userTwo = await createUser();
      grant = await createGrant();
      report = await createReport({
        userId: user.id,
        activityRecipients: [{ grantId: grant.id }],
        imported: {},
      });

      await report.update({ userId: null });
    });

    afterAll(async () => {
      await ActivityReportApprover.destroy({
        where: {
          activityReportId: report.id,
        },
        force: true,
      });
      await ActivityReportCollaborator.destroy({
        where: {
          activityReportId: report.id,
        },
      });
      await destroyReport(report);
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await User.destroy({ where: { id: [user.id, userTwo.id] } });
      await db.sequelize.close();
    });

    afterEach(() => jest.clearAllMocks());

    it('updates legacy report users', async () => {
      const requestOne = {
        params: {
          reportId: report.id,
        },
        body: {
          createdBy: user.email,
          modifiedBy: '',
          manager: '',
        },
      };

      const mockResponse = {
        attachment: jest.fn(),
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({
          end: jest.fn(),
          json: jest.fn(),
        })),
      };

      await updateLegacyReportUsers(requestOne, mockResponse);

      const updatedReport = await db.ActivityReport.findByPk(report.id);
      expect(updatedReport.userId).toEqual(user.id);

      const requestTwo = {
        params: {
          reportId: report.id,
        },
        body: {
          createdBy: user.email,
          modifiedBy: user.email,
          manager: '',
        },
      };

      await updateLegacyReportUsers(requestTwo, mockResponse);

      const secondUpdatedReport = await db.ActivityReport.findOne({
        where: { id: report.id },
        include: [
          {
            model: ActivityReportCollaborator,
            as: 'activityReportCollaborators',
          },
        ],
      });
      expect(secondUpdatedReport.activityReportCollaborators).toHaveLength(1);
      expect(secondUpdatedReport.activityReportCollaborators[0].userId).toEqual(user.id);

      const requestThree = {
        params: {
          reportId: report.id,
        },
        body: {
          createdBy: user.email,
          modifiedBy: user.email,
          manager: `${user.email}; ${userTwo.email}`,
        },
      };

      await updateLegacyReportUsers(requestThree, mockResponse);

      const thirdUpdatedReport = await db.ActivityReport.findOne({
        where: { id: report.id },
        include: [
          {
            model: ActivityReportApprover,
            as: 'approvers',
          },
        ],
      });
      expect(thirdUpdatedReport.approvers).toHaveLength(2);
      const approverIds = thirdUpdatedReport.approvers.map((a) => a.userId);
      expect(approverIds).toContain(user.id);
      expect(approverIds).toContain(userTwo.id);
    });
  });
});
