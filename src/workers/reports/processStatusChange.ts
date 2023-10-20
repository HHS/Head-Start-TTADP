/* TODO: when a report status has changed any fields or constructs that can be
*  processed out of band should be done so.
*/
import { Op } from 'sequelize';
import db from '../../models';
import objectiveFile from '../../models/objectiveFile';
import objectiveTemplateFile from '../../models/objectiveTemplateFile';

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
  Objective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveTopic,
} = db;

interface GoalData {
  goalId:number,
  grantId:number,
  goalTemplateId:number
}

// const createGoalForRecipients = async (
//   goalTemplateId:number,
//   grantIds:number[],
//   goal,
// ):Promise<GoalData[]> => {
//   // collect all recipient goals that already exist
//   const existingRecipientGoals = await Goal.findAll({
//     attributes: [
//       ['id', 'goalId'],
//       'grantId',
//       'goalTemplateId',
//     ],
//     where: {
//       grantIds: { [Op.in]: grantIds },
//       goalTemplateId,
//       // TODO: do we need to chack status
//     },
//   });

//   const grantIdsNeedingGoal = grantIds
//     .filter((grantId) => !existingRecipientGoals.find((erg) => erg.grantId === grantId));

//   if (grantIdsNeedingGoal.length > 0) {
//     await Goal.bulkCreate(grantIdsNeedingGoal.map((grantId) => ({
//       ...goal,
//       grantId,
//     })));

//     return Goal.findAll({
//       attributes: [
//         ['id', 'goalId'],
//         'grantId',
//         'goalTemplateId',
//       ],
//       where: {
//         grantIds: { [Op.in]: grantIds },
//         goalTemplateId,
//         // TODO: do we need to chack status
//       },
//     });
//   }
//   return existingRecipientGoals;
// };

// const createReportGoalsForRecipients = async (
//   reportId:number,
//   goalDatas:GoalData[],
// ) => {
//   // collect all recipient report goals that already exist
//   const existingRecipientReportGoals = await ReportGoal.findAll({
//     attributes: [
//       ['id', 'reportGoalId'],
//       'goalId',
//       // TODO: once ReportGoal links with goalTemplateId
//       // 'reportGoalTemplateId',
//       // 'goalTemplateId',
//     ],
//     where: {
//       reportId,
//       goalId: { [Op.in]: goalDatas.map(({ goalId }) => goalId) },
//       // TODO: once ReportGoal links with goalTemplateId
//       // goalTemplateId: { [Op.in]: goaldatas.map(({ goalTemplateId }) => goalTemplateId) },
//     },
//   });

//   const goalDatasNeedingReportGoal = goalDatas
//     .filter(({ goalId }) => !existingRecipientReportGoals.find((errg) => errg.goalId === goalId));

//   if (goalDatasNeedingReportGoal.length > 0) {
//     await ReportGoal.bulkCreate(goalDatasNeedingReportGoal.map((grantId) => ({
//       ...goal,
//       grantId,
//     })));

//     return ReportGoal.findAll({
//       attributes: [
//         ['id', 'goalId'],
//         'grantId',
//         'goalTemplateId',
//       ],
//       where: {
//         grantIds: { [Op.in]: grantIds },
//         goalTemplateId,
//         // TODO: do we need to chack status
//       },
//     });
//   }
//   return existingRecipientGoals;
// };

// const createObjectivesForRecipients = async (
//   objectiveTemplateId:number,
//   goalIds:number[],
//   objective,
// ):Promise<GoalData[]> => {
//   // collect all recipient goals that already exist
//   const existingRecipientObjectives = await Objective.findAll({
//     attributes: [
//       ['id', 'objective'],
//       'goalId',
//       'objectiveTemplateId',
//     ],
//     where: {
//       goalId: { [Op.in]: goalIds },
//       objectiveTemplateId,
//       // TODO: do we need to chack status
//     },
//   });

//   const goalIdsNeedingObjective = goalIds
//     .filter((goalId) => !existingRecipientObjectives.find((ero) => ero.goalId === goalId));

//   if (goalIdsNeedingObjective.length > 0) {
//     await Objective.bulkCreate(goalIdsNeedingObjective.map((goalId) => ({
//       ...objective,
//       goalId,
//     })));

//     return Objective.findAll({
//       attributes: [
//         ['id', 'objective'],
//         'goalId',
//         'objectiveTemplateId',
//       ],
//       where: {
//         goalId: { [Op.in]: goalIds },
//         objectiveTemplateId,
//         // TODO: do we need to chack status
//       },
//     });
//   }
//   return existingRecipientObjectives;
// };

