import { USER_SETTINGS } from '@ttahub/common';
import type { EmailFrequencyValue } from '@ttahub/common/src/notifications';

export const frequencyValues: { key: EmailFrequencyValue; label: string }[] = [
  { key: USER_SETTINGS.EMAIL.VALUES.NEVER, label: 'Do not notify me' },
  { key: USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY, label: 'Immediately' },
  { key: USER_SETTINGS.EMAIL.VALUES.DAILY_DIGEST, label: 'Daily digest' },
  { key: USER_SETTINGS.EMAIL.VALUES.WEEKLY_DIGEST, label: 'Weekly digest' },
  { key: USER_SETTINGS.EMAIL.VALUES.MONTHLY_DIGEST, label: 'Monthly digest' },
];
