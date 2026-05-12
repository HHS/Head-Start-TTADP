import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import selectEvent from 'react-select-event';
import AriaLiveContext from '../../../AriaLiveContext';
import { getAlerts, getReports } from '../../../fetchers/collaborationReports';
import UserContext from '../../../UserContext';
import CollabReportsLanding from '../index';

jest.mock('../../../fetchers/collaborationReports');
jest.mock('../../../hooks/useFilters');

const useFilters = require('../../../hooks/useFilters');

const mockUser = {
  id: 1,
  name: 'Test User',
  homeRegionId: 1,
  permissions: [
    {
      regionId: 1,
      scopeId: 2,
    },
  ],
};

const createReport = ({ id, displayId, name }) => ({
  id,
  displayId,
  name,
  startDate: '2026-01-01',
  author: { fullName: 'Test Author' },
  createdAt: '2026-01-02T10:00:00Z',
  collaboratingSpecialists: [{ fullName: 'Test Collaborator' }],
  updatedAt: '2026-01-03T10:00:00Z',
  link: `/collaboration-reports/${id}`,
});

const reportFixtures = {
  virtual: createReport({ id: 1, displayId: 'VR-1', name: 'Virtual report' }),
  email: createReport({ id: 2, displayId: 'EM-1', name: 'Email report' }),
  phone: createReport({ id: 3, displayId: 'PH-1', name: 'Phone report' }),
};

const buildReportsResponse = (filters = []) => {
  const methods = filters
    .filter((filter) => filter.topic === 'conductMethod')
    .map((filter) => filter.query)
    .filter(Boolean);

  if (!methods.length) {
    return { count: 0, rows: [] };
  }

  const rows = methods.map((method) => reportFixtures[method]).filter(Boolean);

  return {
    count: rows.length,
    rows,
  };
};

const renderLanding = () =>
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
        <UserContext.Provider value={{ user: mockUser }}>
          <CollabReportsLanding />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>
  );

const openFilterMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: /open filters for this page/i }));
  await screen.findByLabelText('topic');
};