// const createObjectiveMetaDataForRecipients = async (
//   objectives:{ objectiveId:number, objectiveTemplateId: number}[],
// ) => {
//   const [
//     existingRecipientObjectiveFiles,
//     existingRecipientObjectiveResources,
//     existingRecipientObjectiveTopics,
//     neededReportObjectiveFiles,
//     neededReportObjectiveResources,
//     neededReportObjectiveTopics,
//   ] = await Promise.all([
//     await ObjectiveFile.findAll({
//       attributes: [
//         ['id', 'objectiveFileId'],
//         ['fileId', 'fileId'],
//         ['objectiveId', 'objectiveId'],
//         [null, 'objectiveTemplateId'], // TODO: fix this
//       ],
//       group: [
//         'id',
//         'fileId',
//         'objectiveId',
//         null, // TODO: fix this
//       ],
//       where: { objectiveId: { [Op.in]: objectiveIds } },
//       include: [{
//         model: Objective,
//         as: 'objective',
//         required: true,
//         atttributes: [],
//       }],
//     }),
//     await ObjectiveResource.findAll({
//       attributes: [
//         ['id', 'objectiveFileId'],
//         ['resourceId', 'resourceId'],
//         ['objectiveId', 'objectiveId'],
//         [null, 'objectiveTemplateId'], // TODO: fix this
//       ],
//       group: [
//         'id',
//         'resourceId',
//         'objectiveId',
//         null, // TODO: fix this
//       ],
//       where: { objectiveId: { [Op.in]: objectiveIds } },
//       include: [{
//         model: Objective,
//         as: 'objective',
//         required: true,
//         atttributes: [],
//       }],
//     }),
//     await ObjectiveTopic.findAll({
//       attributes: [
//         ['id', 'objectiveFileId'],
//         ['topicId', 'topicId'],
//         ['objectiveId', 'objectiveId'],
//         [null, 'objectiveTemplateId'], // TODO: fix this
//       ],
//       group: [
//         'id',
//         'topicId',
//         'objectiveId',
//         null, // TODO: fix this
//       ],
//       where: { objectiveId: { [Op.in]: objectiveIds } },
//       include: [{
//         model: Objective,
//         as: 'objective',
//         required: true,
//         atttributes: [],
//       }],
//     }),
//     await ReportObjectiveTemplateFile.findAll({

//       include: [{
//         model: ReportObjectiveTemplate,
//         as: 'reportObjectiveTemplate',
//         required: true,
//         attributes: [],
//         include: [{
//           model: ReportObjective,
//           as: 'reportObjectives',
//           required: true,
//           attributes: [],
//           where: { objectiveId: { [Op.in]: objectiveIds } },
//         }],
//       }],
//     }),
//     await ReportObjectiveTemplateResource.findAll({

//       include: [{
//         model: ReportObjectiveTemplate,
//         as: 'reportObjectiveTemplate',
//         required: true,
//         attributes: [],
//         include: [{
//           model: ReportObjective,
//           as: 'reportObjectives',
//           required: true,
//           attributes: [],
//           where: { objectiveId: { [Op.in]: objectiveIds } },
//         }],
//       }],
//     }),
//     await ReportObjectiveTemplateTopic.findAll({

//       include: [{
//         model: ReportObjectiveTemplate,
//         as: 'reportObjectiveTemplate',
//         required: true,
//         attributes: [],
//         include: [{
//           model: ReportObjective,
//           as: 'reportObjectives',
//           required: true,
//           attributes: [],
//           where: { objectiveId: { [Op.in]: objectiveIds } },
//         }],
//       }],
//     }),
//   ]);

//   const objectiveIdsNeedingFileIds = objectives
//     .flatMap(({ objectiveId, objectiveTemplateId }) => neededReportObjectiveFiles
//       .filter((nrof) => nrof.objectiveTemplateId === objectiveTemplateId)
//       .map((nrof) => ({ objectiveId, objectiveTemplateId, ...nrof })))
//     .filter((nrof) => !existingRecipientObjectiveFiles.find((erof) => nrof.objectiveId === erof.objectiveId
//       && nrof.fileId === erof.fileId));
// };

// // propogate generation of all goals and objectives to all recipients on report
// // as part of reaching the sucessful termination status

// const propogateToAllRecipients = async (reportId: number) => {
//   const [
//     recipients,
//     objectiveTemplates,
//   ] = await Promise.all([
//     ReportRecipient.findAll({
//       attributes: ['grantId', 'otherEntityId'],
//       where: { reportId },
//     }),
//     ReportObjectiveTemplate.findAll({
//       where: { reportId },
//       include: [
//         {
//           model: ReportGoalTemplate,
//           as: 'reportGoalTemplate',
//           include: [{

//           }],
//         },
//         {
//           model: ObjectiveTemplate,
//           as: 'objectiveTemplate',
//         },
//       ],
//     }),
//   ]);

//   const recipientGoals = objectiveTemplates
//     .map(async ({ reportGoalTemplate }) => createGoalForRecipients(
//       reportGoalTemplate.goalTemplateId,
//       recipients.map(({ grantId }) => grantId),
//       null, // TODO: build object with all the fields for a goal based on the template
//     ));

//   const recipientReportGoals = await createReportGoalsForRecipients(reportId, recipientGoals);

//   // TODO: create all the objectives

//   // TODO: create all the report objectives

//   // TODO: create all the metadata for goals and objectives
// };
