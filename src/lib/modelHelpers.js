/* eslint-disable import/prefer-default-export */
import { DateTime } from 'luxon';

export function formatDate(fieldName) {
  const raw = this.getDataValue(fieldName);
  if (raw) {
    const parsed = DateTime.fromJSDate(new Date(raw));
    if (parsed.isValid) {
      return parsed.toFormat('MM/dd/yyyy');
    }
  }
  return null;
}
