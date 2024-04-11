import { REPORT_STATUSES } from '@ttahub/common';
import {
  awsElasticsearchQueue,
  scheduleAddIndexDocumentJob,
  scheduleUpdateIndexDocumentJob,
  scheduleDeleteIndexDocumentJob,
  onCompletedAWSElasticsearchQueue,
  onFailedAWSElasticsearchQueue,
  processAWSElasticsearchQueue,
} from './queueManager';
import { AWS_ELASTIC_SEARCH_INDEXES, AWS_ELASTICSEARCH_ACTIONS } from '../../constants';
import { logger, auditLogger } from '../../logger';
import {
  addIndexDocument,
  updateIndexDocument,
  deleteIndexDocument,
} from '.';

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
  lastLogin: new Date(),
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
  version: 2,
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

  it('test scheduleUpdateIndexDocumentJob on the awsElasticsearchQueue', async () => {
    await scheduleUpdateIndexDocumentJob(
      report.id,
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      report,
    );
    expect(awsElasticsearchQueue.add).toHaveBeenCalled();
  });

  it('test scheduleDeleteIndexDocumentJob on the awsElasticsearchQueue', async () => {
    await scheduleDeleteIndexDocumentJob(
      report.id,
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
    );
    expect(awsElasticsearchQueue.add).toHaveBeenCalled();
  });

  it('test onCompletedAWSElasticsearchQueue on the awsElasticsearchQueue', async () => {
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    await onCompletedAWSElasticsearchQueue(
      { data: { key: 'test' } },
      { status: 200 },
    );
    expect(logger.info).toHaveBeenCalled();

    jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
    await onCompletedAWSElasticsearchQueue(
      { data: { key: 'test' } },
      { status: 500 },
    );
    expect(auditLogger.error).toHaveBeenCalled();
  });

  it('test onCompletedAWSElasticsearchQueue on the processAWSElasticsearchQueue', async () => {
    jest.spyOn(awsElasticsearchQueue, 'on').mockImplementation(() => {});
    jest.spyOn(awsElasticsearchQueue, 'process').mockImplementation(() => {});
    await processAWSElasticsearchQueue();
    let i = 1;
    // // expect(awsElasticsearchQueue.on)
    // //   .toHaveBeenNthCalledWith(i, 'error', expect.any(Function));
    // // i += 1;
    expect(awsElasticsearchQueue.on)
      .toHaveBeenNthCalledWith(i, 'failed', onFailedAWSElasticsearchQueue);
    i += 1;
    expect(awsElasticsearchQueue.on)
      .toHaveBeenNthCalledWith(i, 'completed', onCompletedAWSElasticsearchQueue);
    expect(awsElasticsearchQueue.process)
      .toHaveBeenNthCalledWith(
        1,
        AWS_ELASTICSEARCH_ACTIONS.ADD_INDEX_DOCUMENT,
        addIndexDocument,
      );
    expect(awsElasticsearchQueue.process)
      .toHaveBeenNthCalledWith(
        2,
        AWS_ELASTICSEARCH_ACTIONS.UPDATE_INDEX_DOCUMENT,
        updateIndexDocument,
      );
    expect(awsElasticsearchQueue.process)
      .toHaveBeenNthCalledWith(
        3,
        AWS_ELASTICSEARCH_ACTIONS.DELETE_INDEX_DOCUMENT,
        deleteIndexDocument,
      );
  });
});
