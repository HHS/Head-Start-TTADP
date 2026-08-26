import { afterDateScope, beforeDateScope, withinDateScope } from './dateUtils';

export function beforeEndDate(date) {
  return beforeDateScope('endDate', date);
}

export function afterEndDate(date) {
  return afterDateScope('endDate', date);
}

export function withinEndDates(dates) {
  return withinDateScope('endDate', dates);
}
