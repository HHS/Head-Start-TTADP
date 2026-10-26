import { REPORT_STATUSES } from '@ttahub/common';
import { GOAL_COLLABORATORS } from '../../../constants';
import db from '../../../models';
import { createGrant, createRecipient, createReport, createUser } from '../../../testUtils';
import { findOrCreateCollaborator } from '../genericCollaborator';

const {
  sequelize,
  ActivityReport,
  Goal,
  GoalCollaborator,
  GoalCollaboratorActivityReport,
  Grant,
  Recipient,
  User,
} = db;

describe('findOrCreateCollaborator concurrency', () => {
  let recipient;
  let grant;
  let goal;
  let user;
  let reportIds;

  beforeAll(async () => {
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });
    goal = await Goal.create({ grantId: grant.id, name: 'concurrency test goal' });
    user = await createUser();
    // Collaborator links reference real reports.
    const reports = await Promise.all(
      [1, 2].map(() =>
        createReport({
          activityRecipients: [],
          userId: user.id,
          regionId: grant.regionId,
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
        })
      )
    );
    reportIds = reports.map((report) => report.id);
  });

  afterAll(async () => {
    await GoalCollaborator.destroy({
      where: { goalId: goal.id },
      individualHooks: false,
      force: true,
    });
    await Goal.destroy({ where: { id: goal.id }, individualHooks: false, force: true });
    await ActivityReport.destroy({ where: { id: reportIds }, individualHooks: false, force: true });
    await User.destroy({ where: { id: user.id } });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
    await sequelize.close();
  });

  afterEach(async () => {
    await GoalCollaborator.destroy({
      where: { goalId: goal.id },
      individualHooks: false,
      force: true,
    });
  });

  it('creates exactly one row and links both reports when two requests race', async () => {
    const [reportIdA, reportIdB] = reportIds;

    const [resultA, resultB] = await Promise.all([
      findOrCreateCollaborator(
        'goal',
        sequelize,
        null,
        goal.id,
        user.id,
        GOAL_COLLABORATORS.LINKER,
        { activityReportIds: [reportIdA] }
      ),
      findOrCreateCollaborator(
        'goal',
        sequelize,
        null,
        goal.id,
        user.id,
        GOAL_COLLABORATORS.LINKER,
        { activityReportIds: [reportIdB] }
      ),
    ]);

    const rows = await GoalCollaborator.findAll({
      where: { goalId: goal.id, userId: user.id },
    });

    expect(rows.length).toBe(1);
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    // Neither concurrent call should have lost the other's report link.
    const links = await GoalCollaboratorActivityReport.findAll({
      where: { goalCollaboratorId: rows[0].id },
    });
    expect(links.map((link) => link.activityReportId).sort((a, b) => a - b)).toEqual(
      [reportIdA, reportIdB].sort((a, b) => a - b)
    );
  });

  it('joins the caller-provided transaction instead of opening its own', async () => {
    const [reportId] = reportIds;

    const where = { goalId: goal.id, userId: user.id };

    await sequelize.transaction(async (transaction) => {
      const transactionSpy = jest.spyOn(sequelize, 'transaction');
      try {
        await findOrCreateCollaborator(
          'goal',
          sequelize,
          transaction,
          goal.id,
          user.id,
          GOAL_COLLABORATORS.LINKER,
          { activityReportIds: [reportId] }
        );
        expect(transactionSpy).not.toHaveBeenCalled();
      } finally {
        transactionSpy.mockRestore();
      }

      // Written on the caller's transaction: visible inside it, not yet to anyone else.
      expect(await GoalCollaborator.count({ where, transaction })).toBe(1);
      const outside = await sequelize.transaction((other) =>
        GoalCollaborator.count({ where, transaction: other })
      );
      expect(outside).toBe(0);
    });

    expect(await GoalCollaborator.count({ where })).toBe(1);
  });
});
