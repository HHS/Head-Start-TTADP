import { TRAINING_REPORT_STATUSES } from '@ttahub/common';

type TRStatusType = TRAINING_REPORT_STATUSES.NOT_STARTED
| TRAINING_REPORT_STATUSES.IN_PROGRESS
| TRAINING_REPORT_STATUSES.COMPLETED
| TRAINING_REPORT_STATUSES.SUSPENDED;

export type SessionShape = {
  id: number;
  data: {
    sessionName: string;
    status: string;
    endDate: string;
    startDate: string;
    courses?: string[];
    useIpdCourses: boolean;
    isIstVisit: 'yes' | 'no';
    regionalOfficeTta?: string;
    participants?: { value: string; label: string }[];
    nextSteps: { completeDate: string, note: string }[];
  }
};

type EventReportPilotNationalCenterUserType = {
  id: number;
  eventReportPilotId: number;
  nationalCenterId: number;
  nationalCenterName: string;
  userName: string;
  userId: number;
};

export type EventShape = {
  id: number;
  ownerId: number;
  pocIds: number[];
  collaboratorIds: number[];
  regionId: number;
  data: {
    startDate: string;
    endDate: string;
    status: string;
    eventId: string;
    eventName: string;
  };
  updatedAt: string;
  sessionReports: SessionShape[];
  owner: undefined | { id: string; name: string; email: string };
  eventReportPilotNationalCenterUsers: EventReportPilotNationalCenterUserType[];
};

export type CreateEventRequest = {
  ownerId: number;
  pocIds: number;
  collaboratorIds: number[];
  regionId: number;
  data: {
    owner: undefined | { id: string; name: string; email: string }
    status: TRStatusType;
  };
};

export type UpdateEventRequest = CreateEventRequest;

export type TRAlertShape = {
  id: number;
  eventId: string;
  eventName: string;
  alertType: 'noSessionsCreated' | 'missingEventInfo' | 'missingSessionInfo' | 'eventNotCompleted';
  eventStatus: TRStatusType;
  sessionName: string;
  sessionId: number | false;
  isSession: boolean;
  ownerId: number;
  pocIds: number[];
  collaboratorIds: number[];
  startDate: string;
  endDate: string;
};
