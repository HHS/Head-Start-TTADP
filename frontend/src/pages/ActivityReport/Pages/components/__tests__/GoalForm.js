/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import React from 'react';
import PropTypes from 'prop-types';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import GoalForm from '../GoalForm';
import AppLoadingContext from '../../../../../AppLoadingContext';
import UserContext from '../../../../../UserContext';

describe('GoalForm', () => {
  const DEFAULT_USER = {
    id: 1,
    permissions: [],
    name: 'Ted User',
    flags: [],
  };

  const Form = ({ id, customGoal, user = DEFAULT_USER }) => {
    const goal = customGoal || {
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
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <UserContext.Provider value={{
          user,
        }}
        >
          <FormProvider {...hookForm}>
            <GoalForm
              goal={goal}
              roles={[]}
              topicOptions={[{ label: 'Coaching', value: 1 }]}
              reportId={1}
            />
          </FormProvider>
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    );
  };

  Form.propTypes = {
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]).isRequired,
    customGoal: PropTypes.shape({
      id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]).isRequired,
      isNew: PropTypes.bool,
      goalIds: PropTypes.arrayOf(PropTypes.number),
      status: PropTypes.string,
      prompts: PropTypes.arrayOf(PropTypes.shape({
        fieldType: PropTypes.string,
        title: PropTypes.string,
        prompt: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.string),
        response: PropTypes.arrayOf(PropTypes.string),
        validations: PropTypes.shape({
          rules: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            value: PropTypes.oneOfType([
              PropTypes.string,
              PropTypes.number,
            ]),
            message: PropTypes.string,
          })),
        }),
      })),
    }),
    user: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      permissions: PropTypes.arrayOf(PropTypes.shape({
        scopeId: PropTypes.number,
      })),
    }).isRequired,
  };

  Form.defaultProps = {
    customGoal: undefined,
  };

  const renderGoalForm = (id, customGoal = undefined, user) => {
    render(<Form id={id} customGoal={customGoal} user={user} />);
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

  it('disables goal source when created via tr', async () => {
    const trGoal = {
      id: 1,
      isNew: false,
      goalIds: [123],
      createdVia: 'tr',
      source: 'Training event source',
    };
    const user = {
      ...DEFAULT_USER,
      permissions: [{ scopeId: SCOPE_IDS.ADMIN }],
    };
    renderGoalForm(1, trGoal, user);
    // Expect to have the text "Training event source" in the goal source field.
    expect(screen.getByText(/goal source/i)).toBeVisible();
    expect(screen.getByText(/training event source/i)).toBeVisible();
  });

  it('enables goal source when created via is not tr', () => {
    const trGoal = {
      id: 1,
      isNew: false,
      goalIds: [123],
      createdVia: 'activityReport',
      source: 'Not training event',
    };
    const user = {
      ...DEFAULT_USER,
      permissions: [{ scopeId: SCOPE_IDS.ADMIN }],
    };
    renderGoalForm(1, trGoal, user);
    // Expect the goal source to be disabled
    const sourceSelect = screen.getByRole('combobox', { name: /goal source/i });
    expect(sourceSelect).not.toBeDisabled();
  });
});
