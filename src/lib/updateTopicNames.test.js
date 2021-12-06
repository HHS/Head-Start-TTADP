import db, { ActivityReport, User } from '../models';
import { REPORT_STATUSES } from '../constants';
import updateTopicNames from './updateTopicNames';

const mockUser = {
  id: 6546180,
  homeRegionId: 1,
  name: 'user6546180',
  hsesUsername: 'user6546180',
  hsesUserId: '6546180',
};

const reportObject = {
  activityRecipientType: 'grantee',
  calculatedStatus: REPORT_STATUSES.APPROVED,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 90,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  ttaType: ['technical-assistance'],
  regionId: 1,
};

describe('update topic names job', () => {
  beforeAll(async () => {
    await User.create(mockUser);
  });

  afterAll(async () => {
    await ActivityReport.destroy({ where: { userId: [mockUser.id] } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await db.sequelize.close();
  });

  it('updates the contents of the database', async () => {
    await ActivityReport.create({
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
