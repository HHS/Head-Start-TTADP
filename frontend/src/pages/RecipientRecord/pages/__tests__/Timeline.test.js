import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { getRecipientTimeline } from '../../../../fetchers/recipient';
import useFetch from '../../../../hooks/useFetch';
import Timeline from '../Timeline';

jest.mock('../../../../hooks/useFetch');
jest.mock('../../../../fetchers/recipient', () => ({
  getRecipientTimeline: jest.fn(),
}));

const renderTimeline = () =>
  render(
    <MemoryRouter>
      <Timeline recipientId="401" regionId="1" />
    </MemoryRouter>
  );

describe('Recipient Record - TTA Timeline', () => {
  beforeEach(() => {
    useFetch.mockReturnValue({
      data: { count: 0, events: [] },
      error: '',
      loading: false,
    });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page shell and design controls', () => {
    renderTimeline();

    expect(screen.getByRole('heading', { name: 'TTA timeline' })).toBeVisible();
    expect(screen.getByRole('button', { name: /open filters for this page/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'About this data' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('desc');
    expect(
      screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' })
    ).toBeVisible();
    expect(screen.getByText('Date', { selector: 'strong' })).toBeVisible();
  });

  it('sends the multi-recipient communication checkbox state with the timeline request', async () => {
    renderTimeline();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Hide multi-recipient communications',
    });

    userEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    await waitFor(async () => {
      const [, fetchTimeline] = useFetch.mock.calls[useFetch.mock.calls.length - 1];
      await fetchTimeline();
    });

    expect(getRecipientTimeline).toHaveBeenLastCalledWith(
      '401',
      '1',
      expect.objectContaining({ excludeMultiRecipientCommunications: true })
    );
  });

  it('renders a loading state', () => {
    useFetch.mockReturnValue({
      data: { count: 0, events: [] },
      error: '',
      loading: true,
    });

    renderTimeline();

    expect(screen.getByLabelText('Loading TTA timeline')).toBeVisible();
    expect(screen.queryByText('No timeline events found.')).not.toBeInTheDocument();
  });

  it('renders an empty state', () => {
    renderTimeline();

    expect(screen.getByText('No timeline events found.')).toBeVisible();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeVisible();
  });

  it('renders an error state', () => {
    useFetch.mockReturnValue({
      data: { count: 0, events: [] },
      error: 'Unable to load the TTA timeline.',
      loading: false,
    });

    renderTimeline();

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load the TTA timeline.');
    expect(screen.queryByText('No timeline events found.')).not.toBeInTheDocument();
  });

  it('renders a result count when timeline events exist', () => {
    useFetch.mockReturnValue({
      data: { count: 2, events: [{ id: 1 }, { id: 2 }] },
      error: '',
      loading: false,
    });

    renderTimeline();

    expect(screen.getByTestId('timeline-results')).toHaveTextContent('2 timeline events');
  });
});
