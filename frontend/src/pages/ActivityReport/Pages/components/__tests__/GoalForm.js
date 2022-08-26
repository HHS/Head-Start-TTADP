/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import PropTypes from 'prop-types';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import { newGoal } from '../GoalPicker';
import GoalForm from '../GoalForm';

describe('GoalForm', () => {
  const Form = ({ id }) => {
    const goal = {
      ...newGoal([]),
      id,
      isNew: id === 'new',
      goalIds: [123],
    };

    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        collaborators: [],
        author: {
          role: 'Human spoon',
        },
      },
    });

    return (
      <FormProvider {...hookForm}>
        <GoalForm
          goal={goal}
          roles={[]}
          topicOptions={[{ label: 'Coaching', value: 1 }]}
          reportId={1}
        />
      </FormProvider>
    );
  };

  Form.propTypes = {
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]).isRequired,
  };

  const renderGoalForm = (id) => {
    render(<Form id={id} />);
  };

  beforeEach(async () => fetchMock.restore());

  it('fetches data for existing goals', async () => {
    const goalId = 123;
    fetchMock.get(`/api/goals?reportId=1&goalIds=${goalId}`, [{
      endDate: '',
      status: '',
      value: goalId,
      label: 'Test',
      id: goalId,
      name: 'Test',
      objectives: [],
    }]);

    renderGoalForm(goalId);
    expect(fetchMock.called()).toBe(true);
  });

  it('displays new goals properly', async () => {
    const goalId = 'new';
    renderGoalForm(goalId);
    expect(fetchMock.called()).toBe(false);

    const endDate = await screen.findByText(/anticipated close date/i);
    expect(endDate).toBeVisible();
  });
});
