/* eslint-disable import/prefer-default-export */
import moment from 'moment';

export function formatDate(fieldName) {
  const raw = this.getDataValue(fieldName);
  if (raw) {
    return moment(raw).format('MM/DD/YYYY');
  }
  return null;
}
