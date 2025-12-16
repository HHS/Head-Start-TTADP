import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import RecipientSpotlightDashboard from '../RecipientSpotlightDashboard';
import { getRecipientSpotlight } from '../../../../fetchers/recipientSpotlight';
import AppLoadingContext from '../../../../AppLoadingContext';

jest.mock('../../../../fetchers/recipientSpotlight');

describe('Recipient spotlight Dashboard page', () => {
  const defaultProps = {
    filtersToApply: [],
  };

  beforeEach(() => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
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
    render(
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <RecipientSpotlightDashboard filtersToApply={mergedProps.filtersToApply} />
      </AppLoadingContext.Provider>,
    );
  };

  it('renders without crashing', async () => {
    renderTest();

    await waitFor(() => {
      expect(getRecipientSpotlight).toHaveBeenCalled();
    });
  });

  it('renders overview widget with spotlight data', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
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
      expect(screen.getByText(/Unable to load overview data/i)).toBeInTheDocument();
    });
  });

  it('shows NoResultsFound when there are no recipients with priority indicators', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [],
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

  it('shows NoResultsFound when recipients exist but have no priority indicators', async () => {
    getRecipientSpotlight.mockResolvedValue({
      recipients: [
        {
          recipientId: 1,
          recipientName: 'Test Recipient',
          childIncidents: false,
          deficiency: false,
          newRecipients: false,
          newStaff: false,
          noTTA: false,
          DRS: false,
          FEI: false,
        },
      ],
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
          recipientName: 'Test Recipient',
          childIncidents: true,
          deficiency: false,
          newRecipients: false,
          newStaff: false,
          noTTA: false,
          DRS: false,
          FEI: false,
        },
      ],
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
});
