/* eslint-disable import/prefer-default-export */

const spaceUrl = (url) => {
  if (url && url.length) {
    let returnExplodedUrl = url.replace(/\./g, ' ').replace('http://', '').replace('https://', '').replace('/', '');
    returnExplodedUrl = returnExplodedUrl.replace('http://', '').replace('https://', '');
    return returnExplodedUrl;
  }
  return '';
};

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
      startDate: ar.startDate,
      endDate: ar.endDate,
      recipientNextSteps: recipientNextStepsToIndex.map((r) => r.note),
      specialistNextSteps: specialistNextStepsToIndex.map((s) => s.note),
      activityReportGoals: goalsToIndex.map((arg) => arg.name),
      activityReportObjectives: objectivesToIndex.map((aro) => aro.title),
      activityReportObjectivesTTA: objectivesToIndex.map((aro) => aro.ttaProvided),
      activityReportObjectiveResources: objectiveResourceLinks.map((aror) => aror.userProvidedUrl),
      activityReportObjectiveResourcesSpaced: objectiveResourceLinks.map(
        (aror) => spaceUrl(aror.userProvidedUrl), // Add a spaced copy of the url.
      ),
    };
    // await Promise.all(document);
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
