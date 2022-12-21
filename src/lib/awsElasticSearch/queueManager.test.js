import { awsElasticsearchQueue, scheduleAddIndexDocumentJob } from './queueManager';
import { REPORT_STATUSES } from '../../constants';

import db, {
  ActivityReport,
  User,
} from '../../models';

const mockUser = {
  id: 7194161,
  homeRegionId: 1,
  context: 'My Search Result Context',
  name: 'user2184932161',
  hsesUsername: 'user2184932161',
  hsesUserId: 'user2184932161',
  role: ['Grants Specialist', 'Health Specialist'],
};

const reportObject = {
  activityRecipientType: 'recipient',
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
    await scheduleAddIndexDocumentJob(report);
    expect(awsElasticsearchQueue.add).toHaveBeenCalled();
  });
});
