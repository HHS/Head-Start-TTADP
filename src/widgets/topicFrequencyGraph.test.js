import db, {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  NextStep,
  Region,
  Role,
  UserRole,
} from '../models';
import filtersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import topicFrequencyGraph from './topicFrequencyGraph';

const GRANT_ID = 4040;
const RECIPIENT_ID = 5050;

const mockUser = {
  id: 9945620,
  homeRegionId: 1,
  name: 'user9945620',
  hsesUsername: 'user9945620',
  hsesUserId: '9945620',
  role: ['Grants Specialist'],
};

const mockUserTwo = {
  id: 2245942,
  homeRegionId: 1,
  name: 'user2245942',
  hsesUsername: 'user2245942',
  hsesUserId: 'user2245942',
  role: ['System Specialist'],
};

const mockUserThree = {
  id: 33068305,
  homeRegionId: 1,
  name: 'user33068305',
  hsesUsername: 'user33068305',
  hsesUserId: 'user33068305',
  role: ['Grants Specialist'],
};

const reportObject = {
  activityRecipientType: 'recipient',
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
  owner: { userId: mockUser.id },
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { grantId: GRANT_ID },
  ],
  numberOfParticipants: 11,
  deliveryMethod: 'in-person',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants', 'genies'],
  topics: ['Program Planning and Services'],
  ttaType: ['technical-assistance'],
};

const regionOneReport = {
  ...reportObject,
  regionId: 17,
  id: 17772,
  collaborators: [{ userId: mockUserTwo.id }, { userId: mockUserThree.id }],
};

const regionOneReportDistinctDate = {
  ...reportObject,
  startDate: '2000-06-01T12:00:00Z',
  endDate: '2000-06-02T12:00:00Z',
  regionId: 17,
  id: 17773,
  topics: ['Program Planning and Services', 'Recordkeeping and Reporting'],
  collaborators: [{ userId: mockUserTwo.id }],
};

const regionTwoReport = {
  ...reportObject,
  regionId: 18,
  id: 17774,
  collaborators: [{ userId: mockUserThree.id }],
};

const regionOneReportWithDifferentTopics = {
  ...reportObject,
  topics: ['Coaching'],
  regionId: 17,
  id: 17775,
};

describe('Topics and frequency graph widget', () => {
  beforeAll(async () => {
    await User.bulkCreate([
      mockUser,
      mockUserTwo,
      mockUserThree,
    ]);

    const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });
    const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });

    await UserRole.create({
      userId: mockUser.id,
      roleId: grantsSpecialist.id,
    });

    await UserRole.create({
      userId: mockUserTwo.id,
      roleId: systemSpecialist.id,
    });

    await UserRole.create({
      userId: mockUserThree.id,
      roleId: grantsSpecialist.id,
    });

    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' });
    await Region.create({ name: 'office 17', id: 17 });
    await Region.create({ name: 'office 18', id: 18 });
    await Grant.create({
      id: GRANT_ID,
      number: GRANT_ID,
      recipientId: RECIPIENT_ID,
      regionId: 17,
      status: 'Active',
      startDate: new Date('2000/01/01'),
    });
    await Promise.all([
      regionOneReport,
      regionOneReportDistinctDate,
      regionTwoReport,
      regionOneReportWithDifferentTopics,
    ].map(async (report) => createOrUpdate(report)));
  });

  afterAll(async () => {
    const ids = [17772, 17773, 17774, 17775];
    await NextStep.destroy({ where: { activityReportId: ids }, individualHooks: true });
    await ActivityRecipient.destroy({ where: { activityReportId: ids }, individualHooks: true });
    await ActivityReport.destroy({ where: { id: ids }, individualHooks: true });
    await UserRole.destroy({
      where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] },
      individualHooks: true,
    });
    await User.destroy({
      where: { id: [mockUser.id, mockUserTwo.id, mockUserThree.id] },
      individualHooks: true,
    });
    await Grant.destroy({
      where: { id: [GRANT_ID] },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: [RECIPIENT_ID] },
      individualHooks: true,
    });
    await Region.destroy({ where: { id: [17, 18] }, individualHooks: true });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns data in the correct format', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/01/01' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 0,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 1,
      },
      {
        topic: 'Communication',
        count: 0,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'Equity',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 1,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 0,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ]);
  });

  it('respects the region scope', async () => {
    const query = { 'region.in': [18], 'startDate.win': '2000/01/01-2000/01/01' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 0,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 0,
      },
      {
        topic: 'Communication',
        count: 0,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'Equity',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 1,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 0,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ]);
  });

  it('respects the date scope', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/06/02' };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 0,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 1,
      },
      {
        topic: 'Communication',
        count: 0,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'Equity',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 2,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 1,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ]);
  });

  it('respects the role scope', async () => {
    const query = { 'region.in': [17], 'role.in': ['System Specialist'] };
    const scopes = filtersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Screening and Assessment',
        count: 0,
      },
      {
        topic: 'CLASS: Classroom Organization',
        count: 0,
      },
      {
        topic: 'CLASS: Emotional Support',
        count: 0,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 0,
      },
      {
        topic: 'Coaching',
        count: 0,
      },
      {
        topic: 'Communication',
        count: 0,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 0,
      },
      {
        topic: 'Culture & Language',
        count: 0,
      },
      {
        topic: 'Curriculum (Instructional or Parenting)',
        count: 0,
      },
      {
        topic: 'Data and Evaluation',
        count: 0,
      },
      {
        topic: 'ERSEA',
        count: 0,
      },
      {
        topic: 'Environmental Health and Safety / EPRR',
        count: 0,
      },
      {
        topic: 'Equity',
        count: 0,
      },
      {
        topic: 'Facilities',
        count: 0,
      },
      {
        topic: 'Family Support Services',
        count: 0,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 0,
      },
      {
        topic: 'Home Visiting',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
      {
        topic: 'Leadership / Governance',
        count: 0,
      },
      {
        topic: 'Learning Environments',
        count: 0,
      },
      {
        topic: 'Nutrition',
        count: 0,
      },
      {
        topic: 'Oral Health',
        count: 0,
      },
      {
        topic: 'Parent and Family Engagement',
        count: 0,
      },
      {
        topic: 'Partnerships and Community Engagement',
        count: 0,
      },
      {
        topic: 'Physical Health and Screenings',
        count: 0,
      },
      {
        topic: 'Pregnancy Services / Expectant Families',
        count: 0,
      },
      {
        topic: 'Program Planning and Services',
        count: 2,
      },
      {
        topic: 'Quality Improvement Plan / QIP',
        count: 0,
      },
      {
        topic: 'Recordkeeping and Reporting',
        count: 1,
      },
      {
        topic: 'Safety Practices',
        count: 0,
      },
      {
        topic: 'Staff Wellness',
        count: 0,
      },
      {
        topic: 'Teaching / Caregiving Practices',
        count: 0,
      },
      {
        topic: 'Technology and Information Systems',
        count: 0,
      },
      {
        topic: 'Transition Practices',
        count: 0,
      },
      {
        topic: 'Transportation',
        count: 0,
      },
    ]);
  });
});
