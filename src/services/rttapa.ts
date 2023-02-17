interface ARResponse {
  legacyId: string,
  number: string,
  id: number,
  endDate: string,
}

interface ObjectiveResponse {
  id: number,
  title: string,
  arNumber: string,
  ttaProvided: string,
  endDate: string,
  reasons: string[],
  status: string,
  grantNumbers: string[];
  activityReports: ARResponse
}

interface GoalResponse {
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

interface RttapaResponse {
  id: number;
  goals: GoalResponse[];
  regionId: number;
  recipientId: number;
  notes: string;
}

interface NewRttapaRequest {
  goalIds: number[];
  recipientId: number;
  regionId: number;
  notes: string;
}

const mockGoals = [
  {
    id: 1,
    ids: [1, 2, 3],
    goalStatus: 'In Progress',
    createdOn: new Date(),
    goalText: 'Goal 1',
    goalNumbers: ['1', '2', '3'],
    objectiveCount: 3,
    goalTopics: ['Topic 1', 'Topic 2'],
    reasons: ['Reason 1', 'Reason 2'],
    previousStatus: 'Not Started',
    objectives: [
      {
        id: 1,
        title: 'Objective 1',
        arNumber: 'AR 1',
        ttaProvided: 'TTA 1',
        endDate: '2021-01-01',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: {
          legacyId: 'Legacy 1',
          number: 'AR 1',
          id: 1,
          endDate: '2021-01-01',
        },
      },
      {
        id: 2,
        title: 'Objective 2',
        arNumber: 'AR 2',
        ttaProvided: 'TTA 2',
        endDate: '2021-01-01',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: {
          legacyId: 'Legacy 2',
          number: 'AR 2',
          id: 2,
          endDate: '2021-01-01',
        },
      },
      {
        id: 3,
        title: 'Objective 3',
        arNumber: 'AR 3',
        ttaProvided: 'TTA 3',
        endDate: '2021-01-01',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: {
          legacyId: 'Legacy 3',
          number: 'AR 3',
          id: 3,
          endDate: '2021-01-01',
        },
      },
    ],
  },
  {
    id: 2,
    ids: [4, 5, 6],
    goalStatus: 'In Progress',
    createdOn: new Date(),
    goalText: 'Goal 2',
    goalNumbers: ['1', '2', '3'],
    objectiveCount: 3,
    goalTopics: ['Topic 1', 'Topic 2'],
    reasons: ['Reason 1', 'Reason 2'],
    previousStatus: 'Not Started',
    objectives: [],
  },
];

const mockRttapa = (
  id: number,
  regionId?: number,
  recipientId?: number,
): RttapaResponse => ({
  id,
  regionId: regionId || 1,
  recipientId: recipientId || 1,
  goals: mockGoals,
  notes: 'Notes',
});

export async function newRttapa(data: NewRttapaRequest): Promise<RttapaResponse> {
  return {
    id: 1,
    ...data,
    goals: mockGoals,
  };
}

export async function rttapa(reportId: number): Promise<RttapaResponse> {
  return mockRttapa(reportId);
}

export async function allRttapas(regionId: number, recipientId: number): Promise<RttapaResponse[]> {
  return [mockRttapa(1, regionId, recipientId), mockRttapa(2, regionId)];
}
