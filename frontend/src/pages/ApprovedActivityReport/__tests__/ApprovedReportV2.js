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
      courses: [],
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
        id: 1, status: '', note: '', user: { id: 1, fullName: 'John Q Fullname' },
      },

      {
        id: 2, status: '', note: 'note', user: { id: 2, fullName: 'John Smith' },
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
    language: [],
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

  it('renders a report with multiple steps', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      recipientNextSteps: [{
        note: 'First step',
        completeDate: '2021-01-01',
      },
      {
        note: 'Second step',
        completeDate: '2022-03-05',
      },
      {
        note: 'Third step',
        completeDate: '2022-03-05',
      }],
    }}
    />);
    expect(await screen.findByText(/First Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Second Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Third Step/i)).toBeInTheDocument();
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
      courses: [],
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
      courses: [],
    }];

    render(<ApprovedReportV2 data={{
      ...report, goalsAndObjectives: [], objectivesWithoutGoals, activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/None provided/i)).toBeInTheDocument();
  });

  it('hides the goal close anticipation date', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      goalsAndObjectives: [{
        name: 'Goal without close date',
        goalNumbers: ['1'],
        objectives: mockObjectives,
      }],
    }}
    />);
    expect(screen.queryAllByText(/anticipated close date/i).length).toBe(0);
  });

  it('shows the goal close date and goal source', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      goalsAndObjectives: [{
        name: 'Goal without close date',
        goalNumbers: ['1'],
        objectives: mockObjectives,
        endDate: '05/02/2023',
        activityReportGoals: [{
          endDate: '05/03/2023',
          source: null,
        }],
      }],
    }}
    />);
    expect(await screen.findByText(/anticipated close date/i)).toBeInTheDocument();
    expect(await screen.findByText('05/03/2023')).toBeInTheDocument();
    expect(await screen.findByText('Source')).toBeInTheDocument();
  });

  it('does not show the goal source label if there are no responses', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      goalsAndObjectives: [{
        name: 'Goal without close date',
        goalNumbers: ['1'],
        objectives: mockObjectives,
        endDate: '05/02/2023',
        activityReportGoals: [{
          endDate: '05/03/2023',
          source: null,
        }],
        prompts: [{
          title: 'FEI goal source',
          reportResponse: [],
        }],
      }],
    }}
    />);
    expect(screen.queryAllByText(/FEI goal source/i).length).toBe(0);
  });

  it('shows the goal source label if there are no responses', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      goalsAndObjectives: [{
        name: 'Goal without close date',
        goalNumbers: ['1'],
        objectives: mockObjectives,
        endDate: '05/02/2023',
        activityReportGoals: [{
          endDate: '05/03/2023',
          source: null,
        }],
        prompts: [{
          title: 'FEI goal source',
          reportResponse: ['response'],
        }],
      }],
    }}
    />);
    expect(screen.queryAllByText(/FEI goal source/i).length).toBe(1);
  });

  it('in person', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'in-person',
    }}
    />);

    expect(await screen.findByText(/In Person/i)).toBeInTheDocument();
  });

  it('language', async () => {
    render(<ApprovedReportV2 data={{
      ...report, language: ['Gobbledegook'],
    }}
    />);

    expect(await screen.findByText(/Gobbledegook/i)).toBeInTheDocument();
  });

  it('virtual', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'virtual', virtualDeliveryType: 'Sandwich', approvedAt: '2021-01-01',
    }}
    />);

    expect(await screen.findByText(/Virtual: Sandwich/i)).toBeInTheDocument();
  });

  it('hybrid', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'hybrid',
    }}
    />);

    expect(await screen.findByText('Hybrid')).toBeInTheDocument();
  });

  it('submitted date shown', async () => {
    render(<ApprovedReportV2 data={{
      ...report, submittedDate: '2023-01-09',
    }}
    />);
    expect(await screen.findByText(/Date submitted:/i)).toBeInTheDocument();
    expect(await screen.findByText('01/09/2023')).toBeInTheDocument();
  });

  it('submitted date hidden', async () => {
    render(<ApprovedReportV2 data={{
      ...report, submittedDate: null,
    }}
    />);
    expect(screen.queryAllByText(/Date submitted:/i).length).toBe(0);
  });

  it('renders without activity recipients', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      activityRecipients: [],
      activityRecipientType: 'other-entity',
    }}
    />);
    expect(await screen.findByText(/Other entities next steps/i)).toBeInTheDocument();
  });

  it('correctly displays recipient next steps', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      activityRecipientType: 'recipient',
      recipientNextSteps: [{
        note: 'First step',
        completeDate: '2021-01-01',
      },
      {
        note: 'Second step',
        completeDate: '2022-02-02',
      }],
      specialistNextSteps: [{
        note: 'Third step',
        completeDate: '2023-03-03',
      },
      {
        note: 'Fourth step',
        completeDate: '2024-04-04',
      }],
    }}
    />);
    expect(await screen.findByRole('heading', { name: /specialist's next steps/i })).toBeInTheDocument();
    expect(await screen.findByText(/First Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Second Step/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /recipient's next steps/i })).toBeInTheDocument();
    expect(await screen.findByText(/Third Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Fourth Step/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { name: /other entities next steps/i }).length).toBe(0);
  });

  it('correctly displays other-entity next steps', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      activityRecipientType: 'other-entity',
      recipientNextSteps: [{
        note: 'First step',
        completeDate: '2021-01-01',
      },
      {
        note: 'Second step',
        completeDate: '2022-02-02',
      }],
      specialistNextSteps: [{
        note: 'Third step',
        completeDate: '2023-03-03',
      },
      {
        note: 'Fourth step',
        completeDate: '2024-04-04',
      }],
    }}
    />);
    expect(await screen.findByRole('heading', { name: /other entities next steps/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /specialist's next steps/i })).toBeInTheDocument();
    expect(await screen.findByText(/First Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Second Step/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /other entities next steps/i })).toBeInTheDocument();
    expect(await screen.findByText(/Third Step/i)).toBeInTheDocument();
    expect(await screen.findByText(/Fourth Step/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { name: /recipient's next steps/i }).length).toBe(0);
  });
});
