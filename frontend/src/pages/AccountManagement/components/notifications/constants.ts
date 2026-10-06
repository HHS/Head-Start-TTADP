import type { EmailFrequencyValue } from '@ttahub/common/src/notifications';

// these keys should match the keys in /src/constants.js:USER_SETTINGS.EMAIL.VALUES
export const frequencyValues: { key: EmailFrequencyValue; label: string }[] = [
  { key: 'never', label: 'Do not notify me' },
  { key: 'immediately', label: 'Immediately' },
  { key: 'today', label: 'Daily digest' },
  { key: 'this week', label: 'Weekly digest' },
  { key: 'this month', label: 'Monthly digest' },
];
