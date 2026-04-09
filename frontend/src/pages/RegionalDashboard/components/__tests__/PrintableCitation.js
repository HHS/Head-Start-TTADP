import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrintableCitation from '../PrintableCitation';

const mockCitation = {
  recipientName: 'Bright Beginnings Early Learning Center',
  citationNumber: '1302.42(b)(1)(i)',
  status: 'Corrected',
  findingType: 'Deficiency',
  category: 'Health',
  grantNumbers: ['14HP177736 - EHS', '14CH177645 - HS', '14CH178233 - EHS,HS'],
  lastTTADate: '06/06/2025',
  reviews: [
    {
      name: '251036FU',
      reviewType: 'Follow-up',
      reviewReceived: '07/21/2025',
      outcome: 'Compliant',
      specialists: [],
      objectives: [],
    },
    {
      name: '251036F2C',
      reviewType: 'FA2-CR',
      reviewReceived: '05/12/2025',
      outcome: 'Deficient',
      specialists: [
        { name: 'Nancy Sullivan', roles: ['HS'] },
        { name: 'Nikki Reid', roles: ['GS'] },
      ],
      objectives: [
        {
          title: 'The technical assistance specialists will assist the leadership team.',
          activityReports: [
            { id: 56790, displayId: 'R14-AR-56790' },
            { id: 56582, displayId: 'R14-AR-56582' },
          ],
          endDate: '06/06/2025',
          participants: ['Manager / Coordinator / Specialist', 'Program Director (HS / EHS)'],
          topics: ['Physical Health and Screenings', 'Quality Improvement Plan / QIP'],
          status: 'Complete',
        },
      ],
    },
  ],
};

const renderCitation = (citation = mockCitation) => render(
  <BrowserRouter>
    <PrintableCitation citation={citation} />
  </BrowserRouter>,
);

describe('PrintableCitation', () => {
  it('renders the recipient name as a heading', () => {
    renderCitation();
    expect(screen.getByRole('heading', { level: 2, name: 'Bright Beginnings Early Learning Center' })).toBeInTheDocument();
  });

  it('renders citation metadata fields', () => {
    renderCitation();
    expect(screen.getByText('Current status')).toBeInTheDocument();
    expect(screen.getByText('Corrected')).toBeInTheDocument();
    expect(screen.getByText('Finding type')).toBeInTheDocument();
    expect(screen.getByText('Deficiency')).toBeInTheDocument();
    expect(screen.getByText('Finding category')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Grants cited')).toBeInTheDocument();
    expect(screen.getByText('14HP177736 - EHS; 14CH177645 - HS; 14CH178233 - EHS,HS')).toBeInTheDocument();
    expect(screen.getByText('Last TTA')).toBeInTheDocument();
    // lastTTADate also appears as the objective endDate, so use getAllByText
    expect(screen.getAllByText('06/06/2025').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "None" for last TTA when null', () => {
    renderCitation({ ...mockCitation, lastTTADate: null });
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders review headings with name and type', () => {
    renderCitation();
    expect(screen.getByText('Review 251036FU (Follow-up)')).toBeInTheDocument();
    expect(screen.getByText('Review 251036F2C (FA2-CR)')).toBeInTheDocument();
  });

  it('renders review metadata', () => {
    renderCitation();
    // 'Review received' and 'Review outcome' appear once per review (two reviews total)
    expect(screen.getAllByText('Review received')).toHaveLength(2);
    expect(screen.getByText('07/21/2025')).toBeInTheDocument();
    expect(screen.getAllByText('Review outcome')).toHaveLength(2);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('renders specialist names and roles as plain text', () => {
    renderCitation();
    expect(screen.getByText('Nancy Sullivan, HS; Nikki Reid, GS')).toBeInTheDocument();
  });

  it('renders objective fields', () => {
    renderCitation();
    expect(screen.getAllByRole('heading', { level: 4, name: 'TTA objective' })).toHaveLength(1);
    expect(screen.getByText('The technical assistance specialists will assist the leadership team.')).toBeInTheDocument();
    expect(screen.getByText('R14-AR-56790')).toBeInTheDocument();
    expect(screen.getByText('R14-AR-56582')).toBeInTheDocument();
    expect(screen.getByText('Physical Health and Screenings, Quality Improvement Plan / QIP')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders participants when present', () => {
    renderCitation();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Manager / Coordinator / Specialist, Program Director (HS / EHS)')).toBeInTheDocument();
  });

  it('hides participants when absent', () => {
    const citationNoParticipants = {
      ...mockCitation,
      reviews: [
        {
          ...mockCitation.reviews[1],
          objectives: [
            { ...mockCitation.reviews[1].objectives[0], participants: undefined },
          ],
        },
      ],
    };
    renderCitation(citationNoParticipants);
    expect(screen.queryByText('Participants')).not.toBeInTheDocument();
  });

  it('hides participants when empty array', () => {
    const citationEmptyParticipants = {
      ...mockCitation,
      reviews: [
        {
          ...mockCitation.reviews[1],
          objectives: [
            { ...mockCitation.reviews[1].objectives[0], participants: [] },
          ],
        },
      ],
    };
    renderCitation(citationEmptyParticipants);
    expect(screen.queryByText('Participants')).not.toBeInTheDocument();
  });
});