describe('CollabReportsLanding integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFilters.default.mockImplementation((...args) => {
      const filterConfig = args[4];
      const [filters, setFilters] = React.useState([]);

      return {
        regions: [1],
        userHasOnlyOneRegion: true,
        defaultRegion: 1,
        hasMultipleRegions: false,
        allRegionsFilters: [],
        defaultFilters: [],
        filters,
        setFilters,
        onApplyFilters: (newFilters) => setFilters(newFilters),
        onRemoveFilter: (id) =>
          setFilters((currentFilters) => currentFilters.filter((filter) => filter.id !== id)),
        filterConfig,
      };
    });

    getAlerts.mockImplementation(async (_, filters) => ({
      count: 0,
      rows: [],
      filters,
    }));

    getReports.mockImplementation(async (_, filters) => buildReportsResponse(filters));
  });

  describe('Activity purpose filter', () => {
    const purposeReportFixtures = {
      participate_work_groups: createReport({
        id: 10,
        displayId: 'PW-1',
        name: 'Work groups report',
      }),
      support_coordination: createReport({
        id: 11,
        displayId: 'SC-1',
        name: 'Coordination report',
      }),
    };

    const buildPurposeReportsResponse = (filters = []) => {
      const isFilters = filters.filter(
        (f) => f.topic === 'activityPurpose' && f.condition === 'is'
      );
      const isNotFilters = filters.filter(
        (f) => f.topic === 'activityPurpose' && f.condition === 'is not'
      );

      if (!isFilters.length && !isNotFilters.length) {
        return { count: 0, rows: [] };
      }

      let rows = Object.values(purposeReportFixtures);

      if (isFilters.length) {
        const includedKeys = isFilters.map((f) => f.query);
        rows = includedKeys.map((key) => purposeReportFixtures[key]).filter(Boolean);
      }

      if (isNotFilters.length) {
        const excludedKeys = isNotFilters.map((f) => f.query);
        rows = rows.filter((r) => !excludedKeys.some((key) => purposeReportFixtures[key] === r));
      }

      return { count: rows.length, rows };
    };

    const applyActivityPurposeFilter = async (condition, purposeLabel) => {
      await openFilterMenu();
      await userEvent.selectOptions(screen.getByLabelText('topic'), 'activityPurpose');
      await userEvent.selectOptions(screen.getByLabelText('condition'), condition);
      await selectEvent.select(
        screen.getByLabelText('Select activity purpose to filter by'),
        purposeLabel
      );
      await userEvent.click(
        screen.getByRole('button', { name: /apply filters for collaboration reports/i })
      );
    };

    beforeEach(() => {
      getReports.mockImplementation(async (_, filters) => buildPurposeReportsResponse(filters));
    });

    it('fetches and displays reports matching a single "is" activity purpose', async () => {
      renderLanding();

      await applyActivityPurposeFilter(
        'is',
        'Participate in national, regional, state, and local work groups and meetings'
      );

      await waitFor(() => {
        expect(getReports).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              topic: 'activityPurpose',
              condition: 'is',
              query: 'participate_work_groups',
            }),
          ])
        );
      });

      expect((await screen.findAllByText('Work groups report')).length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Coordination report')).toHaveLength(0);
    });

    it('fetches and displays reports matching multiple "is" activity purposes', async () => {
      renderLanding();

      await openFilterMenu();
      await userEvent.selectOptions(screen.getByLabelText('topic'), 'activityPurpose');
      await userEvent.selectOptions(screen.getByLabelText('condition'), 'is');
      await selectEvent.select(screen.getByLabelText('Select activity purpose to filter by'), [
        'Participate in national, regional, state, and local work groups and meetings',
        'Support partnerships, coordination, and collaboration with state/regional partners',
      ]);
      await userEvent.click(
        screen.getByRole('button', { name: /apply filters for collaboration reports/i })
      );

      await waitFor(() => {
        const calls = getReports.mock.calls;
        const lastFilters = calls[calls.length - 1][1];
        const purposeFilters = lastFilters.filter((f) => f.topic === 'activityPurpose');
        expect(purposeFilters).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ query: 'participate_work_groups', condition: 'is' }),
            expect.objectContaining({ query: 'support_coordination', condition: 'is' }),
          ])
        );
      });

      expect((await screen.findAllByText('Work groups report')).length).toBeGreaterThan(0);
      expect((await screen.findAllByText('Coordination report')).length).toBeGreaterThan(0);
    });

    it('passes "is not" condition to the fetcher', async () => {
      renderLanding();

      await applyActivityPurposeFilter(
        'is not',
        'Participate in national, regional, state, and local work groups and meetings'
      );

      await waitFor(() => {
        expect(getReports).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              topic: 'activityPurpose',
              condition: 'is not',
              query: 'participate_work_groups',
            }),
          ])
        );
      });
    });

    it('refetches without the activity purpose filter after removing the pill', async () => {
      renderLanding();

      await applyActivityPurposeFilter(
        'is',
        'Support partnerships, coordination, and collaboration with state/regional partners'
      );

      await waitFor(() => {
        expect(getReports).toHaveBeenCalledWith(
          expect.anything(),
          expect.arrayContaining([
            expect.objectContaining({
              topic: 'activityPurpose',
              condition: 'is',
              query: 'support_coordination',
            }),
          ])
        );
      });

      const removePillButton = await screen.findByRole('button', {
        name: /This button removes the filter: Activity purpose is Support partnerships/i,
      });
      await userEvent.click(removePillButton);

      await waitFor(() => {
        const calls = getReports.mock.calls;
        const lastFilters = calls[calls.length - 1][1];
        expect(lastFilters.every((f) => f.topic !== 'activityPurpose')).toBe(true);
      });
    });
  });
});
