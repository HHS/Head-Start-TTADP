import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import RecipientsWithClassScoresAndGoals from '../index';
import UserContext from '../../../../UserContext';

/*
const recipients = [{
  id: 1,
  name: 'Recipient 1',
  lastArStartDate: '01/02/2021',
  emotionalSupport: 6.0430,
  classroomOrganization: 5.0430,
  instructionalSupport: 4.0430,
  reportReceivedDate: '03/01/2022',
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
{
  id: 2,
  name: 'Recipient 2',
  lastArStartDate: '04/02/2021',
  emotionalSupport: 5.254,
  classroomOrganization: 8.458,
  instructionalSupport: 1.214,
  reportReceivedDate: '05/01/2022',
  goals: [
    {
      goalNumber: 'G-68745',
      status: 'In progress',
      creator: 'Bill Parks',
      collaborator: 'Jack Jones',
    },
  ],
}];
*/

const renderRecipientsWithClassScoresAndGoals = (data) => {
  const history = createMemoryHistory();
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoals
          data={data}
          loading={false}
        />
      </Router>
    </UserContext.Provider>,
  );
};

describe('Recipients With Class and Scores and Goals', () => {
  it('renders correctly with data', async () => {
    renderRecipientsWithClassScoresAndGoals();

    expect(screen.queryAllByText(/Recipients with CLASS® scores/i).length).toBe(2);
    expect(screen.getByText(/1-2 of 2/i)).toBeInTheDocument();

    expect(screen.getByText('Recipient 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText(/6\.043/i)).toBeInTheDocument();
    expect(screen.getByText(/5\.043/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.043/i)).toBeInTheDocument();
    expect(screen.getByText('03/01/2022')).toBeInTheDocument();

    // Expand goals.
    let goalsButton = screen.getByRole('button', { name: /view goals for recipient recipient 1/i });
    goalsButton.click();

    expect(screen.getByText('G-45641')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('G-25858')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText('Bill Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    expect(screen.getByText('Recipient 2')).toBeInTheDocument();
    expect(screen.getByText('04/02/2021')).toBeInTheDocument();
    expect(screen.getByText('5.254')).toBeInTheDocument();
    expect(screen.getByText('8.458')).toBeInTheDocument();
    expect(screen.getByText('1.214')).toBeInTheDocument();
    expect(screen.getByText('05/01/2022')).toBeInTheDocument();

    // Expand goals.
    goalsButton = screen.getByRole('button', { name: /view goals for recipient recipient 2/i });
    goalsButton.click();

    expect(screen.getByText('G-68745')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Bill Parks')).toBeInTheDocument();
    expect(screen.getByText('Jack Jones')).toBeInTheDocument();
  });

  it('selects and unselects all recipients', async () => {
    renderRecipientsWithClassScoresAndGoals();
    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i });
    selectAllButton.click();
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    selectAllButton.click();
    expect(screen.queryAllByText(/2 selected/i).length).toBe(0);
  });

  it('Shows the selected pill and unselects when pill is removed', async () => {
    renderRecipientsWithClassScoresAndGoals();
    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i });
    selectAllButton.click();
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    const pillRemoveButton = screen.getByRole('button', { name: /deselect all goals/i });
    pillRemoveButton.click();
    expect(screen.queryAllByText(/2 selected/i).length).toBe(0);
  });
});
