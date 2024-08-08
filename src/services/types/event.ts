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
  };
};

export type UpdateEventRequest = CreateEventRequest;

export type TRAlertShape = {
  id: number;
  eventId: string;
  eventName: string;
  alertType: 'noSessionsCreated' | 'missingEventInfo' | 'missingSessionInfo' | 'eventNotCompleted';
  sessionName: string;
  isSession: boolean;
};
