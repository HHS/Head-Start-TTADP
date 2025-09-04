/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
} from '@testing-library/react';
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
      goalTemplateId: 1,
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
              templateResponses={[]}
              templatePrompts={[]}
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
    fetchMock.get('/api/goals?reportId=1&goalTemplateId=1', [{
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
});
