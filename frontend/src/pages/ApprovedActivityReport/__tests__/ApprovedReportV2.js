import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';

import ApprovedReportV2 from '../components/ApprovedReportV2';

describe('Approved Activity Report V2 component', () => {
  const mockObjectives = [
    {
      title: 'Objective 1',
      ActivityReportObjective: {
        ttaProvided: 'All of it',
      },
      topics: [{ label: 'being fancy' }],
      resources: [{ value: 'http://www.website.com', url: 'http://www.OtherEntity.com' }],
      status: 'Test status',
      files: [
        {
          url: { url: 'http://www.website.com' },
          originalFileName: 'file.pdf',
        },
      ],
    },
  ];
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
    goalsAndObjectives: [{
      name: 'Goal 1',
      goalNumbers: ['1', '3'],
      objectives: mockObjectives,
    },
    {
      name: 'Goal 2',
      goalNumbers: ['2'],
      objectives: mockObjectives,
    }],
    objectivesWithoutGoals: [],
    additionalNotes: '',
  };

  it('renders a report with multiple goals', async () => {
    render(<ApprovedReportV2 data={report} />);
    expect(await screen.findByText(/Goal 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Goal 2/i)).toBeInTheDocument();
  });

  it('renders an other entity report', async () => {
    render(<ApprovedReportV2 data={{
      ...report, goalsAndObjectives: [], objectivesWithoutGoals: mockObjectives, activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/http:\/\/www.otherentity.com/i)).toBeInTheDocument();
    expect(await screen.findByText(/Objective 1/i)).toBeInTheDocument();
  });

  it('shows the none provided message', async () => {
    const objectivesWithoutGoals = [{
      title: 'Objective 1',
      ActivityReportObjective: {
        ttaProvided: 'All of it',
      },
      topics: [{ label: 'being fancy' }],
      resources: [{ value: 'http://www.website.com' }],
      status: 'Test status',
      files: [],
    }];

    render(<ApprovedReportV2 data={{
      ...report, goalsAndObjectives: [], objectivesWithoutGoals, activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/None provided/i)).toBeInTheDocument();
  });

  it('handles empty resources', async () => {
    const objectivesWithoutGoals = [{
      title: 'Objective 1',
      ActivityReportObjective: {
        ttaProvided: 'All of it',
      },
      topics: [{ label: 'being fancy' }],
      resources: [],
      status: 'Test status',
      files: [],
    }];

    render(<ApprovedReportV2 data={{
      ...report, goalsAndObjectives: [], objectivesWithoutGoals, activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/None provided/i)).toBeInTheDocument();
  });

  it('in person', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'in-person',
    }}
    />);

    expect(await screen.findByText(/In person/i)).toBeInTheDocument();
  });

  it('virtual', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'virtual', virtualDeliveryType: 'Sandwich', approvedAt: '2021-01-01',
    }}
    />);

    expect(await screen.findByText(/Virtual: Sandwich/i)).toBeInTheDocument();
  });
});
