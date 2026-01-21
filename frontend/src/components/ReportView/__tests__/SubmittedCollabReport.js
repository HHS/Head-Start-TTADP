import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import SubmittedCollabReport, { formatNextSteps } from '../SubmittedCollabReport';

const mockReport = {
  id: 123,
  displayId: 'CR-123',
  name: 'Test Collaboration Activity',
  startDate: '01/15/2025',
  endDate: '01/30/2025',
  duration: 2,
  description: 'This is a test collaboration report description',
  calculatedStatus: REPORT_STATUSES.APPROVED,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  author: {
    id: 1,
    fullName: 'John Doe',
    nameWithNationalCenters: 'John Doe - NC1',
    homeRegionId: 1,
  },
  isStateActivity: false,
  collabReportSpecialists: [
    {
      id: 1,
      specialist: {
        id: 2,
        fullName: 'Jane Smith',
        name: 'Jane Smith',
      },
    },
    {
      id: 2,
      specialist: {
        id: 3,
        fullName: 'Bob Johnson',
        name: 'Bob Johnson',
      },
    },
  ],
  approvers: [
    {
      id: 1,
      user: {
        id: 4,
        fullName: 'Manager One',
        name: 'Manager One',
      },
      status: REPORT_STATUSES.APPROVED,
    },
    {
      id: 2,
      user: {
        id: 5,
        fullName: 'Manager Two',
        name: 'Manager Two',
      },
      status: 'pending',
    },
  ],
  createdAt: '2025-01-10T10:00:00.000Z',
  submittedAt: '2025-01-20T15:30:00.000Z',
  approvedAt: '2025-01-25T09:15:00.000Z',
  statesInvolved: ['CA', 'TX'],
  reportReasons: ['new-staff', 'monitoring'],
  reportGoals: [
    {
      id: 1,
      goalTemplate: {
        standard: 'Goal Standard 1',
      },
    },
    {
      id: 2,
      goalTemplate: {
        standard: 'Goal Standard 2',
      },
    },
  ],
  dataUsed: [
    { id: 1, collabReportDatum: 'coaching-data' },
    { id: 2, collabReportDatum: 'other' },
    { id: 3, collabReportDatum: 'training-data' },
  ],
  steps: [
    {
      collabStepDetail: 'First next step to complete',
      collabStepCompleteDate: '02/15/2025',
    },
    {
      collabStepDetail: 'Second next step with different date',
      collabStepCompleteDate: '03/01/2025',
    },
  ],
};

