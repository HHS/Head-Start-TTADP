import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import selectEvent from 'react-select-event';
import CommunicationLogUsersProvider from '../../CommunicationLogUsersProvider';
import FilterCommunicationLogStaff from '../FilterCommunicationLogStaff';

describe('FilterCommunicationLogStaff', () => {
  afterEach(() => fetchMock.restore());

  const renderFilter = (onApply, query = []) => {
    fetchMock.get('/api/communication-logs/region/1/additional-data', {
      regionalUsers: [{ value: 74, label: 'Test User' }],
      standardGoals: [],
      recipients: [],
      groups: [],
    });

    render(
      <CommunicationLogUsersProvider regionId="1">
        <FilterCommunicationLogStaff onApply={onApply} inputId="staff" query={query} />
      </CommunicationLogUsersProvider>
    );
  };

  it('renders the regional users and applies the selected user id', async () => {
    const onApply = jest.fn();
    act(() => {
      renderFilter(onApply);
    });

    const select = await screen.findByText(/Select user to filter by/i);
    await selectEvent.select(select, ['Test User']);
    expect(onApply).toHaveBeenCalledWith([74]);
  });
});
