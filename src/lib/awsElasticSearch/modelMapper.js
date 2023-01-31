/* eslint-disable import/prefer-default-export */

const spaceUrl = (url) => {
  if (url && url.length && (url.includes('http://') || url.includes('https://'))) {
    return url.replace(/\./g, ' ').replace('http://', '').replace('https://', '').replace('/', '');
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
      nonECLKCResources: ar.nonECLKCResourcesUsed.map((nr) => nr),
      nonECLKCResourcesSpaced: ar.nonECLKCResourcesUsed.map((nr) => spaceUrl(nr)),
      ECLKCResources: ar.ECLKCResourcesUsed.map((er) => er),
      ECLKCResourcesSpaced: ar.ECLKCResourcesUsed.map((er) => spaceUrl(er)),
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