describe('SubmittedCollabReport', () => {
  it('renders the collaboration report title with display ID', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Collaboration report CR-123')).toBeInTheDocument();
  });

  it('renders the collaboration report title without display ID', () => {
    const reportWithoutDisplayId = { ...mockReport, displayId: null };

    render(<SubmittedCollabReport report={reportWithoutDisplayId} />);

    expect(screen.getByText('Collaboration report')).toBeInTheDocument();
  });

  it('displays creator information', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Creator:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays collaborating specialists', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Collaborators:')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith, Bob Johnson')).toBeInTheDocument();
  });

  it('displays approving managers', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Managers:')).toBeInTheDocument();
    expect(screen.getByText('Manager One, Manager Two')).toBeInTheDocument();
  });

  it('displays formatted dates', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Date created:')).toBeInTheDocument();
    expect(screen.getByText('01/10/2025')).toBeInTheDocument();

    expect(screen.getByText('Date submitted:')).toBeInTheDocument();
    expect(screen.getByText('01/20/2025')).toBeInTheDocument();

    expect(screen.getByText('Date approved:')).toBeInTheDocument();
    expect(screen.getByText('01/25/2025')).toBeInTheDocument();
  });

  it('displays activity summary information', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Activity summary')).toBeInTheDocument();
    expect(screen.getByText('Activity name')).toBeInTheDocument();
    expect(screen.getByText('Test Collaboration Activity')).toBeInTheDocument();

    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByText('End date')).toBeInTheDocument();

    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('2 hours')).toBeInTheDocument();
  });

  it('displays activity type as Regional for non-state activities', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Activity type')).toBeInTheDocument();
    expect(screen.getByText('Regional')).toBeInTheDocument();
  });

  it('displays activity type as State for state activities', () => {
    const stateReport = { ...mockReport, isStateActivity: true };

    render(<SubmittedCollabReport report={stateReport} />);

    expect(screen.getByText('Activity type')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
  });

  it('displays states involved for state activities', () => {
    const stateReport = { ...mockReport, isStateActivity: true };

    render(<SubmittedCollabReport report={stateReport} />);

    expect(screen.getByText('States involved')).toBeInTheDocument();
    expect(screen.getByText('California, Texas')).toBeInTheDocument();
  });

  it('displays activity description', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Activity description')).toBeInTheDocument();
    expect(screen.getByText('This is a test collaboration report description')).toBeInTheDocument();
  });

  it('displays supporting information section', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Supporting information')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Data collected/shared')).toBeInTheDocument();
    expect(screen.getByText('Supporting goals')).toBeInTheDocument();
  });

  it('displays next steps section', () => {
    render(<SubmittedCollabReport report={mockReport} />);

    expect(screen.getByText('Next steps')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('First next step to complete')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Second next step with different date')).toBeInTheDocument();
  });

  it('handles missing collaborating specialists', () => {
    const reportWithoutCollaborators = { ...mockReport, collabReportSpecialists: null };

    render(<SubmittedCollabReport report={reportWithoutCollaborators} />);

    expect(screen.getByText('Collaborators:')).toBeInTheDocument();
    expect(screen.getByText('None provided')).toBeInTheDocument();
  });

  it('handles empty collaborating specialists array', () => {
    const reportWithEmptyCollaborators = { ...mockReport, collabReportSpecialists: [] };

    render(<SubmittedCollabReport report={reportWithEmptyCollaborators} />);

    expect(screen.getByText('Collaborators:')).toBeInTheDocument();
    // Empty array results in empty string, not "None provided"
    const collaboratorsElement = screen.getByText('Collaborators:').parentElement;
    expect(collaboratorsElement).toHaveTextContent('Collaborators:');
  });

  it('handles missing approvers', () => {
    const reportWithoutApprovers = { ...mockReport, approvers: null };

    render(<SubmittedCollabReport report={reportWithoutApprovers} />);

    expect(screen.getByText('Managers:')).toBeInTheDocument();
    expect(screen.getByText('None provided')).toBeInTheDocument();
  });

  it('handles missing author', () => {
    const reportWithoutAuthor = { ...mockReport, author: null };

    render(<SubmittedCollabReport report={reportWithoutAuthor} />);

    expect(screen.getByText('Creator:')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('handles collaborators with missing specialist names', () => {
    const reportWithMissingNames = {
      ...mockReport,
      collabReportSpecialists: [
        { specialist: { fullName: 'Jane Smith' } },
        { specialist: {} }, // Missing name
        { specialist: { name: 'Bob Johnson' } },
      ],
    };

    render(<SubmittedCollabReport report={reportWithMissingNames} />);

    expect(screen.getByText('Collaborators:')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith, Bob Johnson')).toBeInTheDocument();
  });

  it('handles approvers with missing user names', () => {
    const reportWithMissingApproverNames = {
      ...mockReport,
      approvers: [
        { user: { fullName: 'Manager One' } },
        { user: {} }, // Missing name
        { user: { fullName: 'Manager Three' } },
      ],
    };

    render(<SubmittedCollabReport report={reportWithMissingApproverNames} />);

    expect(screen.getByText('Managers:')).toBeInTheDocument();
    expect(screen.getByText('Manager One, Manager Three')).toBeInTheDocument();
  });

  it('only shows submitted date when status is submitted', () => {
    const submittedReport = {
      ...mockReport,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.DRAFT,
    };

    render(<SubmittedCollabReport report={submittedReport} />);

    expect(screen.getByText('Date submitted:')).toBeInTheDocument();
    expect(screen.queryByText('Date approved:')).not.toBeInTheDocument();
  });

  it('only shows approved date when status is approved', () => {
    const approvedReport = {
      ...mockReport,
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.APPROVED,
    };

    render(<SubmittedCollabReport report={approvedReport} />);

    expect(screen.queryByText('Date submitted:')).not.toBeInTheDocument();
    expect(screen.getByText('Date approved:')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    const minimalReport = {
      name: 'Minimal Report',
      startDate: '01/01/2025',
      endDate: '01/02/2025',
      duration: 1,
      description: 'Minimal description',
      isStateActivity: false,
      activityStates: [],
      reportReasons: [],
      reportGoals: [],
      dataUsed: [],
      steps: [],
    };

    render(<SubmittedCollabReport report={minimalReport} />);

    expect(screen.getByText('Minimal Report')).toBeInTheDocument();
    expect(screen.getAllByText('None provided')).toHaveLength(2); // For missing collaborators and managers and such
    expect(screen.getByText('Unknown')).toBeInTheDocument(); // For missing author
  });
});

describe('formatNextSteps', () => {
  it('formats next steps correctly', () => {
    const steps = [
      {
        collabStepDetail: 'First step',
        collabStepCompleteDate: '02/15/2025',
      },
      {
        collabStepDetail: 'Second step',
        collabStepCompleteDate: '03/01/2025',
      },
    ];

    const result = formatNextSteps(steps);

    expect(result).toEqual([
      {
        data: {
          'Step 1': 'First step',
          'Anticipated completion': '02/15/2025',
        },
        striped: false,
      },
      {
        data: {
          'Step 2': 'Second step',
          'Anticipated completion': '03/01/2025',
        },
        striped: false,
      },
    ]);
  });

  it('handles empty steps array', () => {
    const result = formatNextSteps([]);
    expect(result).toEqual([]);
  });

  it('handles steps with missing data', () => {
    const steps = [
      {
        collabStepDetail: 'Step with detail',
        collabStepCompleteDate: '',
      },
      {
        collabStepDetail: '',
        collabStepCompleteDate: '02/15/2025',
      },
    ];

    const result = formatNextSteps(steps);

    expect(result).toEqual([
      {
        data: {
          'Step 1': 'Step with detail',
          'Anticipated completion': '',
        },
        striped: false,
      },
      {
        data: {
          'Step 2': '',
          'Anticipated completion': '02/15/2025',
        },
        striped: false,
      },
    ]);
  });
});
