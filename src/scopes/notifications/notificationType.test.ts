import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import {
  NOTIFICATION_TYPE_MAP,
  withNotificationType,
  withoutNotificationType,
} from './notificationType';

describe('notifications/notificationType scope', () => {
  describe('withNotificationType', () => {
    it('maps activityReport to all activity report notification types', () => {
      const scope = withNotificationType(['activityReport']);
      const types = scope.notificationType[Op.in];

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
      const types = scope.notificationType[Op.in];

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
      const types = scope.notificationType[Op.in];

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
      const types = scope.notificationType[Op.in];

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
      const types = scope.notificationType[Op.in];

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

      const combinedTypes = combined.notificationType[Op.in];
      expect(combinedTypes).toHaveLength(
        singleAR.notificationType[Op.in].length + singleSR.notificationType[Op.in].length
      );
    });

    it('returns an empty Op.in array for an invalid category', () => {
      const scope = withNotificationType(['invalidCategory']);
      expect(scope.notificationType[Op.in]).toHaveLength(0);
    });

    it('returns an empty Op.in array for an empty array', () => {
      const scope = withNotificationType([]);
      expect(scope.notificationType[Op.in]).toHaveLength(0);
    });
  });

  describe('withoutNotificationType', () => {
    it('maps systemRelated to an Op.notIn clause with system outage types', () => {
      const scope = withoutNotificationType(['systemRelated']);
      const types = scope.notificationType[Op.notIn];

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
      const types = scope.notificationType[Op.notIn];

      expect(types).toEqual(
        expect.arrayContaining([
          NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
          NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
        ])
      );
    });

    it('returns an empty Op.notIn array for an invalid category', () => {
      const scope = withoutNotificationType(['invalidCategory']);
      expect(scope.notificationType[Op.notIn]).toHaveLength(0);
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
});
