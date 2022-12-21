import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import ObjectiveForm from '../ObjectiveForm';

import {
  OBJECTIVE_ERROR_MESSAGES,
} from '../constants';

const [
  objectiveTextError, objectiveTopicsError,
] = OBJECTIVE_ERROR_MESSAGES;

describe('ObjectiveForm', () => {
  const defaultObjective = {
    title: 'This is an objective',
    files: [],
    topics: [
      {
        id: 1,
        name: 'Behavioral / Mental Health / Trauma',
      },
    ],
    resources: [
      { key: 'gee-whix', value: '' },
    ],
    id: 123,
    status: 'Not started',
  };

  const index = 1;

  const renderObjectiveForm = (
    objective = defaultObjective,
    removeObjective = jest.fn(),
    setObjectiveError = jest.fn(),
    setObjective = jest.fn(),
    goalStatus = 'Draft',
  ) => {
    render((
      <ObjectiveForm
        index={index}
        isOnReport={false}
        removeObjective={removeObjective}
        setObjectiveError={setObjectiveError}
        objective={objective}
        setObjective={setObjective}
        errors={[<></>, <></>, <></>]}
        goalStatus={goalStatus}
        onUploadFiles={jest.fn()}
        topicOptions={[
          'Behavioral / Mental Health / Trauma',
          'Child Screening and Assessment',
          'CLASS: Classroom Organization',
          'CLASS: Emotional Support',
          'CLASS: Instructional Support',
          'Coaching',
          'Communication',
          'Community and Self-Assessment',
          'Culture & Language',
          'Curriculum (Instructional or Parenting)',
          'Data and Evaluation',
        ].map((name, id) => ({ id, name }))}
        userCanEdit
      />
    ));
  };

  it('validates text and topics', async () => {
    const objective = {
      title: '',
      topics: [],
      resources: [
        { key: 'gee-whix', value: '' },
      ],
      status: 'Not started',
    };

    const removeObjective = jest.fn();
    const setObjectiveError = jest.fn();
    const setObjective = jest.fn();

    renderObjectiveForm(objective, removeObjective, setObjectiveError, setObjective);

    const topics = await screen.findByLabelText(/topics/i);
    userEvent.click(topics);

    const resourceOne = await screen.findByRole('textbox', { name: 'Resource 1' });
    userEvent.click(resourceOne);

    expect(setObjectiveError).toHaveBeenCalledWith(index, [<></>, <span className="usa-error-message">{objectiveTopicsError}</span>, <></>]);

    await selectEvent.select(topics, ['Coaching', 'Communication']);

    userEvent.click(topics);
    userEvent.click(resourceOne);
    expect(setObjectiveError).toHaveBeenCalledWith(index, [<></>, <></>, <></>]);

    const objectiveText = await screen.findByRole('textbox', { name: /TTA objective/i });
    userEvent.click(objectiveText);
    userEvent.click(resourceOne);

    expect(setObjectiveError).toHaveBeenCalledWith(index, [<span className="usa-error-message">{objectiveTextError}</span>, <></>, <></>]);
  });

  it('you can change status', async () => {
    const removeObjective = jest.fn();
    const setObjectiveError = jest.fn();
    const setObjective = jest.fn();

    renderObjectiveForm(
      { ...defaultObjective, status: 'In Progress' },
      removeObjective,
      setObjectiveError,
      setObjective,
      'In Progress',
    );

    const statusSelect = await screen.findByLabelText('Objective status');
    userEvent.selectOptions(statusSelect, 'Complete');
    expect(setObjective).toHaveBeenCalledWith({ ...defaultObjective, status: 'Complete' });
    userEvent.click(statusSelect);
  });

  it('displays the correct label based on resources from api', async () => {
    const removeObjective = jest.fn();
    const setObjectiveError = jest.fn();
    const setObjective = jest.fn();

    renderObjectiveForm(
      defaultObjective,
      removeObjective,
      setObjectiveError,
      setObjective,
    );

    const label = await screen.findByText('Link to TTA resource used');
    expect(label).toBeVisible();
  });
});
