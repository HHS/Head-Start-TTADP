import db, {
  ActivityReport,
  ActivityRecipient,
  ActivityReportCollaborator,
  User,
  Grantee,
  Grant,
  NextStep,
  Region,
} from '../models';
import determineFiltersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';
import topicFrequencyGraph from './topicFrequencyGraph';

const GRANTEE_ID = 30;

const mockUser = {
  id: 2000,
  homeRegionId: 1,
  name: 'user1000',
  hsesUsername: 'user1000',
  hsesUserId: '1000',
  role: ['Grants Specialist'],
};

const mockUserTwo = {
  id: 2001,
  homeRegionId: 1,
  name: 'user2001',
  hsesUsername: 'user2001',
  hsesUserId: '2001',
  role: ['System Specialist'],
};

const mockUserThree = {
  id: 3001,
  homeRegionId: 1,
  name: 'user3001',
  hsesUsername: 'user2001',
  hsesUserId: '3001',
  role: ['Grants Specialist'],
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'in-person',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
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
};

const regionOneReportDistinctDate = {
  ...reportObject,
  startDate: '2000-06-01T12:00:00Z',
  endDate: '2000-06-02T12:00:00Z',
  regionId: 17,
  id: 17773,
  topics: ['Program Planning and Services', 'Recordkeeping and Reporting'],
};

const regionTwoReport = {
  ...reportObject,
  regionId: 18,
  id: 17774,
};

const regionOneReportWithDifferentTopics = {
  ...reportObject,
  topics: ['Coaching'],
  regionId: 17,
  id: 17775,
};

describe('Topics and frequency graph widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await User.create(mockUserTwo);
    await User.create(mockUserThree);
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });
    await Region.create({ name: 'office 17', id: 17 });
    await Region.create({ name: 'office 18', id: 18 });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID, number: '1', granteeId: GRANTEE_ID, regionId: 17, status: 'Active', startDate: new Date('2000/01/01'),
      },
    });

    await ActivityReport.create(regionOneReport);
    await ActivityReport.create(regionOneReportDistinctDate);
    await ActivityReport.create(regionTwoReport);
    await ActivityReport.create(regionOneReportWithDifferentTopics);

    await ActivityReportCollaborator.create({
      id: 2000,
      activityReportId: 17772,
      userId: mockUserTwo.id,
    });

    await ActivityReportCollaborator.create({
      id: 2001,
      activityReportId: 17772,
      userId: mockUserThree.id,
    });

    await ActivityReportCollaborator.create({
      id: 2002,
      activityReportId: 17773,
      userId: mockUserTwo.id,
    });

    await ActivityReportCollaborator.create({
      id: 2003,
      activityReportId: 17774,
      userId: mockUserThree.id,
    });
  });

  afterAll(async () => {
    const ids = [17772, 17773, 17774, 17775];
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id, mockUserThree.id] } });
    await Grant.destroy({
      where:
      { id: [GRANTEE_ID] },
    });
    await Grantee.destroy({
      where:
      { id: [GRANTEE_ID] },
    });
    await Region.destroy({ where: { id: 17 } });
    await Region.destroy({ where: { id: 18 } });
    await ActivityReportCollaborator.destroy(
      { where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] } },
    );
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns data in the correct format', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2000/01/01-2000/01/01' };
    const scopes = determineFiltersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Assessment, Development, Screening',
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
        topic: 'Teaching Practices / Teacher-Child Interactions',
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
    const scopes = determineFiltersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Assessment, Development, Screening',
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
        topic: 'Teaching Practices / Teacher-Child Interactions',
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
    const scopes = determineFiltersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Assessment, Development, Screening',
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
        topic: 'Teaching Practices / Teacher-Child Interactions',
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
    const scopes = determineFiltersToScopes(query);
    const data = await topicFrequencyGraph(scopes);

    expect(data).toStrictEqual([
      {
        topic: 'Behavioral / Mental Health / Trauma',
        count: 0,
      },
      {
        topic: 'Child Assessment, Development, Screening',
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
        topic: 'Teaching Practices / Teacher-Child Interactions',
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
