import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import ApprovedReportV1, { calculateGoalsAndObjectives } from '../components/ApprovedReportV1';

describe('Approved Activity Report V1 component', () => {
  const title = 'Gabba Gabba Hey';
  const ttaProvided = 'We did a thing';

  const report = {
    version: 1,
    regionId: 45,
    activityRecipients: [
      { name: 'Tim', grantId: 400 },
      { name: 'Tina', grantId: 401 },
    ],
    displayId: 'Boat',
    author: {
      fullName: 'Captain Tim Tina Boat',
    },
    activityReportCollaborators: [
      {
        fullName: 'Test',
        user: { fullName: 'Test' },
      },
      {
        fullName: 'Test 2',
        user: { fullName: 'Test 2' },
      }],
    approvers: [
      {
        id: 1, status: '', note: '', User: { id: 1, fullName: 'John Q Fullname' },
      },

      {
        id: 2, status: '', note: 'note', User: { id: 2, fullName: 'John Smith' },
      },
    ],
    targetPopulations: ['Mid size sedans'],
    activityRecipientType: 'recipient',
    specialistNextSteps: [],
    recipientNextSteps: [{
      note: 'Test me',
      completeDate: '2021-01-01',
    }],
    participants: ['Commander of Pants', 'Princess of Castles'],
    numberOfParticipants: 3,
    reason: ['Needed it'],
    startDate: '1968-08-01',
    endDate: '1969-08-02',
    duration: 6.5,
    ttaType: ['training'],
    virtualDeliveryType: 'Phone',
    requester: 'recipient',
    topics: ['Tea', 'cookies'],
    ECLKCResourcesUsed: ['http://website'],
    nonECLKCResourcesUsed: ['http://betterwebsite'],
    files: [],
    context: '',
    goalsAndObjectives: [],
    objectivesWithoutGoals: [
      {
        id: 1234,
        otherEntityId: 10,
        goalId: null,
        title,
        status: 'Complete',
        onAR: true,
        onApprovedAR: true,
        topics: [],
        resources: [],
        files: [],
        value: 17762,
        ids: [
          17762,
        ],
        ttaProvided,
        arOrder: 1,
      },
    ],
    additionalNotes: '',
  };

  it('should return an array of two arrays, each of which contains strings', () => {
    const result = calculateGoalsAndObjectives({ ...report, title, ttaProvided });
    expect(result).toStrictEqual([
      [
        'Objective 1',
        'TTA Provided 1',
      ],
      [
        title,
        ttaProvided,
      ],
    ]);
  });
  it('submitted date shown', async () => {
    render(<ApprovedReportV1 data={{
      ...report, submittedDate: '2023-01-09',
    }}
    />);
    expect(await screen.findByText(/Date submitted:/i)).toBeInTheDocument();
    expect(await screen.findByText('01/09/2023')).toBeInTheDocument();
  });

  it('submitted date hidden', async () => {
    render(<ApprovedReportV1 data={{
      ...report, submittedDate: null,
    }}
    />);
    expect(screen.queryAllByText(/Date submitted:/i).length).toBe(0);
  });

  it('renders without topics', async () => {
    render(<ApprovedReportV1 data={{
      ...report, topics: null, submittedDate: '2023-01-09',
    }}
    />);
    expect(await screen.findByRole('heading', { name: /tta activity report boat/i })).toBeInTheDocument();
    expect(await screen.findByText(/Date submitted:/i)).toBeInTheDocument();
    expect(await screen.findByText('01/09/2023')).toBeInTheDocument();
    expect(await screen.findByText(/Topics/i)).toBeInTheDocument();
  });

  it('renders without author', async () => {
    render(<ApprovedReportV1 data={{
      ...report, submittedDate: '2023-01-09', author: null,
    }}
    />);
    expect(await screen.findByRole('heading', { name: /tta activity report boat/i })).toBeInTheDocument();
    expect(await screen.findByText(/Date submitted:/i)).toBeInTheDocument();
    expect(await screen.findByText('01/09/2023')).toBeInTheDocument();
    expect(await screen.findByText(/Topics/i)).toBeInTheDocument();
  });

  it('renders different tta types', async () => {
    // Technical assistance.
    render(<ApprovedReportV1 data={{
      ...report, ttaType: ['technical-assistance'],
    }}
    />);
    expect(await screen.findByText('Technical Assistance, Virtual (Phone)')).toBeInTheDocument();

    // Both.
    render(<ApprovedReportV1 data={{
      ...report, ttaType: ['technical-assistance', 'training'],
    }}
    />);
    expect(await screen.findByText('Training and Technical Assistance, Virtual (Phone)')).toBeInTheDocument();
  });

  it('renders approved at', async () => {
    render(<ApprovedReportV1 data={{
      ...report, approvedAt: '2023-02-15',
    }}
    />);
    expect(await screen.findByText(/Date approved:/i)).toBeInTheDocument();
    expect(screen.queryAllByText('02/15/2023').length).toBe(2);
  });

  it('renders other entity', async () => {
    render(<ApprovedReportV1 data={{
      ...report, activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/Other entities/i)).toBeInTheDocument();
  });

  it('renders without resources', async () => {
    render(<ApprovedReportV1 data={{
      ...report, ECLKCResourcesUsed: null, nonECLKCResourcesUsed: null,
    }}
    />);
    expect(await screen.findByText('OHS / ECLKC resources')).toBeInTheDocument();
    expect(await screen.findByText('Non-ECLKC resources')).toBeInTheDocument();
  });
});
