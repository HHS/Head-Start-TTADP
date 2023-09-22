import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Form from '../Form';
import { FORM_FIELD_DEFAULT_ERRORS } from '../constants';
import UserContext from '../../../UserContext';

const DEFAULT_GOAL = {
  name: '',
  endDate: '',
  selectedGrants: [],
  status: 'Draft',
  isOnApprovedReport: false,
  isOnReport: false,
  prompts: [],
};

describe('Goal Form > Form component', () => {
  const renderGoalForm = (
    goal = DEFAULT_GOAL,
    objectives = [],
    fetchError = '',
  ) => {
    render(
      <UserContext.Provider value={{
        user: {
          id: 1, permissions: [], name: 'Ted User', flags: [],
        },
      }}
      >
        <Form
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
          sources={[]}
          validateGoalSource={jest.fn()}
          setSources={jest.fn()}
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
          prompts={goal.prompts}
        />
      </UserContext.Provider>,
    );
  };

  it('should render the form', () => {
    renderGoalForm();
    expect(document.querySelector('.ttahub-create-goals-form')).not.toBeNull();
  });

  it('shows an error when the fetch has failed', async () => {
    const objectives = [];
    renderGoalForm(DEFAULT_GOAL, objectives, 'There was a fetch error');

    expect(await screen.findByText(/There was a fetch error/i)).toBeVisible();
  });

  it('disables fei root cause when on approved report with field requirements', async () => {
    const goal = {
      ...DEFAULT_GOAL,
      isOnApprovedReport: true,
      isOnReport: true,
      prompts: [{
        fieldType: 'multiselect',
        title: 'FEI root cause',
        prompt: 'Select FEI root cause',
        options: ['cause1', 'cause2', 'cause3'],
        response: ['cause2'],
        validations: {
          rules: [
            {
              name: 'maxSelections',
              value: 2,
              message: 'You can only select 2 options',
            },
            {
              name: 'minSelections',
              value: 1,
              message: 'You must select at least one option',
            },
          ],
        },
      }],
    };
    renderGoalForm(goal);

    const rootCauseList = await screen.findByRole('listitem');
    expect(rootCauseList).toHaveTextContent('cause2');
  });

  it('enables fei root cause when not on approved report with field requirements', async () => {
    const goal = {
      ...DEFAULT_GOAL,
      isOnApprovedReport: false,
      isOnReport: true,
      prompts: [{
        fieldType: 'multiselect',
        title: 'FEI root cause',
        prompt: 'Select FEI root cause',
        options: ['cause1', 'cause2', 'cause3'],
        response: ['cause2'],
        validations: {
          rules: [
            {
              name: 'maxSelections',
              value: 2,
              message: 'You can only select 2 options',
            },
            {
              name: 'minSelections',
              value: 1,
              message: 'You must select at least one option',
            },
          ],
        },
      }],
    };
    renderGoalForm(goal);
    expect(await screen.findByText(/select fei root cause/i)).toBeVisible();
  });

  it('enables fei root cause when on approved report without a root cause', async () => {
    const goal = {
      ...DEFAULT_GOAL,
      isOnApprovedReport: true,
      isOnReport: true,
      prompts: [{
        fieldType: 'multiselect',
        title: 'FEI root cause',
        prompt: 'Select FEI root cause',
        options: ['cause1', 'cause2', 'cause3'],
        response: [],
        validations: {
          rules: [
            {
              name: 'maxSelections',
              value: 2,
              message: 'You can only select 2 options',
            },
            {
              name: 'minSelections',
              value: 1,
              message: 'You must select at least one option',
            },
          ],
        },
      }],
    };
    renderGoalForm(goal);
    expect(await screen.findByText(/select fei root cause/i)).toBeVisible();
  });

  it('enables fei root cause when not on approved report without a root cause', async () => {
    const goal = {
      ...DEFAULT_GOAL,
      isOnApprovedReport: false,
      isOnReport: true,
      prompts: [{
        fieldType: 'multiselect',
        title: 'FEI root cause',
        prompt: 'Select FEI root cause',
        options: ['cause1', 'cause2', 'cause3'],
        response: [],
        validations: {
          rules: [
            {
              name: 'maxSelections',
              value: 2,
              message: 'You can only select 2 options',
            },
            {
              name: 'minSelections',
              value: 1,
              message: 'You must select at least one option',
            },
          ],
        },
      }],
    };
    renderGoalForm(goal);
    expect(await screen.findByText(/select fei root cause/i)).toBeVisible();
  });
});
