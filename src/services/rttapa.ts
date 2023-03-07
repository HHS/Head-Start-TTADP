import faker from '@faker-js/faker';
import {
  NewRttapaRequest,
  RttapaResponse,
} from './types/rttapa';

const mockGoals = [
  {
    id: 1,
    ids: [1, 2, 3],
    goalStatus: 'Not Started',
    createdOn: new Date(),
    goalText: 'The active and engaged Head Start Association provides leadership within the state early childhood community and the state Head Start and Early Head Start community.',
    goalNumbers: ['19160'],
    objectiveCount: 3,
    goalTopics: ['Human Resources', 'Parent and Family Engagements'],
    reasons: ['Ongoing Quality Improvement'],
    previousStatus: 'null',
    isRttapa: 'Yes',
    objectives: [
      {
        id: 1,
        title: 'The Grantee Specialist (GS) team will support the directors to set a clear direction for the Head Start Association for the next three years.',
        arNumber: 'AR 1',
        ttaProvided: 'TTA 1',
        endDate: '01/01/2021',
        reasons: ['Ongoing Quality Improvement'],
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
        title: 'TA staff will provide an opportunity for participants to discuss EPRR planning strategies with other GRs throughout the region.',
        arNumber: 'AR 2',
        ttaProvided: 'TTA 2',
        endDate: '01/01/2021',
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
        title: 'Health Specialist (HS) will present, in detail, the three phases of Emergency Management and the planning components included in each phase.',
        arNumber: 'AR 3',
        ttaProvided: 'TTA 3',
        endDate: '01/01/2021',
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
    id: 34184,
    ids: [34184],
    goalStatus: 'In Progress',
    createdOn: new Date(),
    goalText: 'The HS/EHS Director will have the knowledge, skills and resources needed to be effective in her new role',
    goalNumbers: ['G-34184'],
    objectiveCount: 0,
    goalTopics: ['Community and Self Asssesment'],
    reasons: ['Reason 1', 'Reason 2'],
    previousStatus: 'Not Started',
    objectives: [],
    isRttapa: 'Yes',
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
    name: faker.name.findName(),
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
