export interface ARResponse {
  legacyId: string,
  number: string,
  id: number,
  endDate: string,
}

export interface ObjectiveResponse {
  id: number,
  title: string,
  arNumber: string,
  ttaProvided: string,
  endDate: string,
  reasons: string[],
  status: string,
  grantNumbers: string[];
  activityReports: ARResponse[],
}

export interface GoalResponse {
  id: number;
  ids: number[];
  goalStatus: string;
  createdOn: Date;
  goalText: string;
  goalNumbers: string[];
  objectiveCount: number;
  goalTopics: string[];
  reasons: string[];
  previousStatus: string;
  objectives: ObjectiveResponse[];
}

export interface RttapaResponse {
  id: number;
  goals: GoalResponse[];
  regionId: number;
  recipientId: number;
  notes: string;
  user: {
    id: number;
    name: string;
  }
  createdAt: Date;
}

export interface NewRttapaRequest {
  goalIds: number[];
  recipientId: number;
  regionId: number;
  notes: string;
}
