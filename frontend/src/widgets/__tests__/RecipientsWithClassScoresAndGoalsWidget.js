import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import RecipientsWithClassScoresAndGoalsWidget from '../RecipientsWithClassScoresAndGoalsWidget';
import UserContext from '../../UserContext';

const recipientData = {
  widgetData: {
    '% recipients with class': 18.26,
    'grants with class': 346,
    'recipients with class': 283,
    total: 1550,
  },
  pageData: [
    {
      id: 1,
      name: 'Action for Boston Community Development, Inc.',
      lastARStartDate: '01/02/2021',
      emotionalSupport: 6.0430,
      classroomOrganization: 5.0430,
      instructionalSupport: 4.0430,
      reportDeliveryDate: '03/01/2022',
      goals: [
        {
          goalNumber: 'G-45641',
          status: 'In progress',
          creator: 'John Doe',
          collaborator: 'Jane Doe',
        },
        {
          goalNumber: 'G-25858',
          status: 'Suspended',
          creator: 'Bill Smith',
          collaborator: 'Bob Jones',
        },
      ],
    },
  ],
};

const renderRecipientsWithClassScoresAndGoalsWidget = (data) => {
  const history = createMemoryHistory();
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoalsWidget
          data={data}
          loading={false}
        />
      </Router>
    </UserContext.Provider>,
  );
};

describe('Recipients With Class and Scores and Goals Widget', () => {
  it('renders correctly without data', async () => {
    const emptyData = {
      widgetData: {
        '% recipients with class': 0,
        'grants with class': 0,
        'recipients with class': 0,
        total: 0,
      },
      pageData: [],
    };
    renderRecipientsWithClassScoresAndGoalsWidget(emptyData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/0-0 of 0/i)).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    renderRecipientsWithClassScoresAndGoalsWidget(recipientData);

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument();
    expect(screen.getByText(/1-1 of 1/i)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].name)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].lastARStartDate)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].emotionalSupport)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].classroomOrganization)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].instructionalSupport)).toBeInTheDocument();
    expect(screen.getByText('03/01/2022')).toBeInTheDocument();

    // Expand the goals.
    const goalsButton = screen.getByRole('button', { name: /view goals for recipient action for boston community development, inc\./i });
    expect(goalsButton).toBeInTheDocument();
    goalsButton.click();

    expect(screen.getByText(recipientData.pageData[0].goals[0].goalNumber)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[0].status)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[0].creator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[0].collaborator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].goalNumber)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].status)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].creator)).toBeInTheDocument();
    expect(screen.getByText(recipientData.pageData[0].goals[1].collaborator)).toBeInTheDocument();
  });
});
