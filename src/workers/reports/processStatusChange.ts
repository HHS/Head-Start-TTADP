/* TODO: when a report status has changed any fields or constructs that can be
*  processed out of band should be done so.
*/
import { Op } from 'sequelize';
import db from '../../models';

const {
  ReportRecipient,
  Grant,
  Recipient,
  OtherEntity,
  ReportGoalTemplate,
  GoalTemplate,
  ReportGoal,
  Goal,
  ReportObjectiveTemplate,
  ObjectiveTemplate,
} = db;

interface GoalData {
  goalId:number,
  grantId:number,
  goalTemplateId:number
}

const createGoalForRecipients = async (
  goalTemplateId:number,
  grantIds:number[],
  goal,
):Promise<GoalData[]> => {
  // collect all recipient goals that already exist
  const existingRecipientGoals = await Goal.findAll({
    attributes: [
      ['id', 'goalId'],
      'grantId',
      'goalTemplateId',
    ],
    where: {
      grantIds: { [Op.in]: grantIds },
      goalTemplateId,
      // TODO: do we need to chack status
    },
  });

  const grantIdsNeedingGoal = grantIds
    .filter((grantId) => !existingRecipientGoals.find((erg) => erg.grantId === grantId));

  if (grantIdsNeedingGoal.length > 0) {
    await Goal.bulkCreate(grantIdsNeedingGoal.map((grantId) => ({
      ...goal,
      grantId,
    })));

    return Goal.findAll({
      attributes: [
        ['id', 'goalId'],
        'grantId',
        'goalTemplateId',
      ],
      where: {
        grantIds: { [Op.in]: grantIds },
        goalTemplateId,
        // TODO: do we need to chack status
      },
    });
  }
  return existingRecipientGoals;
};

const createReportGoalsForRecipients = async (
  reportId:number,
  goalDatas:GoalData[],
) => {
  // collect all recipient report goals that already exist
  const existingRecipientReportGoals = await ReportGoal.findAll({
    attributes: [
      ['id', 'reportGoalId'],
      'goalId',
      // TODO: once ReportGoal links with goalTemplateId
      // 'reportGoalTemplateId',
      // 'goalTemplateId',
    ],
    where: {
      reportId,
      goalId: { [Op.in]: goalDatas.map(({ goalId }) => goalId) },
      // TODO: once ReportGoal links with goalTemplateId
      // goalTemplateId: { [Op.in]: goaldatas.map(({ goalTemplateId }) => goalTemplateId) },
    },
  });

  const goalDatasNeedingReportGoal = goalDatas
    .filter(({ goalId }) => !existingRecipientReportGoals.find((errg) => errg.goalId === goalId));

  if (goalDatasNeedingReportGoal.length > 0) {
    await Goal.bulkCreate(goalDatasNeedingReportGoal.map((grantId) => ({
      ...goal,
      grantId,
    })));

    return Goal.findAll({
      attributes: [
        ['id', 'goalId'],
        'grantId',
        'goalTemplateId',
      ],
      where: {
        grantIds: { [Op.in]: grantIds },
        goalTemplateId,
        // TODO: do we need to chack status
      },
    });
  }
  return existingRecipientGoals;
};

// propogate generation of all goals and objectives to all recipients on report
// as part of reaching the sucessful termination status

const propogateToAllRecipients = async (reportId: number) => {
  const [
    recipients,
    objectiveTemplates,
  ] = await Promise.all([
    ReportRecipient.findAll({
      attributes: ['grantId', 'otherEntityId'],
      where: { reportId },
    }),
    ReportObjectiveTemplate.findAll({
      where: { reportId },
      include: [
        {
          model: ReportGoalTemplate,
          as: 'reportGoalTemplate',
          include: [{

          }],
        },
        {
          model: ObjectiveTemplate,
          as: 'objectiveTemplate',
        },
      ],
    }),
  ]);

  const recipientGoals = objectiveTemplates
    .map(async ({ reportGoalTemplate }) => createGoalForRecipients(
      reportGoalTemplate.goalTemplateId,
      recipients.map(({ grantId }) => grantId),
      null, // TODO: build object with all the fields for a goal based on the template
    ));

  const recipientReportGoals = await createReportGoalsForRecipients(reportId, recipientGoals);

  // TODO: create all the objectives

  // TODO: create all the report objectives

  // TODO: create all the metadata for goals and objectives
};
