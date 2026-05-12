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

const selectActivityMethodFilter = async (methods) => {
  await openFilterMenu();

  const topicSelect = screen.getByLabelText('topic');
  await userEvent.selectOptions(topicSelect, 'conductMethod');

  const conditionSelect = screen.getByLabelText('condition');
  await userEvent.selectOptions(conditionSelect, 'is');

  const methodSelect = await screen.findByLabelText(/Select activity method to filter by/i);
  await selectEvent.select(methodSelect, methods);

  await userEvent.click(
    screen.getByRole('button', { name: /apply filters for collaboration reports/i })
  );
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

  it('selects a conduct method filter, queries the backend, and shows matching reports', async () => {
    renderLanding();

    await screen.findByText('You have no approved Collaboration Reports.');

    await selectActivityMethodFilter(['Virtual']);

    await waitFor(() => {
      expect(getReports).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            topic: 'conductMethod',
            condition: 'is',
            query: 'virtual',
          }),
        ])
      );
      expect(getAlerts).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            topic: 'conductMethod',
            condition: 'is',
            query: 'virtual',
          }),
        ])
      );
    });

    expect(await screen.findByRole('link', { name: 'VR-1' })).toBeInTheDocument();
  });

  it('supports selecting multiple conduct methods and returns all matching reports', async () => {
    renderLanding();

    await screen.findByText('You have no approved Collaboration Reports.');

    await selectActivityMethodFilter(['Email', 'Phone']);

    await waitFor(() => {
      expect(getReports).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            topic: 'conductMethod',
            condition: 'is',
            query: 'email',
          }),
          expect.objectContaining({
            topic: 'conductMethod',
            condition: 'is',
            query: 'phone',
          }),
        ])
      );
    });

    expect(await screen.findByRole('link', { name: 'EM-1' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'PH-1' })).toBeInTheDocument();
  });
});
