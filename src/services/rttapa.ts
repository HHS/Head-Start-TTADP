import {
  NewRttapaRequest,
  RttapaResponse,
} from './types/rttapa';

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
        activityReports: [{
          legacyId: 'Legacy 1',
          number: 'AR 1',
          id: 1,
          endDate: '2021-01-01',
        }],
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
        activityReports: [
          {
            legacyId: 'Legacy 2',
            number: 'AR 2',
            id: 2,
            endDate: '2021-01-01',
          },
        ],
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
        activityReports: [{
          legacyId: 'Legacy 3',
          number: 'AR 3',
          id: 3,
          endDate: '2021-01-01',
        }],
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
  createdAt: new Date(),
  regionId: regionId || 1,
  recipientId: recipientId || 1,
  goals: mockGoals,
  notes: 'Notes',
  user: {
    id,
    name: `User ${id}`,
  },
});

export async function newRttapa(data: NewRttapaRequest): Promise<RttapaResponse> {
  return Promise.resolve({
    id: 1,
    ...data,
    createdAt: new Date(),
    user: {
      name: `User ${1}`,
      id: 1,
    },
    goals: mockGoals,
  });
}

export async function rttapa(reportId: number): Promise<RttapaResponse> {
  return Promise.resolve(mockRttapa(reportId));
}

export async function allRttapas(regionId: number, recipientId: number): Promise<RttapaResponse[]> {
  return Promise.resolve([mockRttapa(1, regionId, recipientId), mockRttapa(2, regionId)]);
}
