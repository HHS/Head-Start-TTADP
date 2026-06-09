import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';

const VALID_TYPES = ['activityReport', 'collabReport', 'trainingReport', 'systemRelated', 'other'];

const KEY_TO_CATEGORY: [string, string][] = [
  ['ACTIVITY_REPORT_', 'activityReport'],
  ['COLLAB_REPORT_', 'collabReport'],
  ['TRAINING_REPORT_', 'trainingReport'],
  ['SYSTEM_', 'systemRelated'],
];

export const NOTIFICATION_TYPE_MAP: Record<string, string[]> = Object.entries(
  NOTIFICATION_TYPES
).reduce(
  (acc, [key, value]) => {
    const category = KEY_TO_CATEGORY.find(([prefix]) => key.startsWith(prefix))?.[1] ?? 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(value as string);
    return acc;
  },
  {} as Record<string, string[]>
);

function filterToNotificationTypes(types: string[]): string[] {
  const resolved = types
    .filter((t) => VALID_TYPES.includes(t))
    .flatMap((t) => NOTIFICATION_TYPE_MAP[t] ?? []);
  return Array.from(new Set(resolved));
}

export function withNotificationType(notificationTypes: string[]) {
  return {
    type: {
      [Op.in]: filterToNotificationTypes(notificationTypes),
    },
  };
}

export function withoutNotificationType(notificationTypes: string[]) {
  return {
    type: {
      [Op.notIn]: filterToNotificationTypes(notificationTypes),
    },
  };
}
