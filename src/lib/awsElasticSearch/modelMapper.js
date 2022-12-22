/* eslint-disable import/prefer-default-export */
import moment from 'moment';

const CUSTOM_FORMATTERS = {
  ActivityReport: async (instance) => {
    const document = {
      id: instance.id,
      context: instance.context,
      startDate: moment(instance.startDate).toISOString(),
      endDate: moment(instance.endDate).toISOString(),
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
