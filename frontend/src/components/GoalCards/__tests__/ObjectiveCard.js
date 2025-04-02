import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import ObjectiveCard from '../ObjectiveCard';
import UserContext from '../../../UserContext';

describe('ObjectiveCard', () => {
  const history = createMemoryHistory();
  const renderObjectiveCard = (
    objective,
    dispatchStatusChange = jest.fn(),
    isMonitoringGoal = false,
  ) => {
    render(
      <UserContext.Provider value={{
        user: {
          permissions: [{
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          }],
        },
      }}
      >
        <Router history={history}>
          <ObjectiveCard
            objective={objective}
            regionId={1}
            goalStatus="In Progress"
            objectivesExpanded
            dispatchStatusChange={dispatchStatusChange}
            isMonitoringGoal={isMonitoringGoal}
          />
        </Router>
      </UserContext.Provider>,
    );
  };

  afterEach(() => fetchMock.restore());

  it('renders legacy reports', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      citations: [],
      supportTypes: ['Planning'],
      activityReports: [
        {
          displayId: 'r-123',
          legacyId: '123',
          number: '678',
          id: 678,
          endDate: '2020-01-01',
        },
      ],
    };
    renderObjectiveCard(objective);
    expect(screen.getByText('This is an objective')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    const link = screen.getByText('r-123');
    expect(link).toHaveAttribute('href', '/activity-reports/legacy/123');
  });

  it('updates objective status', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      citations: [],
      supportTypes: ['Planning'],
      activityReports: [],
    };
    const dispatchStatusChange = jest.fn();
    renderObjectiveCard(objective, dispatchStatusChange);

    expect(screen.getByText('This is an objective')).toBeInTheDocument();

    const changeButton = await screen.findByRole('button', { name: /change status/i });
    act(() => {
      userEvent.click(changeButton);
    });

    expect(dispatchStatusChange).toHaveBeenCalledWith([123], 'In Progress');
    fetchMock.put('/api/objectives/status', { ids: [123], status: 'Complete' });

    const completeButton = await screen.findByRole('button', { name: /complete/i });
    act(() => {
      userEvent.click(completeButton);
    });

    expect(fetchMock.called('/api/objectives/status')).toBe(true);
    await waitFor(() => {
      expect(dispatchStatusChange).toHaveBeenCalledWith([123], 'Complete');
    });
  });

  it('shows citations addressed field when the prop isMonitoringGoal is true', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      supportTypes: ['Planning'],
      activityReports: [],
      citations: ['citation1', 'citation2'],
    };

    renderObjectiveCard(objective, jest.fn(), true);

    expect(screen.getByText('This is an objective')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    expect(screen.getByText('Citations addressed')).toBeInTheDocument();
    expect(screen.getByText('citation1, citation2')).toBeInTheDocument();
  });

  it('hides citations addressed field when the prop isMonitoringGoal is false', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      supportTypes: ['Planning'],
      activityReports: [],
      citations: [],
    };

    renderObjectiveCard(objective, jest.fn(), false);
    expect(screen.getByText('This is an objective')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    expect(screen.queryAllByText('Citations addressed').length).toBe(0);
    expect(screen.queryAllByText('citation1, citation2').length).toBe(0);
  });

  it('suspends an objective', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      citations: [],
      supportTypes: ['Planning'],
      activityReports: [],
    };
    const dispatchStatusChange = jest.fn();
    renderObjectiveCard(objective, dispatchStatusChange);

    expect(screen.getByText('This is an objective')).toBeInTheDocument();

    const changeButton = await screen.findByRole('button', { name: /change status/i });
    act(() => {
      userEvent.click(changeButton);
    });

    expect(dispatchStatusChange).toHaveBeenCalledWith([123], 'In Progress');
    fetchMock.put('/api/objectives/status', { ids: [123], status: 'Suspended' });

    const suspendButton = await screen.findByRole('button', { name: /Suspended/i });
    act(() => {
      userEvent.click(suspendButton);
    });

    const radio = await screen.findByRole('radio', { name: /Regional Office request/i });
    act(() => {
      userEvent.click(radio);
    });

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    expect(fetchMock.called('/api/objectives/status')).toBe(true);
    await waitFor(() => {
      expect(dispatchStatusChange).toHaveBeenCalledWith([123], 'Suspended');
    });
  });
});
