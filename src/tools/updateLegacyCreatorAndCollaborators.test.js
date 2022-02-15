import faker from 'faker';
import {
  ActivityReport,
  User,
  ActivityReportCollaborator,
  sequelize,
} from '../models';
import updateLegacyCreatorsAndCollaborators from './updateLegacyCreatorsAndCollaborators';
import { REPORT_STATUSES } from '../constants';
import { destroyReport } from '../testUtils';

const emails = [
  faker.internet.email(),
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
      ActivityReport.create({
        ...dumbReport,
        userId: null,
        imported: {
          createdBy: emails[0],
          otherSpecialists: `${names[2]},${names[3]},`,
        },
      }),
      ActivityReport.create({
        ...dumbReport,
        userId: null,
        imported: {
          createdBy: emails[0],
          otherSpecialists: `${emails[1]},${emails[2]}`,
        },
      }),
    ]);

    await ActivityReportCollaborator.create({
      activityReportId: reports[5].id,
      userId: users[1].id,
    });
  });

  afterAll(async () => {
    const reportIds = reports.map((r) => r.id);

    await ActivityReportCollaborator.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Promise.all(reports.map((r) => destroyReport(r)));

    await User.destroy({
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

    expect(before.length).toBe(6);

    await updateLegacyCreatorsAndCollaborators();

    const after = await ActivityReport.findAll({
      attributes: ['id', 'userId', 'imported'],
      include: [
        {
          model: User,
          attributes: ['email'],
          as: 'collaborators',
          through: {
            attributes: [],
          },
          required: false,
        },
      ],
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(6);

    const [reportOne, reportTwo, reportThree, reportFour, reportFive, reportSix] = after;
    const {
      userId: reportOneUserId,
      collaborators: reportOneCollaborators,
      imported: {
        otherSpecialists: reportOneOtherSpecialists,
        createdBy: reportOneCreatedBy,
      },
    } = reportOne;
    let u = await User.findByPk(reportOneUserId);
    let expectCreator = reportOneCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportOneCreatedBy);
    reportOneOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportOneCollaborators.map((r) => r.email)).toContain(c);
    });

    const {
      userId: reportTwoUserId,
      collaborators: reportTwoCollaborators,
      imported: {
        otherSpecialists: reportTwoOtherSpecialists,
        createdBy: reportTwoCreatedBy,
      },
    } = reportTwo;
    u = await User.findByPk(reportTwoUserId);
    expectCreator = reportTwoCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportTwoCreatedBy);
    reportTwoOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportTwoCollaborators.map((r) => r.email)).toContain(c);
    });

    const {
      userId: reportThreeUserId,
      collaborators: reportThreeCollaborators,
      imported: {
        otherSpecialists: reportThreeOtherSpecialists,
        createdBy: reportThreeCreatedBy,
      },
    } = reportThree;
    u = await User.findByPk(reportThreeUserId);
    expectCreator = reportThreeCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportThreeCreatedBy);
    reportThreeOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportThreeCollaborators.map((r) => r.email)).toContain(c);
    });

    const {
      userId: reportFourUserId,
      collaborators: reportFourCollaborators,
      imported: {
        otherSpecialists: reportFourOtherSpecialists,
        createdBy: reportFourCreatedBy,
      },
    } = reportFour;
    u = await User.findByPk(reportFourUserId);
    expectCreator = reportFourCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportFourCreatedBy);
    reportFourOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportFourCollaborators.map((r) => r.email)).toContain(c);
    });

    const {
      userId: reportFiveUserId,
      collaborators: reportFiveCollaborators,
      imported: {
        otherSpecialists: reportFiveOtherSpecialists,
        createdBy: reportFiveCreatedBy,
      },
    } = reportFive;
    u = await User.findByPk(reportFiveUserId);
    expectCreator = reportFiveCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportFiveCreatedBy);
    reportFiveOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportFiveCollaborators.map((r) => r.email)).toContain(c);
    });

    const {
      userId: reportSixUserId,
      collaborators: reportSixCollaborators,
      imported: {
        otherSpecialists: reportSixOtherSpecialists,
        createdBy: reportSixCreatedBy,
      },
    } = reportSix;
    u = await User.findByPk(reportSixUserId);
    expectCreator = reportSixCreatedBy ? u.email : undefined;
    expect(expectCreator).toBe(reportSixCreatedBy);
    reportSixOtherSpecialists.replace(/ /g, '').split(',').filter((c) => c).forEach((c) => {
      expect(reportSixCollaborators.map((r) => r.email)).toContain(c);
    });
  });
});
