import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import Form from '../Form';
import { FORM_FIELD_DEFAULT_ERRORS } from '../constants';

describe('Goal Form > Form component', () => {
  const renderGoalForm = (validateGoalNameAndRecipients) => {
    render(<Form
      isOnReport={false}
      isOnApprovedReport={false}
      errors={FORM_FIELD_DEFAULT_ERRORS}
      validateGoalName={jest.fn()}
      validateEndDate={jest.fn()}
      validateGrantNumbers={jest.fn()}
      setObjectiveError={jest.fn()}
      possibleGrants={[{ label: 'Grant 1', value: 1 }]}
      selectedGrants={[]}
      setSelectedGrants={jest.fn()}
      goalName=""
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
      endDate={null}
      setEndDate={jest.fn()}
      setObjectives={jest.fn()}
      topicOptions={[{ label: 'Topic 1', value: 1 }]}
      objectives={[]}
      status="Draft"
      datePickerKey="endDate"
      fetchError=""
      goalNumber="1"
      clearEmptyObjectiveError={jest.fn()}
      onUploadFile={jest.fn()}
      validateGoalNameAndRecipients={validateGoalNameAndRecipients}
    />);
  };

  it('should render the form', () => {
    renderGoalForm(jest.fn());
    expect(document.querySelector('.ttahub-create-goals-form')).not.toBeNull();
  });
});
