/* eslint-disable react/jsx-props-no-spreading */

import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import join from 'url-join';
import RecipientsWithGroups from '../RecipientsWithGroups';

const sessionsUrl = join('/', 'api', 'session-reports');
const participantsUrl = join(sessionsUrl, 'participants', '1');
const groupsUrl = join(sessionsUrl, 'groups', '?region=1');

const mockRecipients = [
  {
    id: 1,
    name: 'Recipient 1',
    grants: [{ id: 101, name: 'Recipient 1 Grant 1' }],
  },
];

const mockGroups = [{ id: 1, name: 'Group 1', grants: [{ id: 101 }] }];

const participantCallCount = () =>
  fetchMock.calls().filter(([url]) => String(url).startsWith(participantsUrl)).length;

// eslint-disable-next-line react/prop-types
const TestRecipientsWithGroups = (props) => {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      recipients: [],
      recipientGroup: null,
    },
  });

  return (
    <FormProvider {...hookForm}>
      <RecipientsWithGroups {...props} />
    </FormProvider>
  );
};

describe('RecipientsWithGroups', () => {
  beforeEach(() => {
    fetchMock.get(`begin:${participantsUrl}`, mockRecipients);
    fetchMock.get(groupsUrl, mockGroups);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders without crashing with default props', async () => {
    expect(() => {
      render(<TestRecipientsWithGroups regionId={1} />);
    }).not.toThrow();

    expect(screen.getByLabelText(/recipients/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock.called(participantsUrl)).toBe(true);
      expect(fetchMock.called(groupsUrl)).toBe(true);
    });
  });

  it('passes additionalRegions to the participants fetch URL', async () => {
    render(<TestRecipientsWithGroups regionId={1} additionalRegions={['11', '12']} />);

    await waitFor(() => expect(participantCallCount()).toBe(1));

    const calledUrl = fetchMock.calls().find(([url]) => String(url).startsWith(participantsUrl))[0];
    expect(calledUrl).toContain('additionalRegions=11');
    expect(calledUrl).toContain('additionalRegions=12');
  });

  it('does NOT refetch recipients when additionalRegions reference changes but values are same', async () => {
    const { rerender } = render(
      <TestRecipientsWithGroups regionId={1} additionalRegions={['11']} />
    );

    await waitFor(() => expect(participantCallCount()).toBe(1));

    rerender(<TestRecipientsWithGroups regionId={1} additionalRegions={['11']} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(participantCallCount()).toBe(1);
  });

  it('fetches recipients again when additionalRegions values actually change', async () => {
    const { rerender } = render(
      <TestRecipientsWithGroups regionId={1} additionalRegions={['11']} />
    );

    await waitFor(() => expect(participantCallCount()).toBe(1));

    rerender(<TestRecipientsWithGroups regionId={1} additionalRegions={['11', '12']} />);

    await waitFor(() => expect(participantCallCount()).toBe(2));
  });

  it('groups fetch runs once per regionId, not on groups state changes', async () => {
    render(<TestRecipientsWithGroups regionId={1} />);

    await waitFor(() => expect(fetchMock.calls(groupsUrl)).toHaveLength(1));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock.calls(groupsUrl)).toHaveLength(1);
  });
});
