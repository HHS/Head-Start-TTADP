/* eslint-disable import/prefer-default-export */
const CUSTOM_FORMATTERS = {
  ActivityReport: async (instance) => {
    const document = {
      context: instance.context,
      // startDate: instance.startDate,
      // endDate: instance.endDate,
      // recipientNextSteps: instance.recipientNextSteps.map((r) => r.note),
      // specialistNextSteps: instance.specialistNextSteps.map((s) => s.note),
      // activityReportGoals: goalsAndObjectives.map((arg) => arg.name),
      // activityReportObjectives: goalsAndObjectives.map((aro) => aro.title) ,
      // activityReportObjectivesTTA: arObjectivesSteps.map((aro) => aro.ttaProvided),
    };
    return document;
  },
};

/**
 * @param {Model} instance Sequelize instance to be formatted.
 * @returns {Promise<object>} A JSON document for storage in Elasticsearch.
 */
const formatModelForAwsElasticsearch = async (instance) => {
  const customFormatter = CUSTOM_FORMATTERS[instance.constructor.name];
  if (customFormatter) {
    return customFormatter(instance);
  }

  return null;
};

export {
  formatModelForAwsElasticsearch,
};
