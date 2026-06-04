import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import { mockWindowProperty } from '../../testHelpers';
import NewActivityReportButton from '../NewActivityReportButton';

describe('NewReport', () => {
  const history = createMemoryHistory();
  const removeItem = jest.fn();

  const historyPush = jest.fn();
  history.push = historyPush;

  mockWindowProperty('localStorage', {
    removeItem,
  });

  const renderNewReport = () => {
    render(
      <Router history={history}>
        <NewActivityReportButton />
      </Router>
    );
  };

  it('attempts to clear local storage and navigates the page', async () => {
    renderNewReport();
    expect(removeItem).not.toHaveBeenCalled();
    const l = await screen.findByRole('link');
    userEvent.click(l);
    expect(removeItem).toHaveBeenCalled();
    expect(historyPush).toHaveBeenCalled();
  });
});
