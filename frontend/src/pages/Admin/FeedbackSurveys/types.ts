export type SurveyStatus = 'active' | 'closed';

export interface SurveyQuestion {
  id: number;
  questionText: string;
  order: number;
}

export interface SurveyDefinition {
  id: number;
  pageId: string;
  startDate: string;
  // null = open until an admin closes it manually
  endDate: string | null;
  status: SurveyStatus;
  closedAt: string | null;
  createdAt: string;
  responseCount: number;
  questions: SurveyQuestion[];
}

export interface SurveyDefinitionList {
  active: SurveyDefinition[];
  closed: SurveyDefinition[];
  pages: Record<string, string>;
}

export interface SurveyDateFormValues {
  manualClose: boolean;
  startDate: string;
  endDate: string;
}

// Request body for the survey window: a date range, or manualClose to open today with no end date
export type SurveySchedulePayload = { manualClose: true } | { startDate: string; endDate: string };
