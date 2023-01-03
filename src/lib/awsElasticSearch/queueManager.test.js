import { awsElasticsearchQueue, scheduleAddIndexDocumentJob } from './queueManager';
import { REPORT_STATUSES, AWS_ELASTIC_SEARCH_INDEXES } from '../../constants';

import db, {
  ActivityReport,
  User,
} from '../../models';

const mockUser = {
  id: 7194161,
  homeRegionId: 1,
  name: 'user2184932161',
  hsesUsername: 'user2184932161',
  hsesUserId: 'user2184932161',
  role: ['Grants Specialist', 'Health Specialist'],
};

const reportObject = {
  activityRecipientType: 'recipient',
  context: 'My Search Result Context',
  startDate: '12/21/2021',
  endDate: '06/01/2023',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
};

jest.mock('bull');

describe('queue manager tests', () => {
  let report;
  beforeAll(async () => {
    await User.create(mockUser, { validate: false }, { individualHooks: false });
    report = await ActivityReport.create(reportObject);
    jest.spyOn(awsElasticsearchQueue, 'add').mockImplementation(async () => Promise.resolve());
  });
  afterAll(async () => {
    await ActivityReport.destroy({ where: { userId: mockUser.id } });
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  it('test scheduleAddIndexDocumentJob on the awsElasticsearchQueue', async () => {
    await scheduleAddIndexDocumentJob(
      report.id,
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      report,
    );
    expect(awsElasticsearchQueue.add).toHaveBeenCalled();
  });
});
