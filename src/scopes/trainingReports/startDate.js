import { afterDateScope, beforeDateScope, withinDateScope } from './dateUtils';

export function beforeStartDate(date) {
  return beforeDateScope('startDate', date);
}

export function afterStartDate(date) {
  return afterDateScope('startDate', date);
}

export function withinStartDates(dates) {
  return withinDateScope('startDate', dates);
}
