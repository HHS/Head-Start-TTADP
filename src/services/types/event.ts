export type EventShape = {
  id: number;
  ownerId: number;
  pocId: number;
  collaboratorIds: number[];
  regionId: number;
  data: unknown;
  updatedAt: string;
  sessionReports: unknown[];
};

export type CreateEventRequest = {
  ownerId: number;
  pocId: number;
  collaboratorIds: number[];
  regionId: number;
  data: unknown;
};

export type UpdateEventRequest = CreateEventRequest;
