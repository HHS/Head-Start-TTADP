/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  act, render, screen, fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';

import ResourcesDashboard from '../index';
import { SCOPE_IDS } from '../../../Constants';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';

const history = createMemoryHistory();

const resourceOverviewUrl = join('api', 'widgets', 'resourcesDashboardOverview');
const resourcesOverview = {
  report: {
    numResources: '8,135',
    num: '19,914',
    percentResources: '40.85%',
  },
  resource: {
    numEclkc: '1,819',
    num: '2,365',
    percentEclkc: '79.91%',
  },
  recipient: {
    numResources: '248',
  },
  participant: {
    numParticipants: '765',
  },
};

const resourcesOverviewRegionOne = {
  report: {
    numResources: '7,135',
    num: '18,914',
    percentResources: '2.65%',
  },
  resource: {
    numEclkc: '819',
    num: '1,365',
    percentEclkc: '1.66%',
  },
  recipient: {
    numResources: '148',
  },
  participant: {
    numParticipants: '665',
  },
};

const resourcesOverviewRegionTwo = {
  report: {
    numResources: '6,135',
    num: '17,914',
    percentResources: '1.65%',
  },
  resource: {
    numEclkc: '818',
    num: '365',
    percentEclkc: '.66%',
  },
  recipient: {
    numResources: '148',
  },
  participant: {
    numParticipants: '565',
  },
};

const allRegions = 'region.in[]=1&region.in[]=2';
const mockAnnounce = jest.fn();
const regionInParams = 'region.in[]=1';
const regionTwoInParams = 'region.in[]=2';
const reportIdInParams = 'region.in[]=1&region.in[]=2&reportId.ctn[]=123';

describe('Resources Dashboard page', () => {
  afterEach(() => fetchMock.restore());
  const renderResourcesDashboard = (user) => {
    render(
      <UserContext.Provider value={{ user }}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <Router history={history}>
            <ResourcesDashboard user={user} />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>,
    );
  };

  it('renders correctly', async () => {
    // Page Load.
    fetchMock.get(`${resourceOverviewUrl}?${allRegions}`, resourcesOverview);

    // Region 1.
    fetchMock.get(`${resourceOverviewUrl}?${regionInParams}`, resourcesOverviewRegionOne);

    // Region 2.
    fetchMock.get(`${resourceOverviewUrl}?${regionTwoInParams}`, resourcesOverviewRegionTwo);

    // Report ID (non-region).
    fetchMock.get(`${resourceOverviewUrl}?${reportIdInParams}`, resourcesOverviewRegionTwo);

    // Remove Region Filter.
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }, {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    renderResourcesDashboard(user);
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview (initial).
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Remove existing filter.

    // Add region filter.
    let open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // Change first filter to Region 1.
    let [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    let [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    let select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 1'));

    // Apply filter menu with Region 1 filter.
    let apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview (region filter).
    expect(screen.getByText(/2.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/7,135 of 18,914/i)).toBeInTheDocument();

    expect(screen.getByText(/1.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/819 of 1,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/665/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Remove filter.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    const removeBtn = await screen.findByRole('button', { name: /remove region is 1 filter\. click apply filters to make your changes/i });
    act(() => userEvent.click(removeBtn));

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview reverted after remove.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Add region filter test pill remove.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 2'));

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    expect(screen.getByText(/1.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/6,135 of 17,914/i)).toBeInTheDocument();

    expect(screen.getByText(/.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/818 of 365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/565/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Test filter updates from region pill remove.
    let removePill = await screen.findByRole('button', { name: /this button removes the filter: region is 2/i });
    act(() => userEvent.click(removePill));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview reverted after remove.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Add non-region filter.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'Report ID'));

    [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'contains'));

    const reportIdText = await screen.findByRole('textbox', { name: /enter a report id/i });
    act(() => fireEvent.change(reportIdText, { target: { value: '123' } }));

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    expect(screen.getByText(/1.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/6,135 of 17,914/i)).toBeInTheDocument();

    expect(screen.getByText(/.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/818 of 365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/565/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Test remove non-region filter pill.
    removePill = await screen.findByRole('button', { name: /this button removes the filter: report id contains 123/i });
    act(() => userEvent.click(removePill));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Shows initial.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*eclkc resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();
  });
});
