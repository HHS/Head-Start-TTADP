import { ValidationError } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import db, { ActivityReport, Notification, User } from '..';

describe('notification model hooks', () => {
  const createdNotificationIds = [];
  const mockUser = {
    id: 44401001,
    homeRegionId: 1,
    hsesUsername: 'notif-hook-test-user',
    hsesUserId: 'notif-hook-test-user',
    lastLogin: new Date(),
  };

  const reportFixture = {
    userId: mockUser.id,
    regionId: 1,
    submissionStatus: 'draft',
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2000-01-01T12:00:00Z',
    startDate: '2000-01-01T12:00:00Z',
    activityRecipientType: 'something',
    requester: 'requester',
    targetPopulations: ['pop'],
    reason: ['reason'],
    participants: ['participants'],
    topics: ['topics'],
    ttaType: ['type'],
    language: ['English'],
    activityReason: 'reason',
    version: 2,
    creatorRole: 'TTAC',
  };

  const trackNotification = (notification) => {
    createdNotificationIds.push(notification.id);
    return notification;
  };

  let activityReport;

  beforeAll(async () => {
    await User.create(mockUser);
    activityReport = await ActivityReport.create(reportFixture);
  });

  afterAll(async () => {
    if (createdNotificationIds.length) {
      await Notification.destroy({
        where: { id: createdNotificationIds },
        force: true,
      });
    }

    if (activityReport) {
      await ActivityReport.destroy({
        where: { id: activityReport.id },
        force: true,
      });
    }

    await User.destroy({
      where: { id: mockUser.id },
      force: true,
    });

    await db.sequelize.close();
  });

  it('allows activity report notification types with a valid activity report entityId', async () => {
    const notification = trackNotification(
      await Notification.create({
        userId: mockUser.id,
        entityId: activityReport.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
        text: 'Activity report needs action',
      })
    );

    expect(notification.id).toBeDefined();
    expect(notification.entityId).toBe(activityReport.id);
  });

  it('rejects activity report notification types with an invalid activity report entityId', async () => {
    expect.assertions(2);

    try {
      await Notification.create({
        userId: mockUser.id,
        entityId: 999999999,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        text: 'Activity report submitted',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors[0].message).toContain('does not reference a valid ActivityReport');
    }
  });

  it('allows non-activity-report notification types with a bogus entityId', async () => {
    const notification = trackNotification(
      await Notification.create({
        userId: mockUser.id,
        entityId: 999999999,
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
        text: 'System outage',
      })
    );

    expect(notification.id).toBeDefined();
    expect(notification.entityId).toBe(999999999);
  });

  it('allows null entityId for activity report notification types', async () => {
    const notification = trackNotification(
      await Notification.create({
        userId: mockUser.id,
        entityId: null,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
        text: 'Activity report approved',
      })
    );

    expect(notification.id).toBeDefined();
    expect(notification.entityId).toBeNull();
  });
});
