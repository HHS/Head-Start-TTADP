import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipientSpotlightDashboard from '../RecipientSpotlightDashboard';
import { getRecipientSpotlight } from '../../../../fetchers/recipientSpotlight';
import AppLoadingContext from '../../../../AppLoadingContext';
import FilterContext from '../../../../FilterContext';

jest.mock('../../../../fetchers/recipientSpotlight');

describe('Recipient spotlight Dashboard page', () => {
  const defaultProps = {
    filtersToApply: [],
    regionId: 1,
  };

  beforeEach(() => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '0',
        totalRecipients: '0',
        recipientPercentage: '0%',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderTest = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return render(
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <FilterContext.Provider value={{ filterKey: 'test-key' }}>
          <BrowserRouter>
            <RecipientSpotlightDashboard
              filtersToApply={mergedProps.filtersToApply}
              regionId={mergedProps.regionId}
            />
          </BrowserRouter>
        </FilterContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  it('renders without crashing', async () => {
    renderTest();

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalled();
    });
  });

  it('passes filtersToApply to RecipientSpotlightDataController', async () => {
    const filters = [
      {
        id: '1', topic: 'region', condition: 'is', query: '1',
      },
    ];
    renderTest({ filtersToApply: filters });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('region'),
        expect.any(Number),
      );
    });
  });

  it('passes regionId to RecipientSpotlightDataController', async () => {
    renderTest({ regionId: 5 });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalled();
    });
  });

  it('renders overview widget with spotlight data', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '25',
        totalRecipients: '100',
        recipientPercentage: '25.00%',
      },
    });

    renderTest();

    await waitFor(() => {
      expect(screen.getByText('25.00%')).toBeInTheDocument();
      expect(screen.getByText('25 of 100')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    getRecipientSpotlight.mockRejectedValue(new Error('Failed'));

    renderTest();

    await waitFor(() => {
      expect(screen.getByText(/Unable to fetch recipient spotlight data/i)).toBeInTheDocument();
    });
  });

  it('shows NoResultsFound when there are no recipients with priority indicators', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '0',
        totalRecipients: '100',
        recipientPercentage: '0%',
      },
    });

    renderTest();

    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
      expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
    });
  });

  it('does not show NoResultsFound when recipients with priority indicators exist', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [
        {
          recipientId: 1,
          regionId: 1,
          recipientName: 'Test Recipient',
          grantIds: ['12345'],
          lastTTA: '2024-03-15',
          childIncidents: true,
          deficiency: false,
          newRecipients: false,
          newStaff: false,
          noTTA: false,
          DRS: false,
          FEI: false,
          indicatorCount: 1,
        },
      ],
      count: 1,
      overview: {
        numRecipients: '1',
        totalRecipients: '100',
        recipientPercentage: '1%',
      },
    });

    renderTest();

    await waitFor(() => {
      expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
      expect(screen.queryByText('At this time, there are no recipients that have a priority indicator.')).not.toBeInTheDocument();
    });
  });

  it('renders RecipientSpotlightDataController component', async () => {
    renderTest();

    await waitFor(() => {
      expect(screen.getByText('Recipients with priority indicators')).toBeInTheDocument();
    });
  });

  it('renders with default empty filters', async () => {
    renderTest({ filtersToApply: [] });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        10,
      );
    });
  });
});
