/* eslint-disable jest/no-commented-out-tests */
/* eslint-disable dot-notation */
import faker from '@faker-js/faker';
import db, {
  ActivityReport,
  User,
} from '../../models';
import { REPORT_STATUSES, AWS_ELASTIC_SEARCH_INDEXES } from '../../constants';
import {
  getClient,
  deleteIndex,
  createIndex,
  addIndexDocument,
  search,
} from './index';

jest.mock('bull');

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user13706524',
  hsesUsername: 'user13706524',
  hsesUserId: 'user13706524',
};

const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
};

describe('returnsAllResults', () => {
  let report1;
  let report2;
  let report3;
  let client;

  beforeAll(async () => {
    await User.create(mockUser);

    // Create ES client.
    client = await getClient();

    // Create new index
    await deleteIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    await createIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);

    // Create reports.
    report1 = await ActivityReport.create({ ...draftReport, context: 'Keep things as simple as possible' });
    report2 = await ActivityReport.create({ ...draftReport, context: 'Life is really simple, but we insist on making it complicated' });
    report3 = await ActivityReport.create({ ...draftReport, context: 'Simple means to eliminate the unnecessary' });

    // Add Index Documents.
    await addIndexDocument({
      data: {
        indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        id: report1.id,
        document: { id: report1.id, context: 'Keep things as simple as possible' },
      },
    });
    await addIndexDocument({
      data: {
        indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        id: report2.id,
        document: { id: report2.id, context: 'Life is really simple, but we insist on making it complicated' },
      },
    });
    await addIndexDocument({
      data: {
        indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        id: report3.id,
        document: { id: report3.id, context: 'Simple means to eliminate the unnecessary' },
      },
    });
  });

  afterAll(async () => {
    // Delete reports.
    await ActivityReport.unscoped().destroy({
      where: { id: [report1.id, report2.id, report3.id] },
    });

    // Delete user.
    await User.destroy({
      where: {
        id: mockUser.id,
      },
    });

    // Delete indexes.
    await deleteIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);

    await db.sequelize.close();
  });

  it('returns all pages of data at two per page', async () => {
    // Search (set per page to 1 + per page).
    const searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['context'],
      'simple',
      null,
      2,
    );

    // Assert results.
    expect(searchResult.hits.length).toBe(3);

    // Check found Ids.
    const foundIds = searchResult.hits.map((h) => h['_source'].id);
    expect(foundIds).toStrictEqual([report1.id, report2.id, report3.id]);
  });

  it('returns all pages of data at one per page', async () => {
    // Search.
    const searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['context'],
      'simple',
      null,
      1,
    );

    // Assert results.
    expect(searchResult.hits.length).toBe(3);

    // Check found Ids.
    const foundIds = searchResult.hits.map((h) => h['_source'].id);
    expect(foundIds).toStrictEqual([report1.id, report2.id, report3.id]);
  });

  it('returns all pages of data at three per page', async () => {
    // Search.
    const searchResult = await search(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      ['context'],
      'simple',
      null,
      3,
    );

    // Assert results.
    expect(searchResult.hits.length).toBe(3);

    // Check found Ids.
    const foundIds = searchResult.hits.map((h) => h['_source'].id);
    expect(foundIds).toStrictEqual([report1.id, report2.id, report3.id]);
  });
});
