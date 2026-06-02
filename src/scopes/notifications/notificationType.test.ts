import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import {
  NOTIFICATION_TYPE_MAP,
  withNotificationType,
  withoutNotificationType,
} from './notificationType';

const { Notification, User } = db;

describe('notifications/notificationType scope', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('withNotificationType', () => {
    it('maps activityReport to all activity report notification types', () => {
      const scope = withNotificationType(['activityReport']);
      const types = scope.type[Op.in];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED,
        ])
      );
      expect(types).toHaveLength(NOTIFICATION_TYPE_MAP.activityReport.length);
    });

    it('maps collabReport to all collaborative report notification types', () => {
      const scope = withNotificationType(['collabReport']);
      const types = scope.type[Op.in];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.COLLAB_REPORT_COLLABORATOR_ADDED,
          NOTIFICATION_TYPES.COLLAB_REPORT_SUBMITTED,
          NOTIFICATION_TYPES.COLLAB_REPORT_RESUBMITTED,
          NOTIFICATION_TYPES.COLLAB_REPORT_NEEDS_ACTION,
          NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
        ])
      );
      expect(types).toHaveLength(NOTIFICATION_TYPE_MAP.collabReport.length);
    });

    it('maps trainingReport to all training report notification types', () => {
      const scope = withNotificationType(['trainingReport']);
      const types = scope.type[Op.in];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.TRAINING_REPORT_POC_ADDED,
          NOTIFICATION_TYPES.TRAINING_REPORT_COLLABORATOR_ADDED,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_CREATED,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_SUBMITTED,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_RESUBMITTED,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_COMPLETED,
          NOTIFICATION_TYPES.TRAINING_REPORT_TASK_DUE,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_IMPORTED,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_INFO_MISSING,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_INFO_PAST_DUE,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_INFO_MISSING,
          NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_INFO_PAST_DUE,
          NOTIFICATION_TYPES.TRAINING_REPORT_NO_SESSIONS_CREATED,
          NOTIFICATION_TYPES.TRAINING_REPORT_NO_SESSIONS_PAST_DUE,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_NOT_COMPLETED,
          NOTIFICATION_TYPES.TRAINING_REPORT_EVENT_NOT_COMPLETED_PAST_DUE,
        ])
      );
    });

    it('maps systemRelated to system outage notification types', () => {
      const scope = withNotificationType(['systemRelated']);
      const types = scope.type[Op.in];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
          NOTIFICATION_TYPES.SYSTEM_UNPLANNED_OUTAGE,
        ])
      );
      expect(types).toHaveLength(NOTIFICATION_TYPE_MAP.systemRelated.length);
    });

    it('maps other to communication log, monitoring, and group notification types', () => {
      const scope = withNotificationType(['other']);
      const types = scope.type[Op.in];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.COMMUNICATION_LOG_TTA_STAFF_ADDED,
          NOTIFICATION_TYPES.COMMUNICATION_LOG_RECIPIENT_IN_GROUP,
          NOTIFICATION_TYPES.MONITORING_GOAL_ADDED,
          NOTIFICATION_TYPES.MONITORING_DATA_RECEIVED,
          NOTIFICATION_TYPES.GROUP_CO_OWNER_ADDED,
          NOTIFICATION_TYPES.GROUP_SHARED,
        ])
      );
    });

    it('returns a deduplicated union when multiple valid categories are provided', () => {
      const combined = withNotificationType(['activityReport', 'systemRelated']);
      const singleAR = withNotificationType(['activityReport']);
      const singleSR = withNotificationType(['systemRelated']);

      const combinedTypes = combined.type[Op.in];
      expect(combinedTypes).toHaveLength(singleAR.type[Op.in].length + singleSR.type[Op.in].length);
    });

    it('returns an empty Op.in array for an invalid category', () => {
      const scope = withNotificationType(['invalidCategory']);
      expect(scope.type[Op.in]).toHaveLength(0);
    });

    it('returns an empty Op.in array for an empty array', () => {
      const scope = withNotificationType([]);
      expect(scope.type[Op.in]).toHaveLength(0);
    });
  });

  describe('withoutNotificationType', () => {
    it('maps systemRelated to an Op.notIn clause with system outage types', () => {
      const scope = withoutNotificationType(['systemRelated']);
      const types = scope.type[Op.notIn];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
          NOTIFICATION_TYPES.SYSTEM_UNPLANNED_OUTAGE,
        ])
      );
      expect(types).toHaveLength(NOTIFICATION_TYPE_MAP.systemRelated.length);
    });

    it('excludes types for all provided categories', () => {
      const scope = withoutNotificationType(['activityReport', 'collabReport']);
      const types = scope.type[Op.notIn];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
          NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
        ])
      );
    });

    it('returns an empty Op.notIn array for an invalid category', () => {
      const scope = withoutNotificationType(['invalidCategory']);
      expect(scope.type[Op.notIn]).toHaveLength(0);
    });
  });

  describe('NOTIFICATION_TYPE_MAP coverage', () => {
    it('includes every NOTIFICATION_TYPES value in at least one bucket', () => {
      const allMappedValues = new Set(Object.values(NOTIFICATION_TYPE_MAP).flat());
      const allNotificationTypeValues = Object.values(NOTIFICATION_TYPES) as string[];

      const missing = allNotificationTypeValues.filter((v) => !allMappedValues.has(v));

      expect(missing).toHaveLength(0);
    });
  });

  describe('integration — withNotificationType', () => {
    let user;
    let arNotification;
    let collabNotification;
    let trainingNotification;
    let systemNotification;
    let otherNotification;
    let allIds: number[];

    beforeAll(async () => {
      user = await User.create({
        id: faker.datatype.number({ min: 400000, max: 449999 }),
        name: faker.name.findName(),
        hsesUsername: faker.internet.userName(),
        hsesUserId: faker.datatype.uuid(),
        email: faker.internet.email(),
        role: ['Specialist'],
        lastLogin: new Date(),
      });

      arNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
      });
      collabNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
      });
      trainingNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.TRAINING_REPORT_POC_ADDED,
      });
      systemNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });
      otherNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.MONITORING_GOAL_ADDED,
      });

      allIds = [
        arNotification.id,
        collabNotification.id,
        trainingNotification.id,
        systemNotification.id,
        otherNotification.id,
      ];
    });

    afterAll(async () => {
      await Notification.destroy({ where: { id: allIds } });
      await User.destroy({ where: { id: user.id } });
    });

    it('returns only activityReport notifications for the activityReport category', async () => {
      const scope = withNotificationType(['activityReport']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(arNotification.id);
    });

    it('returns only collabReport notifications for the collabReport category', async () => {
      const scope = withNotificationType(['collabReport']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(collabNotification.id);
    });

    it('returns only trainingReport notifications for the trainingReport category', async () => {
      const scope = withNotificationType(['trainingReport']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(trainingNotification.id);
    });

    it('returns only systemRelated notifications for the systemRelated category', async () => {
      const scope = withNotificationType(['systemRelated']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(systemNotification.id);
    });

    it('returns only other notifications for the other category', async () => {
      const scope = withNotificationType(['other']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(otherNotification.id);
    });

    it('returns a union of matching notifications for multiple categories', async () => {
      const scope = withNotificationType(['activityReport', 'systemRelated']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(2);
      expect(found.map((n) => n.id)).toEqual(
        expect.arrayContaining([arNotification.id, systemNotification.id])
      );
    });

    it('returns no notifications for an empty category array', async () => {
      const scope = withNotificationType([]);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(0);
    });

    it('returns no notifications for an invalid category', async () => {
      const scope = withNotificationType(['invalidCategory']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found).toHaveLength(0);
    });
  });

  describe('integration — withoutNotificationType', () => {
    let user;
    let arNotification;
    let collabNotification;
    let trainingNotification;
    let systemNotification;
    let otherNotification;
    let allIds: number[];

    beforeAll(async () => {
      user = await User.create({
        id: faker.datatype.number({ min: 450000, max: 499999 }),
        name: faker.name.findName(),
        hsesUsername: faker.internet.userName(),
        hsesUserId: faker.datatype.uuid(),
        email: faker.internet.email(),
        role: ['Specialist'],
        lastLogin: new Date(),
      });

      arNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
      });
      collabNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
      });
      trainingNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.TRAINING_REPORT_POC_ADDED,
      });
      systemNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });
      otherNotification = await Notification.create({
        userId: user.id,
        type: NOTIFICATION_TYPES.MONITORING_GOAL_ADDED,
      });

      allIds = [
        arNotification.id,
        collabNotification.id,
        trainingNotification.id,
        systemNotification.id,
        otherNotification.id,
      ];
    });

    afterAll(async () => {
      await Notification.destroy({ where: { id: allIds } });
      await User.destroy({ where: { id: user.id } });
    });

    it('excludes activityReport notifications, returning all other categories', async () => {
      const scope = withoutNotificationType(['activityReport']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found.map((n) => n.id)).not.toContain(arNotification.id);
      expect(found.map((n) => n.id)).toEqual(
        expect.arrayContaining([
          collabNotification.id,
          trainingNotification.id,
          systemNotification.id,
          otherNotification.id,
        ])
      );
    });

    it('excludes systemRelated notifications, returning all non-system notifications', async () => {
      const scope = withoutNotificationType(['systemRelated']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found.map((n) => n.id)).not.toContain(systemNotification.id);
      expect(found.map((n) => n.id)).toEqual(
        expect.arrayContaining([
          arNotification.id,
          collabNotification.id,
          trainingNotification.id,
          otherNotification.id,
        ])
      );
    });

    it('excludes multiple categories, returning only the remaining ones', async () => {
      const scope = withoutNotificationType(['activityReport', 'collabReport']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found.map((n) => n.id)).not.toContain(arNotification.id);
      expect(found.map((n) => n.id)).not.toContain(collabNotification.id);
      expect(found.map((n) => n.id)).toEqual(
        expect.arrayContaining([
          trainingNotification.id,
          systemNotification.id,
          otherNotification.id,
        ])
      );
    });

    it('returns all test notifications when given an empty category array', async () => {
      const scope = withoutNotificationType([]);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining(allIds));
    });

    it('returns all test notifications when given an invalid category', async () => {
      const scope = withoutNotificationType(['invalidCategory']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: allIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining(allIds));
    });
  });
});
