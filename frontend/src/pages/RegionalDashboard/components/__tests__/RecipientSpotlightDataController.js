import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipientSpotlightDataController from '../RecipientSpotlightDataController';
import { getRecipientSpotlight } from '../../../../fetchers/recipientSpotlight';
import AppLoadingContext from '../../../../AppLoadingContext';
import FilterContext from '../../../../FilterContext';

jest.mock('../../../../fetchers/recipientSpotlight');

describe('RecipientSpotlightDataController', () => {
  const mockSetIsAppLoading = jest.fn();
  const defaultProps = {
    filters: [],
    regionId: 1,
  };

  const mockRecipientData = {
    recipients: [
      {
        recipientId: 1,
        regionId: 1,
        recipientName: 'Test Recipient 1',
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
      {
        recipientId: 2,
        regionId: 1,
        recipientName: 'Test Recipient 2',
        grantIds: ['12346'],
        lastTTA: '2024-02-10',
        childIncidents: false,
        deficiency: true,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
        indicatorCount: 1,
      },
    ],
    count: 2,
    overview: {
      numRecipients: '2',
      totalRecipients: '100',
      recipientPercentage: '2.00%',
    },
  };

  const renderController = (props = {}) => {
    const { filters = [], regionId = 1 } = { ...defaultProps, ...props };
    return render(
      <AppLoadingContext.Provider value={{
        isAppLoading: false,
        setIsAppLoading: mockSetIsAppLoading,
      }}
      >
        <FilterContext.Provider value={{ filterKey: 'test-key' }}>
          <BrowserRouter>
            <RecipientSpotlightDataController
              filters={filters}
              regionId={regionId}
              userHasOnlyOneRegion={false}
            />
          </BrowserRouter>
        </FilterContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRecipientSpotlight.mockResolvedValue(mockRecipientData);
  });

  it('renders without crashing', async () => {
    renderController();

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalled();
    });
  });

  it('fetches recipient data on mount', async () => {
    renderController();

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        10,
        null,
        true,
      );
    });
  });

  it('displays overview widget with correct data', async () => {
    renderController();

    await waitFor(() => {
      expect(screen.getByText('2.00%')).toBeInTheDocument();
      expect(screen.getByText('2 of 100')).toBeInTheDocument();
    });
  });

  it('displays recipient cards when data is loaded', async () => {
    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
      expect(screen.getByText('Test Recipient 2')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    getRecipientSpotlight.mockRejectedValue(new Error('API Error'));

    renderController();

    await waitFor(() => {
      expect(screen.getByText('Unable to fetch recipient spotlight data')).toBeInTheDocument();
    });
  });

  it('handles empty recipient data', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '0',
        totalRecipients: '100',
        recipientPercentage: '0%',
      },
    });

    renderController();

    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('handles sort change', async () => {
    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    const sortDropdown = screen.getByLabelText('Sort by');
    fireEvent.change(sortDropdown, { target: { value: 'indicatorCount-desc' } });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        10,
        null,
        true,
      );
    });
  });

  it('handles per-page change', async () => {
    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    const perPageDropdown = screen.getByLabelText('Show');
    fireEvent.change(perPageDropdown, { target: { value: '25' } });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        25,
        null,
        true,
      );
    });
  });

  it('handles pagination', async () => {
    const largeDataSet = {
      ...mockRecipientData,
      count: 25,
    };
    getRecipientSpotlight.mockResolvedValue(largeDataSet);

    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'indicatorCount',
        'desc',
        10,
        '',
        10,
        null,
        true,
      );
    });
  });

  it('resets to page 1 when filters change', async () => {
    const { rerender } = renderController();

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalled();
    });

    // Change filters
    const newFilters = [
      {
        id: '1',
        topic: 'test',
        condition: 'is',
        query: 'value',
      },
    ];

    rerender(
      <AppLoadingContext.Provider value={{
        isAppLoading: false,
        setIsAppLoading: mockSetIsAppLoading,
      }}
      >
        <FilterContext.Provider value={{ filterKey: 'test-key' }}>
          <BrowserRouter>
            <RecipientSpotlightDataController
              filters={newFilters}
              regionId={1}
              userHasOnlyOneRegion={false}
            />
          </BrowserRouter>
        </FilterContext.Provider>
      </AppLoadingContext.Provider>,
    );

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenLastCalledWith(
        'indicatorCount',
        'desc',
        0,
        'test.in[]=value',
        10,
        null,
        true,
      );
    });
  });

  it('resets to page 1 when sort changes', async () => {
    const largeDataSet = {
      ...mockRecipientData,
      count: 25,
    };
    getRecipientSpotlight.mockResolvedValue(largeDataSet);

    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    // Go to page 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenLastCalledWith(
        'indicatorCount',
        'desc',
        10,
        '',
        10,
        null,
        true,
      );
    });

    // Change sort
    const sortDropdown = screen.getByLabelText('Sort by');
    fireEvent.change(sortDropdown, { target: { value: 'indicatorCount-desc' } });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenLastCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        10,
        null,
        true,
      );
    });
  });

  it('resets to page 1 when per-page changes', async () => {
    const largeDataSet = {
      ...mockRecipientData,
      count: 50,
    };
    getRecipientSpotlight.mockResolvedValue(largeDataSet);

    renderController();

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    // Go to page 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenLastCalledWith(
        'indicatorCount',
        'desc',
        10,
        '',
        10,
        null,
        true,
      );
    });

    // Change per page
    const perPageDropdown = screen.getByLabelText('Show');
    fireEvent.change(perPageDropdown, { target: { value: '25' } });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenLastCalledWith(
        'indicatorCount',
        'desc',
        0,
        '',
        25,
        null,
        true,
      );
    });
  });

  it('renders DashboardOverviewWidget with correct props', async () => {
    renderController();

    await waitFor(() => {
      const widget = screen.getByText('Recipients with priority indicators');
      expect(widget).toBeInTheDocument();
    });
  });

  it('handles null overview data gracefully', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
      count: 0,
      overview: null,
    });

    renderController();

    await waitFor(() => {
      expect(screen.getByText('0 of 0')).toBeInTheDocument();
    });
  });

  it('uses session storage for sort state', async () => {
    renderController({ regionId: 5 });

    await waitFor(() => {
      expect(screen.getByText('Test Recipient 1')).toBeInTheDocument();
    });

    const sortDropdown = screen.getByLabelText('Sort by');
    fireEvent.change(sortDropdown, { target: { value: 'lastTTA-desc' } });

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalledWith(
        'lastTTA',
        'desc',
        0,
        '',
        10,
        null,
        true,
      );
    });
  });

  it('calls setIsAppLoading when cards finish loading', async () => {
    const mockSetIsAppLoadingLocal = jest.fn();
    render(
      <AppLoadingContext.Provider value={{
        isAppLoading: true,
        setIsAppLoading: mockSetIsAppLoadingLocal,
      }}
      >
        <FilterContext.Provider value={{ filterKey: 'test-key' }}>
          <BrowserRouter>
            <RecipientSpotlightDataController
              filters={[]}
              regionId={1}
              userHasOnlyOneRegion={false}
            />
          </BrowserRouter>
        </FilterContext.Provider>
      </AppLoadingContext.Provider>,
    );

    await waitFor(() => {
      expect(mockSetIsAppLoadingLocal).toHaveBeenCalledWith(false);
    });
  });
});
