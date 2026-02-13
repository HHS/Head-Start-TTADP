import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import SubmittedReport from '../SubmittedReport'
import { OBJECTIVE_STATUS } from '../../../Constants'

const mockReport = {
  reportId: 123,
  displayId: 'R01-AR-123',
  ttaType: ['training', 'technical-assistance'],
  deliveryMethod: 'in-person',
  virtualDeliveryType: null,
  activityRecipientType: 'recipient',
  activityRecipients: [{ name: 'Recipient A' }, { name: 'Recipient B' }],
  targetPopulations: ['Population 1', 'Population 2'],
  approvers: [{ user: { fullName: 'Manager 1' } }, { user: { fullName: 'Manager 2' } }],
  activityReportCollaborators: [{ fullName: 'Collaborator 1' }, { fullName: 'Collaborator 2' }],
  participants: ['Participant 1', 'Participant 2'],
  language: ['English', 'Spanish'],
  numberOfParticipants: 10,
  numberOfParticipantsInPerson: 8,
  numberOfParticipantsVirtually: 2,
  startDate: '2023-01-01',
  endDate: '2023-01-02',
  duration: '2.5',
  activityReason: 'Activity reason',
  specialistNextSteps: [{ note: 'Specialist step 1', completeDate: '2023-02-01' }],
  recipientNextSteps: [{ note: 'Recipient step 1', completeDate: '2023-02-01' }],
  files: [
    {
      url: { url: 'http://example.com/file1.pdf' },
      originalFileName: 'document1.pdf',
    },
  ],
  context: 'Test context',
  author: { fullName: 'Author Name' },
  createdAt: '2023-01-01T10:00:00Z',
  submittedDate: '2023-01-02T10:00:00Z',
  approvedAt: '2023-01-03T10:00:00Z',
  goalsAndObjectives: [
    {
      name: 'Test Goal',
      goalNumbers: ['G1'],
      responses: [{ response: ['Root cause'] }],
      prompts: [],
      objectives: [
        {
          title: 'Test Objective',
          citations: [],
          topics: [{ name: 'Topic 1' }],
          courses: [],
          resources: [],
          files: [],
          ttaProvided: 'Training provided',
          supportType: 'Implementation',
          status: OBJECTIVE_STATUS.COMPLETE,
        },
      ],
    },
  ],
}

describe('SubmittedReport', () => {
  it('renders basic report information', () => {
    render(<SubmittedReport data={mockReport} />)

    expect(screen.getByText('TTA activity report R01-AR-123')).toBeInTheDocument()
    expect(screen.getByText('Author Name')).toBeInTheDocument()
    expect(screen.getByText('Collaborator 1, Collaborator 2')).toBeInTheDocument()
    expect(screen.getByText('Manager 1, Manager 2')).toBeInTheDocument()
  })

  it('renders hybrid delivery method with virtual participants', () => {
    const hybridReport = {
      ...mockReport,
      deliveryMethod: 'hybrid',
      numberOfParticipantsInPerson: 8,
      numberOfParticipantsVirtually: 2,
    }

    render(<SubmittedReport data={hybridReport} />)

    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles empty context by setting default text', () => {
    const reportWithEmptyContext = {
      ...mockReport,
      context: '',
    }

    render(<SubmittedReport data={reportWithEmptyContext} />)

    expect(screen.getAllByText('None provided')).toHaveLength(4)
  })

  it('renders submitted date when available', () => {
    render(<SubmittedReport data={mockReport} />)

    expect(screen.getByText(/Date submitted:/)).toBeInTheDocument()
    expect(screen.getByText(/01\/02\/2023/)).toBeInTheDocument()
  })

  it('renders approved date when available', () => {
    render(<SubmittedReport data={mockReport} />)

    expect(screen.getByText(/Date approved:/)).toBeInTheDocument()
    expect(screen.getByText(/01\/03\/2023/)).toBeInTheDocument()
  })

  it('does not render submitted date when not available', () => {
    const reportWithoutSubmitted = {
      ...mockReport,
      submittedDate: null,
    }

    render(<SubmittedReport data={reportWithoutSubmitted} />)

    expect(screen.queryByText(/Date submitted:/)).not.toBeInTheDocument()
  })

  it('does not render approved date when not available', () => {
    const reportWithoutApproved = {
      ...mockReport,
      approvedAt: null,
    }

    render(<SubmittedReport data={reportWithoutApproved} />)

    expect(screen.queryByText(/Date approved:/)).not.toBeInTheDocument()
  })

  it('handles hybrid delivery method participant counting', () => {
    const hybridReport = {
      ...mockReport,
      deliveryMethod: 'hybrid',
      numberOfParticipantsInPerson: 8,
      numberOfParticipantsVirtually: 2,
    }

    render(<SubmittedReport data={hybridReport} />)

    expect(screen.getByText('Number of participants attending in person')).toBeInTheDocument()
    expect(screen.getByText('Number of participants attending virtually')).toBeInTheDocument()
  })

  it('handles non-hybrid delivery method participant counting', () => {
    const nonHybridReport = {
      ...mockReport,
      deliveryMethod: 'in-person',
      numberOfParticipants: 10,
    }

    render(<SubmittedReport data={nonHybridReport} />)

    expect(screen.getByText('Number of participants attending')).toBeInTheDocument()
    expect(screen.queryByText('Number of participants attending in person')).not.toBeInTheDocument()
    expect(screen.queryByText('Number of participants attending virtually')).not.toBeInTheDocument()
  })

  it('handles virtual participant count when null', () => {
    const reportWithNullVirtualCount = {
      ...mockReport,
      deliveryMethod: 'hybrid',
      numberOfParticipantsInPerson: 8,
      numberOfParticipantsVirtually: null,
    }

    render(<SubmittedReport data={reportWithNullVirtualCount} />)

    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders other entity next steps label for non-recipient reports', () => {
    const otherEntityReport = {
      ...mockReport,
      activityRecipientType: 'other-entity',
      objectivesWithoutGoals: [
        {
          title: 'Other Entity Objective',
          citations: [],
          topics: [{ name: 'Topic 1' }],
          courses: [],
          resources: [],
          files: [],
          ttaProvided: 'Technical Assistance',
          supportType: 'Planning',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
        },
      ],
    }

    render(<SubmittedReport data={otherEntityReport} />)

    expect(screen.getByText(/Other entities next steps/)).toBeInTheDocument()
  })

  it('renders recipient next steps label for recipient reports', () => {
    render(<SubmittedReport data={mockReport} />)

    expect(screen.getByText(/Recipient's next steps/)).toBeInTheDocument()
  })
})
