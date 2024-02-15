import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
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
  source: {},
};

const DEFAULT_USER = {
  id: 1, permissions: [], name: 'Ted User', flags: [],
};

describe('Goal Form > Form component', () => {
  const renderGoalForm = (
    goal = DEFAULT_GOAL,
    objectives = [],
    fetchError = '',
    user = DEFAULT_USER,
  ) => {
    render(
      <UserContext.Provider value={{
        user,
      }}
      >
        <Form
          isNew
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
          onUploadFiles={jest.fn()}
          setPrompts={jest.fn()}
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
          userCanEdit
          source={goal.source}
          createdVia={goal.createdVia}
          onSelectNudgedGoal={jest.fn()}
        />
      </UserContext.Provider>,
    );
  };

  it('should render the form', () => {
    renderGoalForm();
    expect(document.querySelector('.ttahub-create-goals-form')).not.toBeNull();
  });

  it('disables goal source if createdVia tr', () => {
    renderGoalForm(
      {
        ...DEFAULT_GOAL,
        createdVia: 'tr',
        selectedGrants: [{ id: 1, numberWithProgramTypes: 'GRANT_NUMBER EHS' }],
        source: { 'GRANT_NUMBER EHS': 'training event source' },
      },
      [],
      '',
      { ...DEFAULT_USER, permissions: [{ scopeId: SCOPE_IDS.ADMIN }] },
    );
    expect(screen.getByText(/goal source/i)).toBeVisible();
    expect(screen.getByText(/training event source/i)).toBeVisible();
    expect(screen.queryAllByRole('combobox', { name: /goal source/i }).length).toBe(0);
  });

  it('does not disable goal source if createdVia tr', () => {
    renderGoalForm(
      {
        ...DEFAULT_GOAL,
        createdVia: 'activityReport',
        selectedGrants: [{ id: 1, numberWithProgramTypes: 'GRANT_NUMBER EHS' }],
        source: { 'GRANT_NUMBER EHS': 'Not Training event' },
      },
      [],
      '',
      { ...DEFAULT_USER, permissions: [{ scopeId: SCOPE_IDS.ADMIN }] },
    );
    // Expect the goal source not to be disabled
    const sourceSelects = screen.getAllByRole('combobox', { name: /goal source/i });
    sourceSelects.forEach((sourceSelect) => {
      expect(sourceSelect).toBeEnabled();
    });
  });

  it('shows an error when the fetch has failed', async () => {
    const objectives = [];
    renderGoalForm(DEFAULT_GOAL, objectives, 'There was a fetch error');

    expect(await screen.findByText(/There was a fetch error/i)).toBeVisible();
  });
});
