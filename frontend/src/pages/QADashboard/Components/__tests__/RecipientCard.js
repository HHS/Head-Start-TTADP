import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { GOAL_STATUS } from '@ttahub/common';
import RecipientCard from '../RecipientCard';

const recipientData = {
  name: 'Sample Recipient 1',
  lastARStartDate: '09/01/2021',
  emotionalSupport: 1.2,
  classroomOrganization: 2.3,
  instructionalSupport: 3.4,
  reportDeliveryDate: '09/15/2021',
  id: 1,
  regionId: 2,
  goals: [
    {
      goalNumber: 'G-54826',
      status: GOAL_STATUS.IN_PROGRESS,
      creator: 'Jon Doe',
      collaborator: 'Jane Doe',
    },
    {
      goalNumber: 'G-54827',
      status: GOAL_STATUS.CLOSED,
      creator: 'Bill Smith',
      collaborator: 'Barbra Smith',
    },
  ],
};

describe('GoalCard', () => {
  const history = createMemoryHistory();
  const renderGoalCard = async (
    recipient,
    handleGoalCheckboxSelect = jest.fn(),
    isChecked = false,
    zIndex = 100,
  ) => {
    render((
      <Router history={history}>
        <RecipientCard
          recipient={recipient}
          handleGoalCheckboxSelect={handleGoalCheckboxSelect}
          isChecked={isChecked}
          zIndex={zIndex}
        />
      </Router>));
  };

  it('renders correctly', () => {
    renderGoalCard(recipientData);

    // Column headers.
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText('Last AR start date')).toBeInTheDocument();
    expect(screen.getByText('Emotional support')).toBeInTheDocument();
    expect(screen.getByText('Classroom organization')).toBeInTheDocument();
    expect(screen.getByText('Instructional support')).toBeInTheDocument();
    expect(screen.getByText('Report received date')).toBeInTheDocument();
    expect(screen.getByText('Sample Recipient 1')).toBeInTheDocument();

    // Column data.
    expect(screen.getByText('09/01/2021')).toBeInTheDocument();
    expect(screen.getByText('1.2')).toBeInTheDocument();
    expect(screen.getByText('2.3')).toBeInTheDocument();
    expect(screen.getByText('3.4')).toBeInTheDocument();
    expect(screen.getByText('09/15/2021')).toBeInTheDocument();
  });

  it('expands the goals', () => {
    renderGoalCard(recipientData);

    const showGoalsBtn = screen.getByRole('button', { name: /view goals for recipient sample recipient 1/i });
    expect(screen.queryByText('Goal number')).not.toBeInTheDocument();
    expect(screen.queryByText('Goal status')).not.toBeInTheDocument();
    expect(screen.queryByText('Creator')).not.toBeInTheDocument();
    expect(screen.queryByText('Collaborator')).not.toBeInTheDocument();

    // Expand.
    showGoalsBtn.click();

    expect(screen.queryAllByText('Goal number').length).toBe(2);
    expect(screen.queryAllByText('Goal status').length).toBe(2);
    expect(screen.queryAllByText('Creator').length).toBe(2);
    expect(screen.queryAllByText('Collaborator').length).toBe(2);

    expect(screen.getByText('G-54826')).toBeInTheDocument();
    expect(screen.getByText(GOAL_STATUS.IN_PROGRESS)).toBeInTheDocument();
    expect(screen.getByText('Jon Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    expect(screen.getByText('G-54827')).toBeInTheDocument();
    expect(screen.getByText(GOAL_STATUS.CLOSED)).toBeInTheDocument();
    expect(screen.getByText('Bill Smith')).toBeInTheDocument();
    expect(screen.getByText('Barbra Smith')).toBeInTheDocument();

    // Collapse.
    showGoalsBtn.click();

    expect(screen.queryByText('Goal number')).not.toBeInTheDocument();
    expect(screen.queryByText('Goal status')).not.toBeInTheDocument();
    expect(screen.queryByText('Creator')).not.toBeInTheDocument();
    expect(screen.queryByText('Collaborator')).not.toBeInTheDocument();
  });

  it('calls handleGoalCheckboxSelect', () => {
    const handleGoalCheckboxSelect = jest.fn();
    renderGoalCard(recipientData, handleGoalCheckboxSelect);

    const checkbox = screen.getByTestId('selectRecipientTestId');
    expect(checkbox).toBeInTheDocument();

    // Select the recipient.
    checkbox.click();
    expect(handleGoalCheckboxSelect).toHaveBeenCalledTimes(1);
  });
});
