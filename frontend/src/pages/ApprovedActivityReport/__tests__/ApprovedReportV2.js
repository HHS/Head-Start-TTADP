import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import ApprovedReportV2 from '../../../components/ReportView/ApprovedReportV2';
import { OBJECTIVE_STATUS } from '../../../Constants';

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
    const noneProvided = await screen.findAllByText(/None provided/i);
    expect(noneProvided[0]).toBeInTheDocument();
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
    const noneProvided = await screen.findAllByText(/None provided/i);
    expect(noneProvided[0]).toBeInTheDocument();
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

  it('shows the courses label if there were selected courses', async () => {
    const thisMockObjective = mockObjectives[0];
    thisMockObjective.courses = [{ name: 'Course One' }];

    render(<ApprovedReportV2 data={{
      ...report,
      goalsAndObjectives: [{
        name: 'Goal without close date',
        goalNumbers: ['1'],
        objectives: [thisMockObjective],
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
    expect(screen.queryAllByText(/Courses/i).length).toBe(1);
  });

  it('displays "in person" delivery methods', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'in-person',
    }}
    />);

    expect(await screen.findByText(/In Person/i)).toBeInTheDocument();
  });

  it('displays the chosen language', async () => {
    render(<ApprovedReportV2 data={{
      ...report, language: ['Gobbledegook'],
    }}
    />);

    expect(await screen.findByText(/Gobbledegook/i)).toBeInTheDocument();
  });

  it('displays virtual delivery methods', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'virtual', virtualDeliveryType: 'Sandwich', approvedAt: '2021-01-01',
    }}
    />);

    expect(await screen.findByText(/Virtual: Sandwich/i)).toBeInTheDocument();
  });

  it('displays hybrid delivery methods', async () => {
    render(<ApprovedReportV2 data={{
      ...report, deliveryMethod: 'hybrid',
    }}
    />);

    expect(await screen.findByText('Hybrid')).toBeInTheDocument();
  });

  it('shows submitted date when present', async () => {
    render(<ApprovedReportV2 data={{
      ...report, submittedDate: '2023-01-09',
    }}
    />);
    expect(await screen.findByText(/Date submitted:/i)).toBeInTheDocument();
    expect(await screen.findByText('01/09/2023')).toBeInTheDocument();
  });

  it('hides null submitted dates', async () => {
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

  it('correctly displays objectives with citations', async () => {
    render(<ApprovedReportV2 data={{
      ...report,
      activityRecipients: [
        {
          id: 11074,
          activityRecipientId: 11074,
          name: 'R1 - GRANT1 - HS',
        },
        {
          id: 11966,
          activityRecipientId: 11966,
          name: 'R1 - GRANT2 - EHS',
        },
      ],
      goalsAndObjectives: [
        {
          id: 90740,
          name: '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.',
          status: GOAL_STATUS.IN_PROGRESS,
          endDate: '',
          isCurated: true,
          grantId: 11597,
          goalTemplateId: 24696,
          onAR: true,
          onApprovedAR: true,
          rtrOrder: 1,
          source: 'Federal monitoring issues, including CLASS and RANs',
          regionId: 1,
          recipientId: 1442,
          standard: 'Monitoring',
          prompts: [],
          statusChanges: [
            {
              oldStatus: GOAL_STATUS.NOT_STARTED,
            },
          ],
          activityReportGoals: [
            {
              endDate: null,
              id: 155612,
              activityReportId: 48418,
              goalId: 90740,
              isRttapa: null,
              name: '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.',
              status: GOAL_STATUS.IN_PROGRESS,
              timeframe: null,
              closeSuspendReason: null,
              closeSuspendContext: null,
              source: 'Federal monitoring issues, including CLASS and RANs',
              isActivelyEdited: false,
              originalGoalId: null,
            },
          ],
          objectives: [
            {
              id: 231994,
              otherEntityId: null,
              goalId: 90740,
              title: 'test',
              status: OBJECTIVE_STATUS.IN_PROGRESS,
              objectiveTemplateId: 565,
              onAR: true,
              onApprovedAR: true,
              createdVia: 'activityReport',
              rtrOrder: 1,
              value: 231994,
              ids: [
                231994,
                231995,
                231996,
              ],
              ttaProvided: '<p>tta</p>\n',
              supportType: 'Planning',
              isNew: false,
              arOrder: 1,
              objectiveCreatedHere: true,
              topics: [],
              resources: [],
              files: [],
              courses: [],
              citations: [
                {
                  id: 200205,
                  activityReportObjectiveId: 241644,
                  citation: '1302.12(k)',
                  monitoringReferences: [
                    {
                      acro: 'AOC',
                      name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
                      grantId: 11966,
                      citation: '1302.12(k)',
                      severity: 3,
                      findingId: '8D18F077-CD6F-4869-AB21-E76EB682433B',
                      reviewName: '230706F2',
                      standardId: 200205,
                      findingType: 'Area of Concern',
                      grantNumber: '01CH011566',
                      findingSource: 'Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
                      reportDeliveryDate: '2023-06-26T04:00:00+00:00',
                      monitoringFindingStatusName: 'Active',
                    },
                  ],
                  name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
                },
              ],
            },
          ],
          isSourceEditable: true,
          goalNumber: 'G-90740',
          promptsForReview: [],
          isNew: false,
          goalNumbers: [
            'G-90740',
            'G-90683',
            'G-90846',
          ],
          goalIds: [
            90740,
            90683,
            90846,
          ],
          grantIds: [
            11597,
            11074,
            11966,
          ],
          collaborators: [
            {
              goalNumber: 'G-90683',
            },
          ],
          isReopenedGoal: false,
        },
      ],
    }}
    />);

    expect(await screen.findByTestId('review-citation-label')).toHaveTextContent('R1 - GRANT2 - EHS');
    expect(await screen.findByTestId('review-citation-listitem')).toHaveTextContent('AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance');
  });
});
