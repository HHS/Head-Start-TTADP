/* eslint-disable react/prop-types */
import React from 'react';
import { createMemoryHistory } from 'history';
import { MemoryRouter, Route } from 'react-router';
import {
  render, screen, waitFor, act, within,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { COMMUNICATION_PURPOSES, COMMUNICATION_RESULTS } from '@ttahub/common';
import RegionalCommunicationLog from '..';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';

const completeLog = {
  displayId: 'R01-CL-13213',
  id: 13213,
  userId: 355,
  data: {
    goals: [{ label: 'CQI and Data', value: '24740' }], notes: 'sf', method: 'In person', result: 'New TTA accepted', purpose: "Program Specialist's site visit", duration: 1, regionId: '1', createdAt: '2025-01-30T01:34:04.142Z', displayId: 'R01-CL-13213', pageState: { 1: 'Complete', 2: 'Complete', 3: 'Complete' }, otherStaff: [{ label: 'OtherStaff', value: '74' }], pocComplete: false, recipientId: '', communicationDate: '01/15/2025', recipientNextSteps: [{ note: 'hh', completeDate: '01/23/2025' }], specialistNextSteps: [{ note: 'ff', completeDate: '01/21/2025' }], 'pageVisited-next-steps': 'true', 'pageVisited-supporting-attachments': 'true',
  },
  createdAt: '2025-01-30T01:34:04.142Z',
  updatedAt: '2025-01-30T14:37:25.437Z',
  authorName: 'Author Name',
  recipients: [{
    id: 707,
    uei: 'FND1A6MY3JD3',
    name: 'Abshire and Sons',
    recipientType: 'Community Action Agency (CAA)',
    deleted: false,
    createdAt: '2021-03-16T01:20:43.530Z',
    updatedAt: '2025-01-01T09:00:01.970Z',
    CommunicationLogRecipient: {
      id: 13209, recipientId: 707, communicationLogId: 13213, createdAt: '2025-01-30T01:34:04.471Z', updatedAt: '2025-01-30T01:34:04.471Z',
    },
  }],
  files: [],
  author: { name: 'Author Name', id: 355 },
};

describe('RegionalCommunicationLog', () => {
  const user = { id: 1, name: 'Test User', roles: ['admin'] };
  const setIsAppLoading = jest.fn();
  const history = createMemoryHistory();

  const renderComponent = (route) => {
    history.push(route);
    render(
      <MemoryRouter initialEntries={[route]}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading }}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              <Route path="/region/:regionId/log/:logId/:currentPage">
                <RegionalCommunicationLog />
              </Route>
            </NetworkContext.Provider>
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    fetchMock.restore();
    fetchMock.get('/api/communication-logs/region/1/additional-data', {
      regionalUsers: [{ value: 74, label: 'OtherStaff' }],
      standardGoals: [{ label: 'CQI and Data', value: '24740' }],
      recipients: [{
        value: 707,
        label: 'Abshire and Sons',
      }],
      groups: [],
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('fetches and displays the communication log', async () => {
    const logId = 1;
    const regionId = 1;
    const mockLog = { id: logId, title: 'Test Log', recipients: [] };

    fetchMock.get(`/api/communication-logs/region/${regionId}/log/${logId}`, mockLog);

    renderComponent(`/region/${regionId}/log/${logId}/log`);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Communication log - your region' })).toBeInTheDocument());
  });

  it('handles an error fetching log', async () => {
    const logId = 1;
    const regionId = 1;

    fetchMock.get(`/api/communication-logs/region/${regionId}/log/${logId}`, 404);

    renderComponent(`/region/${regionId}/log/${logId}/log`);

    expect(await screen.findByText('Error fetching communication log')).toBeInTheDocument();
  });

  it('does not fetch if log is "new"', async () => {
    renderComponent('/region/1/log/new/log');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Communication log - your region' })).toBeInTheDocument());
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.called('/api/communication-logs/region/1/additional-data')).toBe(true);
    expect(fetchMock.called('/api/communication-logs/region/1/log/new')).toBe(false);
  });

  it('will save a log', async () => {
    const logId = 1;
    const regionId = 1;

    fetchMock.get(`/api/communication-logs/region/${regionId}/log/${logId}`, completeLog);
    fetchMock.put(`/api/communication-logs/log/${logId}`, completeLog);

    act(() => {
      renderComponent(`/region/${regionId}/log/${logId}/log`);
    });

    expect(fetchMock.calls()).toHaveLength(2);

    const view = screen.getByTestId('otherStaff-click-container');
    const select = within(view).getByText(/- select -/i);
    userEvent.click(select);
    await act(async () => {
      userEvent.type(select, 'One');
      userEvent.type(select, '{enter}');
    });

    const communicationDate = document.querySelector('#communicationDate');
    userEvent.type(communicationDate, '11/01/2023');

    const duration = await screen.findByLabelText(/duration in hours/i);
    userEvent.type(duration, '1');

    const method = await screen.findByLabelText(/How was the communication conducted/i);
    userEvent.selectOptions(method, 'Phone');

    const purposeView = screen.getAllByText(/purpose of communication/i)[0];
    const purposeDropdown = within(purposeView).getByRole('combobox');
    userEvent.selectOptions(purposeDropdown, COMMUNICATION_PURPOSES[0]);

    const notes = await screen.findByLabelText(/notes/i);
    userEvent.type(notes, 'This is a note');

    const resultView = screen.getAllByText(/result/i)[0];
    const resultDropdown = within(resultView).getByRole('combobox');
    userEvent.selectOptions(resultDropdown, COMMUNICATION_RESULTS[0]);

    const saveButton = screen.getByRole('button', { name: 'Save and continue' });
    userEvent.click(saveButton);

    await waitFor(() => expect(fetchMock.calls()).toHaveLength(3));
  });

  it('will save a log that is "new" and progress to supporting attachments', async () => {
    fetchMock.get('/api/communication-logs/region/1/log/new', 404);
    fetchMock.post('/api/communication-logs/log', completeLog);

    act(() => {
      renderComponent('/region/1/log/new/log');
    });

    expect(fetchMock.calls()).toHaveLength(1);

    const view = screen.getByTestId('otherStaff-click-container');
    const select = within(view).getByText(/- select -/i);
    userEvent.click(select);
    await act(async () => {
      userEvent.type(select, 'One');
      userEvent.type(select, '{enter}');
    });

    const communicationDate = document.querySelector('#communicationDate');
    userEvent.type(communicationDate, '11/01/2023');

    const duration = await screen.findByLabelText(/duration in hours/i);
    userEvent.type(duration, '1');

    const method = await screen.findByLabelText(/How was the communication conducted/i);
    userEvent.selectOptions(method, 'Phone');

    const purposeView = screen.getAllByText(/purpose of communication/i)[0];
    const purposeDropdown = within(purposeView).getByRole('combobox');
    userEvent.selectOptions(purposeDropdown, COMMUNICATION_PURPOSES[0]);

    const notes = await screen.findByLabelText(/notes/i);
    userEvent.type(notes, 'This is a note');

    const resultView = screen.getAllByText(/result/i)[0];
    const resultDropdown = within(resultView).getByRole('combobox');
    userEvent.selectOptions(resultDropdown, COMMUNICATION_RESULTS[0]);

    const saveButton = screen.getByRole('button', { name: 'Save and continue' });
    userEvent.click(saveButton);

    await waitFor(() => expect(screen.getByText('Supporting attachments')).toBeInTheDocument());
  });
});
