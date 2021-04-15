import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';

import LegacyReport from '../index';

// eslint-disable-next-line react/prop-types
const RenderLegacyReport = ({ report, fail = false }) => {
  // eslint-disable-next-line react/prop-types
  const { id } = report;
  const url = `/api/activity-reports/legacy/${id}`;
  const history = createMemoryHistory();

  if (fail) {
    fetchMock.get(url, 500);
  } else {
    fetchMock.get(url, report);
  }

  return (
    <Router history={history}>
      <LegacyReport match={{ path: '', url: '', params: { legacyId: id } }} />
    </Router>
  );
};

const report = {
  id: '1',
  imported: {
    granteeName: 'first\nsecond\nlast',
  },
  attachments: [{
    id: 1,
    originalFileName: 'test',
    url: { url: 'url' },
    status: 'status',
  }],
};

describe('LegacyReport', () => {
  afterEach(() => fetchMock.restore());

  it('handles failure to fetch the report', async () => {
    render(<RenderLegacyReport report={report} fail />);
    const alert = await screen.findByTestId('alert');
    expect(alert).toHaveTextContent('Unable to load activity report');
  });

  it('displays the report', async () => {
    render(<RenderLegacyReport report={report} />);
    const first = await screen.findByText('first');
    const second = await screen.findByText('second');
    const last = await screen.findByText('last');
    const attachment = await screen.findByText('test');

    expect(first).toBeVisible();
    expect(second).toBeVisible();
    expect(last).toBeVisible();
    expect(attachment).toBeVisible();
  });
});
