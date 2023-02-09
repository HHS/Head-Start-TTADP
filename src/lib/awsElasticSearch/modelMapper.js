/* eslint-disable import/prefer-default-export */

const CUSTOM_FORMATTERS = {
  activityreports: async (data) => {
    const {
      ar,
      recipientNextStepsToIndex,
      specialistNextStepsToIndex,
      goalsToIndex,
      objectivesToIndex,
      objectiveResourceLinks,
    } = data;

    const document = {
      id: ar.id,
      context: ar.context,
      nonECLKCResources: ar.nonECLKCResourcesUsed ? ar.nonECLKCResourcesUsed.map((nr) => nr) : [],
      ECLKCResources: ar.ECLKCResourcesUsed ? ar.ECLKCResourcesUsed.map((er) => er) : [],
      startDate: ar.startDate,
      endDate: ar.endDate,
      recipientNextSteps: recipientNextStepsToIndex.map((r) => r.note),
      specialistNextSteps: specialistNextStepsToIndex.map((s) => s.note),
      activityReportGoals: goalsToIndex.map((arg) => arg.name),
      activityReportObjectives: objectivesToIndex.map((aro) => aro.title),
      activityReportObjectivesTTA: objectivesToIndex.map((aro) => aro.ttaProvided),
      activityReportObjectiveResources: objectiveResourceLinks
        .map((aror) => aror.resource.dataValues.url),
    };

    return document;
  },
};

/**
 * @param {Model} instance Sequelize instance to be formatted.
 * @returns {Promise<object>} A JSON document for storage in Elasticsearch.
 */
const formatModelForAwsElasticsearch = async (indexName, data) => {
  const customFormatter = CUSTOM_FORMATTERS[indexName];
  if (customFormatter) {
    return customFormatter(data);
  }
  return null;
};

export {
  formatModelForAwsElasticsearch,
};
