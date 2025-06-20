/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';

import Cdi from '../cdi';
import { withText } from '../../../testHelpers';

const grantsUrl = join('/', 'api', 'admin', 'grants', 'cdi?unassigned=false&active=true');
const recipientsUrl = join('/', 'api', 'admin', 'recipients');

const defaultRecipients = [
  {
    id: 1,
    name: 'recipient 1',
  },
  {
    id: 10,
    name: 'recipient 2',
  },
];

const defaultGrant = {
  id: 1,
  number: 'abc123',
  regionId: 1,
  status: 'Active',
  startDate: '2020-12-01',
  endDate: '2020-12-02',
  recipientId: 1,
  recipient: {
    id: 1,
    name: 'recipient 1',
  },
};

describe('CDI', () => {
  const history = createMemoryHistory();
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get(grantsUrl, [defaultGrant]);
    fetchMock.get(recipientsUrl, defaultRecipients);
  });

  const RenderCDI = ({ grantId = null }) => (
    <Router history={history}>
      <Cdi match={{ params: { grantId }, path: '', url: '' }} />
    </Router>
  );

  it('renders an empty page with no grant selected', async () => {
    render(<RenderCDI />);
    const grantView = await screen.findByText('Please select a grant');
    expect(grantView).toBeVisible();
  });

  it('renders the grant view if a grant is selected', async () => {
    render(<RenderCDI grantId={1} />);
    const number = await screen.findByText(withText('Number: abc123 - 1'));
    expect(number).toBeVisible();
  });

  it('handles updating of a CDI grant', async () => {
    fetchMock.put(join('/', 'api', 'admin', 'grants', 'cdi', '1'), { ...defaultGrant, regionId: 10 });
    render(<RenderCDI grantId={1} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);
    const region = await screen.findByText(withText('Region: 10'));
    expect(region).toBeVisible();
  });
});
