import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, NextStep,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import updateTopicNames from './updateTopicNames';

const GRANTEE_ID = 30;
const GRANTEE_ID_TWO = 31;

const mockUser = {
  id: 1000,
  homeRegionId: 1,
  name: 'chud',
  hsesUsername: 'chud',
  hsesUserId: '1000',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  ttaType: ['technical-assistance'],
  regionId: 1,
};

describe('update topic names job', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });

    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID, number: '1', granteeId: GRANTEE_ID, regionId: 1, status: 'Active',
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID_TWO, number: '2', granteeId: GRANTEE_ID, regionId: 1, status: 'Active',
      },
    });
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the contents of the database', async () => {
    ActivityReport.create({
      ...reportObject,
      requester: 'Bruce',
      topics: [
        'Behavioral / Mental Health',
        'Coaching',
        'CLASS: Classroom Management',
      ],
    });

    await ActivityReport.create({
      ...reportObject,
      requester: 'Brucina',
      topics: [
        'QIP',
        'Program Planning and Services',
        'Curriculum: Early Childhood or Parenting',
        'Environmental Health and Safety',
      ],
    });

    const thirdReport = await ActivityReport.create({ ...reportObject, topics: ['Oral Health'] });

    await updateTopicNames().then((reports) => {
      reports.forEach((report) => {
        let topics = [];
        if (report.requester === 'Bruce') {
          topics = [
            'Behavioral / Mental Health / Trauma',
            'Coaching',
            'CLASS: Classroom Organization',
          ];
        }

        if (report.requester === 'Brucina') {
          topics = [
            'Quality Improvement Plan / QIP',
            'Program Planning and Services',
            'Curriculum (Instructional or Parenting)',
            'Environmental Health and Safety / EPRR',
          ];
        }
        expect(report.topics).toStrictEqual(topics);
      });

      expect(thirdReport.topics).toStrictEqual(['Oral Health']);
    });
  });
});
