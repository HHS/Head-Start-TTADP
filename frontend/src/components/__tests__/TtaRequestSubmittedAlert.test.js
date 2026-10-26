import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import TtaRequestSubmittedAlert from '../TtaRequestSubmittedAlert';

const MESSAGE = {
  reportId: 14322,
  displayId: 'R14-REQ-14322',
  time: '06/23/2026 at 11:00 am EDT',
  status: 'submitted',
};

const renderAlert = (state, props = {}) => {
  const history = createMemoryHistory({
    initialEntries: [{ pathname: '/tta-requests', state }],
  });
  render(
    <Router history={history}>
      <TtaRequestSubmittedAlert {...props} />
    </Router>
  );
  return history;
};

describe('TtaRequestSubmittedAlert', () => {
  it('says the request was submitted, linking to its read-only view', () => {
    renderAlert({ message: MESSAGE });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You submitted request R14-REQ-14322 on 06/23/2026 at 11:00 am EDT.'
    );
    expect(screen.getByRole('link', { name: 'R14-REQ-14322' })).toHaveAttribute(
      'href',
      '/tta-requests/view/14322'
    );
  });

  it('links to the view under the list it is shown on', () => {
    renderAlert(
      { message: MESSAGE },
      { requestRoot: '/recipient-tta-records/3/region/14/tta-request' }
    );

    expect(screen.getByRole('link', { name: 'R14-REQ-14322' })).toHaveAttribute(
      'href',
      '/recipient-tta-records/3/region/14/tta-request/view/14322'
    );
  });

  it('takes the message out of the location, so it only shows once', () => {
    const history = renderAlert({ message: MESSAGE });

    expect(screen.getByRole('alert')).toBeVisible();
    expect(history.location.state).toEqual({});
  });

  it('leaves the rest of the location state alone', () => {
    const history = renderAlert({ message: MESSAGE, refreshRecipient: true });

    expect(history.location.state).toEqual({ refreshRecipient: true });
  });

  it('shows nothing without a message', () => {
    renderAlert(undefined);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
