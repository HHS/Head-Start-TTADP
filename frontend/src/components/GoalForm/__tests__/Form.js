import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Form from '../Form';
import { FORM_FIELD_DEFAULT_ERRORS } from '../constants';

const DEFAULT_GOAL = {
  name: '',
  endDate: '',
  selectedGrants: [],
  status: 'Draft',
  isOnApprovedReport: false,
  isOnReport: false,
};

describe('Goal Form > Form component', () => {
  const renderGoalForm = (
    goal = DEFAULT_GOAL,
    objectives = [],
    fetchError = '',
  ) => {
    render(<Form
      isOnReport={goal.isOnReport}
      isOnApprovedReport={goal.isOnApprovedReport}
      errors={FORM_FIELD_DEFAULT_ERRORS}
      validateGoalName={jest.fn()}
      validateEndDate={jest.fn()}
      validateGrantNumbers={jest.fn()}
      setObjectiveError={jest.fn()}
      possibleGrants={[{ label: 'Grant 1', value: 1 }]}
      selectedGrants={goal.selectedGrants}
      setSelectedGrants={jest.fn()}
      goalName={goal.name}
      setGoalName={jest.fn()}
      recipient={{
        id: 1,
        name: 'Recipient 1',
        grants: [{
          id: 1,
          name: 'Grant 1',
          number: 'GRANT_NUMBER',
          status: 'Active',
          numberWithProgramTypes: 'GRANT_NUMBER EHS',
        }],
      }}
      endDate={goal.endDate}
      setEndDate={jest.fn()}
      setObjectives={jest.fn()}
      topicOptions={[{ label: 'Topic 1', value: 1 }]}
      objectives={objectives}
      status={goal.status}
      datePickerKey="endDate"
      fetchError={fetchError}
      goalNumber="1"
      clearEmptyObjectiveError={jest.fn()}
      onUploadFile={jest.fn()}
      validateGoalNameAndRecipients={jest.fn()}
      roleOptions={[{ id: 1, fullName: 'Role 1' }]}
    />);
  };

  it('should render the form', () => {
    renderGoalForm();
    expect(document.querySelector('.ttahub-create-goals-form')).not.toBeNull();
  });

  it('shows an error where some objectives are in progress', async () => {
    const objectives = [{
      title: 'This is an objective',
      status: 'In Progress',
      topics: [],
      resources: [],
    }];
    renderGoalForm({ ...DEFAULT_GOAL, isOnApprovedReport: true }, objectives);

    expect(await screen.findByText(/Field entries that are used on an activity report can no longer be edited/i)).toBeVisible();
  });

  it('shows an error when the fetch has failed', async () => {
    const objectives = [];
    renderGoalForm(DEFAULT_GOAL, objectives, 'There was a fetch error');

    expect(await screen.findByText(/There was a fetch error/i)).toBeVisible();
  });
});
