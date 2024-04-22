export type SessionShape = {
  id: number;
  data: {
    status: string;
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
  data: unknown;
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
