/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import userEvent from '@testing-library/user-event';
import AppLoadingContext from '../../../../../AppLoadingContext';
import GoalPicker from '../GoalPicker';
import UserContext from '../../../../../UserContext';
import { mockRSSData } from '../../../../../testHelpers';

const history = createMemoryHistory();

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

const GP = ({
  availableGoals,
  selectedGoals,
  goalForEditing,
  goalTemplates,
  additionalGrantRecipients = [],
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      startDate: '2024-12-03',
      regionId: 1,
      goals: selectedGoals,
      goalForEditing,
      author: {
        role: 'central office',
      },
      collaborators: [],
      activityRecipients: [...additionalGrantRecipients, { activityRecipientId: 1, name: 'Grant 1 Name' }],
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
        <Router history={history}>
          <FormProvider {...hookForm}>
            <GoalPicker
              availableGoals={availableGoals}
              goalTemplates={goalTemplates}
              grantIds={[1]}
              reportId={1}
            />
          </FormProvider>
        </Router>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

const renderGoalPicker = (
  availableGoals,
  selectedGoals = defaultSelectedGoals,
  goalForEditing = defaultGoalForEditing,
  goalTemplates = [],
  additionalGrantRecipients = [],
) => {
  render(
    <GP
      availableGoals={availableGoals}
      selectedGoals={selectedGoals}
      goalForEditing={goalForEditing}
      goalTemplates={goalTemplates}
      additionalGrantRecipients={additionalGrantRecipients}
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

  it('correctly displays the monitoring warning if non monitoring recipients are selected', async () => {
    fetchMock.get('/api/goal-templates/1/prompts?goalIds=1&goalIds=2', []);
    fetchMock.get('/api/goal-templates/1/source?grantIds=2&grantIds=1', {
      source: 'Federal monitoring issues, including CLASS and RANs',
    });

    // api/citations/region/1?grantIds=1&reportStartDate=2024-12-03
    fetchMock.get('/api/citations/region/1?grantIds=1&reportStartDate=2024-12-03', [
      {
        citation: 'Not your citation',
        grants: [
          {
            acro: 'DEF',
            citation: 'test citation 1',
            findingId: 1,
            findingSource: 'source',
            findingType: 'Not your citation type',
            grantId: 2,
            grantNumber: '123',
            monitoringFindingStatusName: 'Active',
            reportDeliveryDate: '2024-12-03',
            reviewName: 'review name',
            severity: 1,
          },
        ],
        standardId: 1,
      },
    ]);

    fetchMock.get('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03', [
      {
        citation: 'Not your citation',
        grants: [
          {
            acro: 'DEF',
            citation: 'test citation 1',
            findingId: 1,
            findingSource: 'source',
            findingType: 'Not your citation type',
            grantId: 2,
            grantNumber: '123',
            monitoringFindingStatusName: 'Active',
            reportDeliveryDate: '2024-12-03',
            reviewName: 'review name',
            severity: 1,
          },
        ],
        standardId: 1,
      },
    ]);

    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1, 2],
      name: 'Goal 1',
      objectives: [],
    }];
    const availableTemplates = [{
      label: 'Monitoring Template Goal',
      value: 1,
      goalIds: [1, 2],
      isCurated: true,
      goalTemplateId: 1,
      source: 'Federal monitoring issues, including CLASS and RANs',
      standard: 'Monitoring',
      objectives: [],
      goals: [
        {
          grantId: 1,
        },
        {
          grantId: 2,
        },
      ],
    }];
    const goalForEditing = {
      standard: 'Monitoring',
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
    act(() => {
      renderGoalPicker(availableGoals, null, goalForEditing, availableTemplates, [{ activityRecipientId: 2, name: 'Grant 2 Name' }]);
    });
    let selector = screen.queryByLabelText(/Select recipient's goal*/i);
    expect(selector).toBeVisible();

    // Check box to use curated goals.
    const checkbox = await screen.findByRole('checkbox', { name: /use ohs standard goal/i });
    await act(async () => {
      // use selectEvent to check the checkbox.
      await userEvent.click(checkbox);
      await waitFor(async () => {
        // wait for check box to be checked.
        expect(checkbox).toBeChecked();
      });
    });

    selector = await screen.findByLabelText(/Select recipient's goal*/i);

    await act(async () => {
      await selectEvent.select(selector, ['Monitoring Template Goal']);
    });

    // Select first template goal.

    fireEvent.focus(selector);
    await act(async () => {
      // arrow down to the first option and select it.
      fireEvent.keyDown(selector, {
        key: 'ArrowDown',
        keyCode: 40,
        code: 40,
      });
    });

    await act(async () => {
      await waitFor(async () => {
        const option = await screen.findByText('Monitoring Template Goal');
        expect(option).toBeVisible();
      });
    });
    expect(await screen.findByText(/this grant does not have the standard monitoring goal/i)).toBeVisible();
    expect(await screen.findByText(/grant 1 name/i)).toBeVisible();
    expect(await screen.findByText(/to avoid errors when submitting the report, you can either/i)).toBeVisible();
  });
});
