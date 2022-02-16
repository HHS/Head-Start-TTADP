/* eslint-disable jest/no-conditional-expect */
import faker from 'faker';
import {
  ActivityReport,
  User,
  ActivityReportCollaborator,
  sequelize,
} from '../models';
import updateLegacyCreatorsAndCollaborators, { extractCollaboratorEmails } from './updateLegacyCreatorsAndCollaborators';
import { REPORT_STATUSES } from '../constants';
import { destroyReport } from '../testUtils';

const emails = [
  'email1@email.com',
  'email2@email.com',
  'email3@email.com',
  'email4@email.com',
  'email5@email.com',
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
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;
  let reportFive;
  let reportSix;

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
    reportOne = await ActivityReport.create({
      ...dumbReport,
      userId: users[0].id,
      imported: {
        otherSpecialists: ' , , ',
      },
    });
    reportTwo = await ActivityReport.create({
      ...dumbReport,
      userId: null,
      imported: {
        createdBy: emails[1],
        otherSpecialists: emails[0],
      },
    });
    reportThree = await ActivityReport.create({
      ...dumbReport,
      userId: users[1].id,
      imported: {
        otherSpecialists: '',
      },
    });
    reportFour = await ActivityReport.create({
      ...dumbReport,
      userId: null,
      imported: {
        createdBy: emails[0],
        otherSpecialists: `${emails[2]},${emails[3]},`,
      },
    });
    reportFive = await ActivityReport.create({
      ...dumbReport,
      userId: null,
      imported: {
        createdBy: emails[0],
        otherSpecialists: `${names[2]},${names[3]},`,
      },
    });

    reportSix = await ActivityReport.create({
      ...dumbReport,
      userId: null,
      imported: {
        createdBy: emails[0],
        otherSpecialists: `${emails[1]},${emails[2]}`,
      },
    });

    await ActivityReportCollaborator.create({
      activityReportId: reportFive.id,
      userId: users[1].id,
    });
  });

  afterAll(async () => {
    const reports = [
      reportOne, reportTwo, reportThree, reportFour, reportFive, reportSix,
    ];

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
    await updateLegacyCreatorsAndCollaborators();

    const arFindOpts = (id) => ({
      attributes: ['id', 'userId', 'imported'],
      include: [
        {
          model: User,
          attributes: ['email', 'id'],
          as: 'collaborators',
          through: {
            attributes: [],
          },
          required: false,
        },
      ],
      where: {
        id,
      },
    });

    const r1 = await ActivityReport.findOne(arFindOpts(reportOne.id));
    expect(r1.userId).toBe(users[0].id);
    expect(r1.collaborators.length).toBe(0);

    const r2 = await ActivityReport.findOne(arFindOpts(reportTwo.id));
    expect(r2.userId).toBe(users[1].id);
    const r2Emails = r2.collaborators.map((c) => c.email);
    expect(r2Emails).toContain(emails[0]);

    const r3 = await ActivityReport.findOne(arFindOpts(reportThree.id));
    expect(r3.collaborators.length).toBe(0);
    expect(r3.userId).toBe(users[1].id);

    const r4 = await ActivityReport.findOne(arFindOpts(reportFour.id));
    expect(r4.userId).toBe(users[0].id);
    const r4Emails = r4.collaborators.map((c) => c.email);
    expect(r4Emails).toContain(emails[2]);
    expect(r4Emails).toContain(emails[3]);

    const r5 = await ActivityReport.findOne(arFindOpts(reportFive.id));
    expect(r5.userId).toBe(users[0].id);
    expect(r5.collaborators.length).toBe(1);
    const r5Collabs = r5.collaborators.map((c) => c.id);
    expect(r5Collabs).toContain(users[1].id);

    const r6 = await ActivityReport.findOne(arFindOpts(reportSix.id));
    expect(r6.userId).toBe(users[0].id);
    const r6Emails = r6.collaborators.map((c) => c.email);
    expect(r6Emails).toContain(emails[1]);
    expect(r6Emails).toContain(emails[2]);
  });

  describe('extractCollaboratorEmails', () => {
    it('correctly handles all the wackiness', () => {
      const youmightfindtheseemails = [faker.internet.email(), faker.internet.email()];
      const possibles = [
        'Anita Bertt (Early Childhood Specialist)\nAmber Sullington (Grantee Specialist Manager)\nClaude Muscles (Early Childhood Specialist)\nGinger Professorson (Early Childhood Specialist)\nVarg Horvall (Early Childhood Specialist)\nMegan DeSuazo (Early Childhood Specialist)\nMeriadoc(Merry) Elfboy (Early Childhood Specialist)\nMaury Lipsitz (Family Engagement Specialist)\nRune Balderson (Early Childhood Specialist)\nNancy Kerrigan (Administrative Assistant)\nMiracle Worker (Grantee Specialist)\nTaurus (Early Childhood Specialist)\nNed Fleming (Early Childhood Manager)',
        `${youmightfindtheseemails.join(',')}`,
        'Laura Specialist',
        youmightfindtheseemails[1],
        '0',
        null,
        `@${youmightfindtheseemails[0]}`,
      ];

      const results = possibles.map((p) => extractCollaboratorEmails(p));
      expect(results[0]).toBe(null);
      expect(results[1]).toContain(youmightfindtheseemails[0]);
      expect(results[1]).toContain(youmightfindtheseemails[1]);
      expect(results[2]).toBe(null);
      expect(results[3]).toContain(youmightfindtheseemails[1]);
      expect(results[4]).toBe(null);
      expect(results[5]).toBe(null);
      expect(results[6]).toContain(youmightfindtheseemails[0]);
    });
  });
});
