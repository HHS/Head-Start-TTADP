import '@testing-library/jest-dom';
import React from 'react';
import {
  render, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import Landing from '../index';
import { generateXFakeReports, overviewRegionOne } from '../mocks';
import { mockWindowProperty } from '../../../testHelpers';

jest.mock('../../../fetchers/helpers');

const mockAnnounce = jest.fn();

const cleanupUrl = '/api/activity-reports/storage-cleanup';
const overviewUrlWithRegionAndNoDate = '/api/widgets/overview?region.in[]=1';

const renderLanding = (user) => {
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <Landing authenticated />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>,
  );
};

describe('localStorageCleanup', () => {
  const removeItem = jest.fn();
  mockWindowProperty('sessionStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
  });

  beforeEach(() => {
    fetchMock.get(overviewUrlWithRegionAndNoDate, overviewRegionOne);
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1', { count: 1, rows: generateXFakeReports(1), recipients: [] });
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10&region.in[]=1', { count: 1, alerts: generateXFakeReports(1), recipients: [] });
  });

  afterEach(() => fetchMock.restore());

  describe('if local storage is not available', () => {
    it('does not call the API or local storage', async () => {
      fetchMock.get(cleanupUrl, [{ id: 2 }, { id: 3 }]);
      const user = {
        name: 'test@test.com',
        homeRegionId: 1,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
          {
            scopeId: 3,
            regionId: 2,
          },
        ],
      };

      renderLanding(user);

      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(false));
      expect(removeItem).not.toHaveBeenCalled();
    });
  });

  describe('if local storage is available', () => {
    mockWindowProperty('localStorage', {
      removeItem,
      setItem: jest.fn(),
      getItem: jest.fn(),
    });

    it('calls local storage', async () => {
      fetchMock.get(cleanupUrl, [{ id: 2 }, { id: 3 }]);
      const user = {
        name: 'test@test.com',
        homeRegionId: 1,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
          {
            scopeId: 3,
            regionId: 2,
          },
        ],
      };

      renderLanding(user);

      await waitFor(() => expect(fetchMock.called(cleanupUrl)).toBe(true));

      const calls = [
        '__storage_test__',
        'ar-form-data-2-0.1',
        'ar-additional-data-2-0.1',
        'ar-can-edit-2-0.1',
        'ar-form-data-3-0.1',
        'ar-additional-data-3-0.1',
        'ar-can-edit-3-0.1',
      ];

      calls.forEach((call) => {
        expect(removeItem).toHaveBeenCalledWith(call);
      });
    });
  });
});
