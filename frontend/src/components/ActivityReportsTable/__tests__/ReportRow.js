import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import ReportRow from '../ReportRow';
import { generateXFakeReports } from '../mocks';

const history = createMemoryHistory();

const [report] = generateXFakeReports(1);

describe('ReportRow', () => {
  const renderReportRow = () => (
    render(
      <Router history={history}>
        <ReportRow
          report={report}
          openMenuUp={false}
          handleReportSelect={jest.fn()}
          isChecked={false}
        />
      </Router>,
    )
  );

  beforeAll(async () => {
    global.navigator.clipboard = jest.fn();
    global.navigator.clipboard.writeText = jest.fn(() => Promise.resolve());
  });

  afterAll(() => {
    delete global.navigator;
  });

  it('the view link works', async () => {
    history.push = jest.fn();
    renderReportRow();
    userEvent.click(await screen.findByRole('button', { name: 'Actions for activity report R14-AR-1' }));
    userEvent.click(await screen.findByRole('button', { name: /view/i }));

    expect(history.push).toHaveBeenCalled();
  });

  it('you can copy', async () => {
    renderReportRow();
    userEvent.click(await screen.findByRole('button', { name: 'Actions for activity report R14-AR-1' }));
    userEvent.click(await screen.findByRole('button', { name: /copy url/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
