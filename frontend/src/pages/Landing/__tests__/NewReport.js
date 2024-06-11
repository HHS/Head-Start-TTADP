import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import NewReport from '../NewReport';
import { mockWindowProperty } from '../../../testHelpers';

describe('NewReport', () => {
  const removeItem = jest.fn();

  mockWindowProperty('localStorage', {
    removeItem,
  });

  const renderNewReport = () => {
    render(<MemoryRouter><NewReport /></MemoryRouter>);
  };

  it('attempts to clear local storage and navigates the page', async () => {
    renderNewReport();
    expect(removeItem).not.toHaveBeenCalled();
    const button = await screen.findByRole('button');
    userEvent.click(button);
    expect(removeItem).toHaveBeenCalled();
  });
});
