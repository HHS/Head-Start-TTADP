import React from 'react';
import '@testing-library/jest-dom';
import join from 'url-join';
import {
  screen, render, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import App from '../App';
import { mockWindowProperty } from '../testHelpers';

const cleanupUrl = '/api/activity-reports/storage-cleanup';

describe('localStorageCleanup', () => {
  const removeItem = jest.fn();

  afterEach(() => fetchMock.restore());
  const userUrl = join('api', 'user');
  const logoutUrl = join('api', 'logout');
  const alertsUrl = join('api', 'alerts');

  describe('when authenticated, local storage is queried', () => {
    mockWindowProperty('localStorage', {
      removeItem,
      setItem: jest.fn(),
      getItem: jest.fn(),
    });

    beforeEach(async () => {
      const user = { name: 'name', permissions: [] };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(join((userUrl, 'statistics')), {
        daysSinceJoined: 1,
        arsCreated: 17343,
        arsCollaboratedOn: 0,
        ttaProvided: '1406 days 12 hrs',
        recipientsReached: 1573,
        grantsServed: 2407,
        participantsReached: 162963,
        goalsApproved: 30803,
        objectivesApproved: 53990,
      });
      fetchMock.get(logoutUrl, 200);
      fetchMock.get(cleanupUrl, [{ id: 2 }, { id: 3 }]);
      fetchMock.get(alertsUrl, null);
      render(<App />);
      await screen.findByText('Activity Reports');
    });

    it('queries local storage', async () => {
      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(true));

      const calls = [
        '__storage_test__',
        'ar-form-data-2-0.2',
        'ar-additional-data-2-0.2',
        'ar-can-edit-2-0.2',
        'ar-form-data-3-0.2',
        'ar-additional-data-3-0.2',
        'ar-can-edit-3-0.2',
      ];

      calls.forEach((call) => {
        expect(removeItem).toHaveBeenCalledWith(call);
      });
    });
  });

  describe('if unauthenticated', () => {
    mockWindowProperty('localStorage', {
      removeItem,
      setItem: jest.fn(),
      getItem: jest.fn(),
    });

    beforeEach(() => fetchMock.get(alertsUrl, null));

    it('displays the login button', async () => {
      fetchMock.get(userUrl, 401);
      render(<App />);
      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(false));
      expect(removeItem).toHaveBeenCalledTimes(1);
      expect(removeItem).toHaveBeenCalledWith('__storage_test__');
    });
  });

  describe('if local storage is not available', () => {
    beforeEach(async () => {
      const user = { name: 'name', permissions: [] };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(logoutUrl, 200);
      fetchMock.get(cleanupUrl, [{ id: 2 }, { id: 3 }]);
      fetchMock.get(alertsUrl, null);
      render(<App />);
      await screen.findByText('Activity Reports');
    });

    it('the API & local storage will not be called', async () => {
      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(false));
      expect(removeItem).not.toHaveBeenCalled();
    });
  });

  describe('handles an error', () => {
    mockWindowProperty('localStorage', {
      removeItem,
      setItem: jest.fn(),
      getItem: jest.fn(),
    });

    beforeEach(async () => {
      const user = { name: 'name', permissions: [] };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(join((userUrl, 'statistics')), {
        daysSinceJoined: 1,
        arsCreated: 17343,
        arsCollaboratedOn: 0,
        ttaProvided: '1406 days 12 hrs',
        recipientsReached: 1573,
        grantsServed: 2407,
        participantsReached: 162963,
        goalsApproved: 30803,
        objectivesApproved: 53990,
      });
      fetchMock.get(logoutUrl, 200);
      fetchMock.get(cleanupUrl, 500);
      fetchMock.get(alertsUrl, null);
      render(<App />);
    });

    it('handles a thrown error', async () => {
      await screen.findByText('Activity Reports');
      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(true));
      expect(removeItem).toHaveBeenCalledTimes(1);
      expect(removeItem).toHaveBeenCalledWith('__storage_test__');
    });
  });
});
