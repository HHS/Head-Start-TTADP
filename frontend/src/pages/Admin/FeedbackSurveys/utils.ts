import moment from 'moment';
import { DATE_DISPLAY_FORMAT, DATEPICKER_VALUE_FORMAT } from '../../../Constants';
import type { SurveyDateFormValues, SurveySchedulePayload } from './types';

// The API stores DATEONLY values (YYYY-MM-DD); the date pickers work in MM/DD/YYYY
export const toApiDate = (displayDate: string): string =>
  moment(displayDate, DATE_DISPLAY_FORMAT).format(DATEPICKER_VALUE_FORMAT);

export const toDisplayDate = (apiDate: string | null | undefined): string =>
  apiDate ? moment(apiDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';

export const todayDisplayDate = (): string => moment().format(DATE_DISPLAY_FORMAT);

export const MANUAL_CLOSE_END_LABEL = 'Until closed';

export const toDisplayEndDate = (apiDate: string | null): string =>
  apiDate ? toDisplayDate(apiDate) : MANUAL_CLOSE_END_LABEL;

export const toSchedulePayload = ({ manualClose, startDate, endDate }: SurveyDateFormValues): SurveySchedulePayload =>
  manualClose ? { manualClose: true } : { startDate: toApiDate(startDate), endDate: toApiDate(endDate) };

export const pageLabel = (pages: Record<string, string>, pageId: string): string => pages[pageId] || pageId;

// Error bodies from the admin API look like { error: 'message' }
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { data?: { error?: string } })?.data;
  return data?.error || fallback;
};
