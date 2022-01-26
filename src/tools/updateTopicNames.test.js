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
  activityRecipientType: 'recipient',
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
    const reports = await Promise.all([
      ActivityReport.create({
        ...reportObject,
        requester: 'Bruce',
        topics: [
          'Behavioral / Mental Health',
          'Coaching',
          'CLASS: Classroom Management',
        ],
      }),
      ActivityReport.create({
        ...reportObject,
        requester: 'Brucina',
        topics: [
          'QIP',
          'Program Planning and Services',
          'Curriculum (Early Childhood or Parenting)',
          'Environmental Health and Safety / EPRR',
        ],
      }),
      ActivityReport.create({
        ...reportObject,
        requester: 'Jibbery Jim',
        topics: [
          'Environmental Health and Safety | HS',
          'parent/family engagement/program planning/QIP',
          'Test',
        ],
      }),
      ActivityReport.create({ ...reportObject, topics: ['Oral Health'] }),
    ]);

    await updateTopicNames();

    const updatedReports = await ActivityReport.findAll({
      where: {
        id: reports.map(({ id }) => id),
      },
    });

    updatedReports.forEach((report) => {
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

      if (report.requester === 'Jibbery Jim') {
        topics = ['Environmental Health and Safety / EPRR', 'Test', 'Parent and Family Engagement', 'Program Planning and Services', 'Quality Improvement / QIP'];
      }

      if (report.requester === 'requester') {
        topics = ['Oral Health'];
      }

      expect(report.topics).toStrictEqual(topics);
    });
  });
});
