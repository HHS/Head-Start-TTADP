/* eslint-disable import/prefer-default-export */
import { format, parseISO, isValid } from 'date-fns';

export function formatDate(fieldName) {
  const raw = this.getDataValue(fieldName);
  if (raw) {
    const date = typeof raw === 'string' ? parseISO(raw) : raw;
    if (isValid(date)) {
      return format(date, 'MM/dd/yyyy');
    }
  }
  return null;
}
