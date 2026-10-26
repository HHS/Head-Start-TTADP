import { REPORT_STATUSES } from '@ttahub/common';
import { GOAL_COLLABORATORS, OBJECTIVE_COLLABORATORS } from '../../constants';
import { createGrant, createRecipient, createReport, createUser } from '../../testUtils';
import db from '..';

const {
  sequelize,
  ActivityRecipient,
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportObjective,
  CollaboratorType,
  Goal,
  GoalCollaborator,
  GoalCollaboratorActivityReport,
  Grant,
  Objective,
  ObjectiveCollaborator,
  ObjectiveCollaboratorActivityReport,
  Recipient,
  User,
} = db;

// Maps each active Utilizer's userId to the sorted ids of the reports it is linked to.
const utilizerLinks = async ({ model, linkModel, idName, linkIdName, entityId, typeName }) => {
  const utilizers = await model.findAll({
    where: { [idName]: entityId },
    include: [
      {
        model: CollaboratorType,
        as: 'collaboratorType',
        required: true,
        where: { name: typeName },
      },
    ],
  });
  const entries = await Promise.all(
    utilizers.map(async (utilizer) => {
      const links = await linkModel.findAll({ where: { [linkIdName]: utilizer.id } });
      return [utilizer.userId, links.map((l) => l.activityReportId).sort((a, b) => a - b)];
    })
  );
  return Object.fromEntries(entries);
};

describe('Utilizer collaborators follow report approval', () => {
  let author;
  let reportCollaborator;
  let recipient;
  let grant;
  let goal;
  let objective;
  let reportA;
  let reportB;

  const goalUtilizers = () =>
    utilizerLinks({
      model: GoalCollaborator,
      linkModel: GoalCollaboratorActivityReport,
      idName: 'goalId',
      linkIdName: 'goalCollaboratorId',
      entityId: goal.id,
      typeName: GOAL_COLLABORATORS.UTILIZER,
    });
  const objectiveUtilizers = () =>
    utilizerLinks({
      model: ObjectiveCollaborator,
      linkModel: ObjectiveCollaboratorActivityReport,
      idName: 'objectiveId',
      linkIdName: 'objectiveCollaboratorId',
      entityId: objective.id,
      typeName: OBJECTIVE_COLLABORATORS.UTILIZER,
    });
  const setStatus = async (report, calculatedStatus) => {
    const fresh = await ActivityReport.findByPk(report.id);
    await fresh.update({ calculatedStatus });
  };

  beforeAll(async () => {
    [author, reportCollaborator] = await Promise.all([createUser(), createUser()]);
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });
    goal = await Goal.create({
      grantId: grant.id,
      name: 'utilizer test goal',
      status: 'In Progress',
    });
    objective = await Objective.create({
      goalId: goal.id,
      title: 'utilizer test objective',
      status: 'In Progress',
    });

    // Submitted (not yet approved), with the fields the approval validation requires.
    const submitted = {
      activityRecipients: [{ grantId: grant.id }],
      userId: author.id,
      regionId: grant.regionId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      creatorRole: 'Grants Specialist',
      activityReason: 'Recipient requested',
      language: ['English'],
    };
    [reportA, reportB] = await Promise.all([createReport(submitted), createReport(submitted)]);

    await Promise.all(
      [reportA, reportB].flatMap((report) => [
        ActivityReportGoal.create({ activityReportId: report.id, goalId: goal.id }),
        ActivityReportObjective.create({ activityReportId: report.id, objectiveId: objective.id }),
      ])
    );
    // Only report A has a collaborator besides its author.
    await ActivityReportCollaborator.create({
      activityReportId: reportA.id,
      userId: reportCollaborator.id,
    });
  });

  afterAll(async () => {
    const reportIds = [reportA.id, reportB.id];
    await GoalCollaborator.destroy({ where: { goalId: goal.id }, force: true });
    await ObjectiveCollaborator.destroy({ where: { objectiveId: objective.id }, force: true });
    await ActivityReportCollaborator.destroy({ where: { activityReportId: reportIds } });
    await ActivityReportObjective.destroy({
      where: { activityReportId: reportIds },
      individualHooks: false,
      force: true,
    });
    await ActivityReportGoal.destroy({
      where: { activityReportId: reportIds },
      individualHooks: false,
      force: true,
    });
    await ActivityRecipient.destroy({ where: { activityReportId: reportIds } });
    await ActivityReport.destroy({ where: { id: reportIds }, individualHooks: false, force: true });
    await Objective.destroy({ where: { id: objective.id }, individualHooks: false, force: true });
    await Goal.destroy({ where: { id: goal.id }, individualHooks: false, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
    await User.destroy({ where: { id: [author.id, reportCollaborator.id] } });
    await sequelize.close();
  });

  it('approving a report links its author and collaborators as Utilizers of its goals and objectives', async () => {
    await setStatus(reportA, REPORT_STATUSES.APPROVED);

    const expected = {
      [author.id]: [reportA.id],
      [reportCollaborator.id]: [reportA.id],
    };
    expect(await goalUtilizers()).toEqual(expected);
    expect(await objectiveUtilizers()).toEqual(expected);
  });

  it('approving a second report adds a link to the existing Utilizer instead of a new row', async () => {
    await setStatus(reportB, REPORT_STATUSES.APPROVED);

    const expected = {
      [author.id]: [reportA.id, reportB.id].sort((a, b) => a - b),
      [reportCollaborator.id]: [reportA.id],
    };
    expect(await goalUtilizers()).toEqual(expected);
    expect(await objectiveUtilizers()).toEqual(expected);
  });

  it('un-approving a report removes its links, and Utilizers left with no reports', async () => {
    await setStatus(reportA, REPORT_STATUSES.NEEDS_ACTION);

    // The author is still a Utilizer through report B; the collaborator was only on report A.
    const expected = { [author.id]: [reportB.id] };
    expect(await goalUtilizers()).toEqual(expected);
    expect(await objectiveUtilizers()).toEqual(expected);

    const removed = await GoalCollaborator.findOne({
      where: { goalId: goal.id, userId: reportCollaborator.id },
      paranoid: false,
      include: [
        {
          model: CollaboratorType,
          as: 'collaboratorType',
          required: true,
          where: { name: GOAL_COLLABORATORS.UTILIZER },
        },
      ],
    });
    expect(removed.deletedAt).not.toBeNull();
  });
});
