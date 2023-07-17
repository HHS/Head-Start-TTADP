export type EventShape = {
  id: number;
  ownerId: number;
  pocId: number;
  collaboratorIds: number[];
  regionId: number;
  data: unknown;
  updatedAt: string;
  sessionReports: unknown[];
  owner: undefined | { id: string; name: string; email: string };
};

export type CreateEventRequest = {
  ownerId: number;
  pocId: number;
  collaboratorIds: number[];
  regionId: number;
  data: unknown;
};

export type UpdateEventRequest = CreateEventRequest;
