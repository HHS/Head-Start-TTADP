import { activityReportAndRecipientsById } from '../../services/activityReports';

const CUSTOM_FORMATTERS = {
  ActivityReport: async (instance) => {
    const [
      // eslint-disable-next-line no-unused-vars
      report, activityRecipients, goalsAndObjectives, objectivesWithoutGoals,
    ] = await activityReportAndRecipientsById(instance.id);
    const document = {
      context: report.context,
      startDate: report.startDate,
      endDate: report.endDate,
      recipientNextSteps: report.recipientNextSteps.map((r) => r.note),
      specialistNextSteps: report.specialistNextSteps.map((s) => s.note),
      // activityReportGoals: goalsAndObjectives.map((arg) => arg.name),
      // activityReportObjectives: goalsAndObjectives.map((aro) => aro.title) ,
      // activityReportObjectivesTTA: arObjectivesSteps.map((aro) => aro.ttaProvided),
    };
    console.log('\n\n\n--- Document: ', document);

    return document;
  },
};

/**
 * @param {Model} instance Sequelize instance to be formatted.
 * @returns {Promise<object>} A JSON document for storage in Elasticsearch.
 */
export default async function formatModelForAwsElasticsearch(instance) {
  const customFormatter = CUSTOM_FORMATTERS[instance.constructor.name];
  if (customFormatter) {
    return customFormatter(instance);
  }

  return instance.toJSON();
}
