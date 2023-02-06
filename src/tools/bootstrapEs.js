import { addIndexDocument } from '../lib/awsElasticSearch';
import { AWS_ELASTIC_SEARCH_INDEXES } from '../constants';
import reports from '../mocks/approvedReports';

const [report9997, report9998, report9999] = reports;

const documents = [
  {
    ...report9997,
    recipientNextSteps: [],
    specialistNextSteps: [],
    activityReportGoals: [],
    activityReportObjectives: [],
    activityReportObjectivesTTA: [
      'prep instruction',
    ],
    activityReportObjectiveResources: [],
  },
  {
    ...report9998,
    recipientNextSteps: [],
    specialistNextSteps: [
      'you can dream it',
    ],
    activityReportGoals: [
      'cook something tasty',
    ],
    activityReportObjectives: [],
    activityReportObjectivesTTA: [],
    activityReportObjectiveResources: [],
  },
  {
    ...report9999,
    recipientNextSteps: [
      'one small positive thought',
    ],
    specialistNextSteps: [],
    activityReportGoals: [],
    activityReportObjectives: [
      'first meal',
    ],
    activityReportObjectivesTTA: [],
    activityReportObjectiveResources: [],
  },
];

const bootstrapEs = async () => {
  await Promise.all(documents.map(async (document) => {
    const job = {
      data: {
        indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        id: document.id,
        document,
      },
    };
    await addIndexDocument(job);
  }));

  return true;
};

export default bootstrapEs;
