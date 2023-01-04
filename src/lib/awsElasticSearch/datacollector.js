/* eslint-disable import/prefer-default-export */
import { AWS_ELASTIC_SEARCH_INDEXES } from '../../constants';

const collectActivityReportData = async (id, sequelize) => {
  // Recipient Steps.
  const recipientNextStepsToIndex = await sequelize.models.NextStep.findAll({
    attributes: ['activityReportId', 'note'],
    where: {
      noteType: 'RECIPIENT',
      activityReportId: id,
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
      activityReportId: id,
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
      activityReportId: id,
    },
    group: ['activityReportId', 'name'],
    order: [
      ['activityReportId', 'ASC'],
      ['name', 'ASC'],
    ],
    raw: true,
  });
  // objectives.
  const objectivesToIndex = await sequelize.models.ActivityReportObjective.findAll({
    attributes: ['activityReportId', 'title', 'ttaProvided'],
    where: {
      activityReportId: id,
    },
    group: ['activityReportId', 'title', 'ttaProvided'],
    order: [
      ['activityReportId', 'ASC'],
      ['title', 'ASC'],
    ],
    raw: true,
  });

  return {
    recipientNextStepsToIndex,
    specialistNextStepsToIndex,
    goalsToIndex,
    objectivesToIndex,
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
