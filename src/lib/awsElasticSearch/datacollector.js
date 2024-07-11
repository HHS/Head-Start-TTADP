/* eslint-disable import/prefer-default-export */
import { AWS_ELASTIC_SEARCH_INDEXES } from '../../constants';

const collectActivityReportData = async (ids, sequelize) => {
  // Recipient Steps.
  const recipientNextStepsToIndex = await sequelize.models.NextStep.findAll({
    attributes: ['activityReportId', 'note'],
    where: {
      noteType: 'RECIPIENT',
      activityReportId: ids,
    },
    group: ['activityReportId', 'note'],
    order: [
      ['activityReportId', 'ASC'],
      ['note', 'ASC'],
    ],
    raw: true,
  });

  // Specialist Steps.
  const specialistNextStepsToIndex = await sequelize.models.NextStep.findAll({
    attributes: ['activityReportId', 'note'],
    where: {
      noteType: 'SPECIALIST',
      activityReportId: ids,
    },
    group: ['activityReportId', 'note'],
    order: [
      ['activityReportId', 'ASC'],
      ['note', 'ASC'],
    ],
    raw: true,
  });
  // Goals.
  const goalsToIndex = await sequelize.models.ActivityReportGoal.findAll({
    attributes: ['activityReportId', 'name'],
    where: {
      activityReportId: ids,
    },
    group: ['activityReportId', 'name'],
    order: [
      ['activityReportId', 'ASC'],
      ['name', 'ASC'],
    ],
    raw: true,
  });
  // Objectives.
  const objectivesToIndex = await sequelize.models.ActivityReportObjective.findAll({
    attributes: ['activityReportId', 'title', 'ttaProvided'],
    where: {
      activityReportId: ids,
    },
    group: ['activityReportId', 'title', 'ttaProvided'],
    order: [
      ['activityReportId', 'ASC'],
      ['title', 'ASC'],
    ],
    raw: true,
  });

  // Objective resource links.
  const objectiveResourceLinks = await sequelize.models.ActivityReportObjectiveResource.findAll({
    include: [
      {
        attributes: ['activityReportId'],
        model: sequelize.models.ActivityReportObjective,
        as: 'activityReportObjective',
        required: true,
        where: { activityReportId: ids },
      },
      {
        attributes: ['url'],
        model: sequelize.models.Resource,
        as: 'resource',
      },
    ],
    attributes: [
      'activityReportObjectiveId',
    ],
    order: [
      ['activityReportObjectiveId', 'ASC'],
      ['resource', 'url', 'ASC'],
    ],
    raw: true,
  });
  return {
    recipientNextStepsToIndex,
    specialistNextStepsToIndex,
    goalsToIndex,
    objectivesToIndex,
    objectiveResourceLinks,
  };
};

const collectModelData = async (ids, indexName, sequelize) => {
  switch (indexName) {
    // Activity Reports.
    case AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS:
      return collectActivityReportData(ids, sequelize);
    default:
      throw new Error(`AWS Elasticsearch: Unable to find index of type "${indexName}".`);
  }
};

export {
  collectModelData,
};
