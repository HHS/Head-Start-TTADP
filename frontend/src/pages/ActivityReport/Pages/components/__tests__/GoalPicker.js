/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
  act,
  fireEvent,
} from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import userEvent from '@testing-library/user-event';
import AppLoadingContext from '../../../../../AppLoadingContext';
import GoalPicker from '../GoalPicker';
import UserContext from '../../../../../UserContext';
import { mockRSSData } from '../../../../../testHelpers';

const defaultSelectedGoals = [
  {
    label: '123',
    value: 123,
    goalIds: [123],
  },
];

const defaultGoalForEditing = {
  objectives: [],
  goalIds: [],
};

// eslint-disable-next-line react/prop-types, object-curly-newline
const GP = ({ availableGoals, selectedGoals, goalForEditing, goalTemplates }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: selectedGoals,
      goalForEditing,
      author: {
        role: 'central office',
      },
      collaborators: [],
    },
  });

  return (
    <AppLoadingContext.Provider value={{
      setIsAppLoading: jest.fn(),
      setAppLoadingText: jest.fn(),
      isAppLoading: false,
    }}
    >
      <UserContext.Provider value={{
        user: {
          id: 1, permissions: [], name: 'Ted User', flags: [],
        },
      }}
      >
        <FormProvider {...hookForm}>
          <GoalPicker
            availableGoals={availableGoals}
            goalTemplates={goalTemplates}
            grantIds={[]}
            reportId={1}
          />
        </FormProvider>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

const renderGoalPicker = (
  availableGoals,
  selectedGoals = defaultSelectedGoals,
  goalForEditing = defaultGoalForEditing,
  goalTemplates = [],
) => {
  render(
    <GP
      availableGoals={availableGoals}
      selectedGoals={selectedGoals}
      goalForEditing={goalForEditing}
      goalTemplates={goalTemplates}
    />,
  );
};

describe('GoalPicker', () => {
  beforeEach(async () => {
    fetchMock.get('/api/topic', []);
    fetchMock.get('/api/goals?reportId=1&goalIds=1', [{ objectives: [] }]);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
  });

  afterEach(() => fetchMock.restore());

  it('you can select a goal', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
      name: 'Goal 1',
    }];

    renderGoalPicker(availableGoals);

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());
  });

  it('you can select a goal that has objectives, keeping the objectives', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
      name: 'Goal 1',
    }];

    const goalForEditing = {
      objectives: [{
        topics: [],
        id: 1,
        title: 'Objective 1',
        resources: [],
        ttaProvided: '',
        objectiveCreatedHere: true,
      }],
      goalIds: [],
    };

    renderGoalPicker(
      availableGoals,
      defaultSelectedGoals,
      goalForEditing,
    );

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    expect(await screen.findByText('You have selected a different goal.')).toBeVisible();

    const button = await screen.findByRole('button', { name: /keep objective/i });
    userEvent.click(button);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());

    const objective = await screen.findByText('Objective 1', { selector: 'textarea' });
    expect(objective).toBeVisible();
    expect(objective).toHaveAttribute('name', 'goalForEditing.objectives[0].title');
  });

  it('you can select a goal that has objectives, losing the objectives', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
      name: 'Goal 1',
    }];

    const goalForEditing = {
      objectives: [{
        topics: [],
        id: 1,
        title: 'Objective 1',
        resources: [],
        ttaProvided: '',
        objectiveCreatedHere: true,
      }],
      goalIds: [],
    };

    renderGoalPicker(
      availableGoals,
      defaultSelectedGoals,
      goalForEditing,
    );

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    expect(await screen.findByText('You have selected a different goal.')).toBeVisible();

    const button = await screen.findByRole('button', { name: /remove objective/i });
    userEvent.click(button);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());

    const objective = document.querySelector('[name="goalForEditing.objectives[0].title"]');
    expect(objective).toBeNull();
  });

  it('you can select a goal with no selected goals', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
    }];

    renderGoalPicker(availableGoals, null);

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());
  });

  it('properly renders when there is no goal for editing selected', async () => {
    renderGoalPicker([], null);
    const selector = await screen.findByLabelText(/Select recipient's goal*/i);

    expect(selector).toBeVisible();
  });

  describe('with checkbox', () => {
    it('you can toggle the list of curated goals', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', []);
      fetchMock.get('/api/goal-templates/1/prompts', []);
      const availableGoals = [];

      renderGoalPicker(availableGoals, null, null, [
        {
          id: 1,
          goalTemplateId: 1,
          name: 'Goal Template 1',
          label: 'Goal Template 1',
          goals: [],
          isCurated: true,
          objectives: [],
          value: 1,
          source: '',
        },
      ]);

      let selector = screen.queryByLabelText(/Select recipient's goal*/i);
      expect(selector).toBeVisible();

      const checkbox = await screen.findByLabelText(/use ohs standard goal/i);
      act(() => {
        userEvent.click(checkbox);
      });

      selector = screen.queryByLabelText(/Select recipient's goal*/i);
      expect(selector).toBeNull();

      selector = await screen.findByLabelText(/Select ohs standard goal/i);

      fireEvent.focus(selector);
      fireEvent.keyDown(selector, {
        key: 'ArrowDown',
        keyCode: 40,
        code: 40,
      });

      const option = await screen.findByText('Goal Template 1');
      expect(option).toBeVisible();
    });
  });

  describe('curated goals', () => {
    it('with no prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [
        {
          type: 'multiselect',
          title: 'prompt-1',
          options: [
            'Option 1',
            'Option 2',
          ],
          prompt: 'WHYYYYYYYY?',
        },
      ]);
      const availableGoals = [{
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        isCurated: true,
        goalTemplateId: 1,
      }];

      renderGoalPicker(availableGoals, null);

      const selector = await screen.findByLabelText(/Select recipient's goal*/i);
      const [availableGoal] = availableGoals;

      await selectEvent.select(selector, [availableGoal.label]);

      const input = document.querySelector('[name="goalForEditing"]');
      expect(input.value).toBe(availableGoal.value.toString());
    });
    it('with prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [
        {
          type: 'multiselect',
          title: 'prompt-1',
          options: [
            'Option 1',
            'Option 2',
          ],
          prompt: 'WHYYYYYYYY?',
        },
      ]);
      const availableGoals = [{
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        isCurated: true,
        goalTemplateId: 1,
      }];

      renderGoalPicker(availableGoals, null);

      const selector = await screen.findByLabelText(/Select recipient's goal*/i);
      const [availableGoal] = availableGoals;

      await selectEvent.select(selector, [availableGoal.label]);

      const input = document.querySelector('[name="goalForEditing"]');
      expect(input.value).toBe(availableGoal.value.toString());
    });
  });
});
