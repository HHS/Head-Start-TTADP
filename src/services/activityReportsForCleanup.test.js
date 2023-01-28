import faker from '@faker-js/faker';
import {
  ActivityReport,
  User,
  Recipient,
  Grant,
  Collaborator,
} from '../models';
import {
  activityReportsForCleanup,
} from './activityReports';
import { REPORT_STATUSES, ENTITY_TYPES } from '../constants';
import {
  upsertRatifier,
  upsertEditor,
} from './collaborators';

import { createReport, destroyReport } from '../testUtils';

const RECIPIENT_ID = faker.datatype.number({ min: 900 });

const MOCK_AUTHOR_ID = faker.datatype.number({ min: 11111111 });
const MOCK_COLLABORATOR_ID = faker.datatype.number({ min: 11111111 });
const MOCK_APPROVER_ID = faker.datatype.number({ min: 11111111 });
const MOCK_PHANTOM_USER_ID = faker.datatype.number({ min: 11111111 });

const mockAuthor = {
  id: MOCK_AUTHOR_ID,
  homeRegionId: 1,
  name: `USER-${MOCK_AUTHOR_ID}`,
  hsesUsername: `USER-${MOCK_AUTHOR_ID}`,
  hsesUserId: `USER-${MOCK_AUTHOR_ID}`,
  role: ['Grants Specialist', 'Health Specialist'],
};

const mockCollaborator = {
  id: MOCK_COLLABORATOR_ID,
  homeRegionId: 1,
  name: `USER-${MOCK_COLLABORATOR_ID}`,
  hsesUserId: `USER-${MOCK_COLLABORATOR_ID}`,
  hsesUsername: `USER-${MOCK_COLLABORATOR_ID}`,
  role: ['COR'],
};

const mockApprover = {
  id: MOCK_APPROVER_ID,
  homeRegionId: 1,
  name: `USER-${MOCK_APPROVER_ID}`,
  hsesUsername: `USER-${MOCK_APPROVER_ID}`,
  hsesUserId: `USER-${MOCK_APPROVER_ID}`,
  role: [],
};

const mockPhantomUser = {
  id: MOCK_PHANTOM_USER_ID,
  homeRegionId: 1,
  name: `USER-${MOCK_PHANTOM_USER_ID}`,
  hsesUserId: `USER-${MOCK_PHANTOM_USER_ID}`,
  hsesUsername: `USER-${MOCK_PHANTOM_USER_ID}`,
  role: [],
};

const reportObject = {
  activityRecipientType: 'recipient',
  approval: {
    submissionStatus: REPORT_STATUSES.DRAFT,
  },
  owner: { userId: mockAuthor.id },
  regionId: 1,
  lastUpdatedById: mockAuthor.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ grantId: RECIPIENT_ID }],
  createdAt: new Date(),
};

const submittedReport = {
  ...reportObject,
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
  },
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

const approvedReport = {
  ...submittedReport,
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
};

describe('Activity report cleanup service', () => {
  afterAll(async () => {
    // https://stackoverflow.com/questions/47970050/node-js-mocha-sequelize-error-connectionmanager-getconnection-was-called-after-t
    // await db.sequelize.close();
  });

  let reportByMockAuthorWithMockCollaborator;
  let reportByMockAuthorWithMockApprover;

  beforeAll(async () => {
    await Promise.all([
      User.bulkCreate([
        mockAuthor,
        mockCollaborator,
        mockApprover,
        mockPhantomUser,
      ], { validate: true, individualHooks: true }),
      Recipient.create({ name: faker.word.noun(), id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' }),
    ]);
    await Grant.create({
      id: RECIPIENT_ID, number: 1, recipientId: RECIPIENT_ID, regionId: 1, status: 'Active',
    });

    // submitted report
    await createReport(submittedReport);

    // approved report
    await createReport(approvedReport);

    // draft report
    await createReport(reportObject);

    // report by wrong author
    await createReport({ ...submittedReport, userId: mockPhantomUser.id });

    // report that is too old
    await createReport({ ...submittedReport, createdAt: '2020-09-01T12:00:00Z' });

    reportByMockAuthorWithMockCollaborator = await createReport(submittedReport);

    await upsertEditor({
      entityType: ENTITY_TYPES.REPORT,
      entityId: reportByMockAuthorWithMockCollaborator.id,
      userId: mockCollaborator.id,
    });

    reportByMockAuthorWithMockApprover = await createReport(submittedReport);

    await upsertRatifier({
      entityType: ENTITY_TYPES.REPORT,
      entityId: reportByMockAuthorWithMockApprover.id,
      userId: mockApprover.id,
    });
  });

  afterAll(async () => {
    try {
      const reportsToDestroy = await ActivityReport.findAll({
        include: [{
          model: Collaborator,
          as: 'owner',
          where: {
            userId: [mockAuthor.id, mockPhantomUser.id],
          },
          required: true,
        }],
      });
      await Promise.all(reportsToDestroy.map((r) => destroyReport(r)));
      await Grant.destroy({
        where: { id: RECIPIENT_ID },
        individualHooks: true,
      });
      await Recipient.destroy({
        where: { id: RECIPIENT_ID },
        individualHooks: true,
      });
      await User.destroy({
        where: {
          id: [mockAuthor.id, mockApprover.id, mockCollaborator.id, mockPhantomUser.id],
        },
        individualHooks: true,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Error destroying test data: ${e}`);
    }
  });

  it('returns reports by author', async () => {
    const reports = await activityReportsForCleanup(mockAuthor.id);
    expect(reports.length).toBe(4);
  });

  it('returns reports by collaborator', async () => {
    const reports = await activityReportsForCleanup(mockCollaborator.id);
    expect(reports.length).toBe(1);
  });

  it('returns reports by approver', async () => {
    const reports = await activityReportsForCleanup(mockApprover.id);
    expect(reports.length).toBe(1);
  });
});
