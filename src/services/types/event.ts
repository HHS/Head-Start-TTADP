export type SessionShape = {
  id: number;
  data: {
    status: string;
  }
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
