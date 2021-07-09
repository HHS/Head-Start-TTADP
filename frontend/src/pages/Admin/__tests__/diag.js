import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import Diag from '../diag';

const defaultBaseUrl = '/api/admin/requestErrors?filter=%7B%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D';

describe('Diag', () => {
  const history = createMemoryHistory();
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get(defaultBaseUrl, [{
      id: '4',
      operation: 'OPERATION',
      uri: 'http://smarthub',
      method: 'POST',
      requestBody: { foo: 'bar' },
      responseBody: { error: { foo: 'encountered problems' } },
      responseCode: '400',
      createdAt: '2021-07-01T14:37:04.730Z',
      updatedAt: '2021-07-01T14:37:04.730Z',
    }]);
  });

  const RenderDiag = () => (
    <Router history={history}>
      <Diag />
    </Router>
  );

  it('renders the main view', async () => {
    render(<RenderDiag />);
    const requestErrorsView = await screen.findAllByText('Requesterrors');
    expect(requestErrorsView.length).toBe(3);
  });
});
