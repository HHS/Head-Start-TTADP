import faker from 'faker';
import {
  ActivityReport,
  User,
  ActivityReportCollaborator,
  sequelize,
} from '../models';
import updateLegacyCreatorsAndCollaborators from './updateLegacyCreatorsAndCollaborators';
import { REPORT_STATUSES } from '../constants';
import Users from '../policies/user';

const emails = [
  faker.internet.email(),
  faker.internet.email(),
  faker.internet.email(),
  faker.internet.email(),
];

const names = [
  faker.name.findName(),
  faker.name.findName(),
  faker.name.findName(),
  faker.name.findName(),
];

const dumbReport = {
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  topics: ['topics'],
  ttaType: ['type'],
  regionId: 1,
  targetPopulations: ['Dual-Language Learners'],
};

const mockUser = {
  name: 'Joe Green',
  role: null,
  phoneNumber: '555-555-554',
  hsesUserId: '49',
  hsesUsername: 'test49@test.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test49@test.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      userId: 49,
      regionId: 1,
      scopeId: 1,
    },
    {
      userId: 49,
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

describe('updateLegacyCreatorAndCollaborators', () => {
  let reports;
  let users;

  beforeAll(async () => {
    users = await Promise.all(emails.map((email, i) => (
      User.create({
        ...mockUser,
        hsesUserId: faker.datatype.number(),
        hsesUsername: email,
        email,
        name: names[i],
      })
    )));

    reports = await Promise.all([
      ActivityReport.create({
        ...dumbReport,
        userId: users[0].id,
        imported: {
          otherSpecialists: ' , , ',
        },
      }),
      ActivityReport.create({
        ...dumbReport,
        userId: null,
        imported: {
          createdBy: emails[1],
          otherSpecialists: emails[0],
        },
      }),
      ActivityReport.create({
        ...dumbReport,
        userId: users[1].id,
        imported: {
          otherSpecialists: '',
        },
      }),
      ActivityReport.create({
        ...dumbReport,
        userId: null,
        imported: {
          createdBy: emails[0],
          otherSpecialists: `${emails[2]},${emails[3]},`,
        },
      }),
    ]);
  });

  afterAll(async () => {
    const reportIds = reports.map((r) => r.id);

    await ActivityReportCollaborator.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: reportIds,
      },
    });

    await Users.destroy({
      where: {
        id: users.map((r) => r.id),
      },
    });

    await sequelize.close();
  });

  it('updates legacy creator and collaborator data', async () => {
    const reportIds = reports.map((report) => report.id);
    const before = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(before.length).toBe(4);

    await updateLegacyCreatorsAndCollaborators();

    // const after = await ActivityReport.findAll({
    //   attributes: ['userId', 'imported'],
    //   include: [
    //     {
    //       model: User,
    //       attributes: ['id', 'name', 'role', 'fullName'],
    //       as: 'collaborators',
    //       through: {
    //         attributes: [],
    //       },
    //       required: false,
    //     },
    //   ],
    //   where: {
    //     id: reportIds,
    //   },
    // });

    // after.forEach((report) => {
    //   const { userId, collaborators } = report;
    //   expect(userId).not.toBe(null);
    // });
  });
});
