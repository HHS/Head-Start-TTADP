import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { mockWindowProperty } from '../../../testHelpers';
import { ReportsRow } from '../MyAlerts';
import activityReports from '../mocks';
import UserContext from '../../../UserContext';

const user = {
  name: 'test@test.com',
};

describe('ReportsRow', () => {
  const removeItem = jest.fn();

  mockWindowProperty('localStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem,
  });

  const renderReportsRow = (removeAlert = jest.fn()) => {
    const report = {
      ...activityReports[0],
      id: activityReports[0].id.toString(),
      calculatedStatus: 'needs_action',
    };

    const message = {
      reportId: report.id,
      status: 'unlocked',
    };

    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter>
          <ReportsRow
            reports={[report, activityReports[1]]}
            removeAlert={removeAlert}
            message={message}
          />
        </MemoryRouter>
      </UserContext.Provider>,
    );
  };

  it('calls remove alert and cleans up local storage', async () => {
    fetchMock.delete('/api/activity-reports/1', 204);
    fetchMock.delete('/api/activity-reports/0', 204);
    const removeAlert = jest.fn();
    renderReportsRow(removeAlert);
    const [context] = await screen.findAllByRole('button', { name: /view activity report 1/i });
    userEvent.click(context);
    const [deleteButton] = await screen.findAllByRole('button', { name: /delete/i });
    userEvent.click(deleteButton);
    const confirmDelete = document.querySelector('[aria-label="This button will permanently delete the report."]');
    userEvent.click(confirmDelete);
    expect(fetchMock.called()).toBe(true);
    await waitFor(() => expect(removeAlert).toHaveBeenCalled());
    expect(removeItem).toHaveBeenCalled();
  });

  it('reports row shows the correct status', async () => {
    act(() => {
      renderReportsRow();
    });
    const needsAction = await screen.findAllByText(/needs action/i);
    expect(needsAction.length).toBe(1);

    const approved = await screen.findAllByText(/approved/i);
    expect(approved.length).toBe(1);
  });
});
