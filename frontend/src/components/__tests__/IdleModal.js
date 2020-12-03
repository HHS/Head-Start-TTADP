import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import IdleModal from '../IdleModal';

describe('IdleModal', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  const renderIdleModal = (
    logoutTimeout = 20,
    modalTimeout = 10,
    logoutUser = () => {},
  ) => {
    render(
      <>
        <div data-testid="test" />
        <IdleModal
          logoutTimeout={logoutTimeout}
          modalTimeout={modalTimeout}
          logoutUser={logoutUser}
        />
      </>,
    );
  };

  it('modal is shown after modalTimeout', () => {
    renderIdleModal();
    act(() => {
      jest.advanceTimersByTime(11);
    });
    expect(screen.getByTestId('modal')).toBeVisible();
  });

  it('logout is called after logoutTimeout milliseconds of inactivity', () => {
    const logout = jest.fn();
    renderIdleModal(20, 10, logout);
    act(() => {
      jest.advanceTimersByTime(21);
    });
    expect(logout).toHaveBeenCalled();
  });

  it('modal is not shown after modalTimeout if there is activity', async () => {
    const logout = jest.fn();
    renderIdleModal(20, 10, logout);
    act(() => {
      jest.advanceTimersByTime(7);
      const testDiv = screen.getByTestId('test');
      fireEvent.keyDown(testDiv, { key: 'Enter', code: 'Enter' });
      jest.advanceTimersByTime(7);
    });
    expect(logout).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('modal')).toBeNull());
  });

  it('a shown modal is removed after action is taken', () => {
    const logout = jest.fn();
    renderIdleModal(20, 10, logout);
    act(() => {
      jest.advanceTimersByTime(12);
      expect(screen.getByTestId('modal')).toBeVisible();
      const testDiv = screen.getByTestId('test');
      fireEvent.keyDown(testDiv, { key: 'Enter', code: 'Enter' });
    });
    expect(logout).not.toHaveBeenCalled();
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  describe('modal message', () => {
    it('shows less than a minute if logoutTimeout - modalTimeout is less than a minute', () => {
      renderIdleModal(20, 10);
      act(() => {
        jest.advanceTimersByTime(11);
        expect(screen.getByRole('alert').textContent).toContain('in less than a minute');
      });
    });

    it('shows a minute if logoutTimeout - modalTimeout is a minute', () => {
      renderIdleModal(1000 * 60 + 10, 10);
      act(() => {
        jest.advanceTimersByTime(11);
        expect(screen.getByRole('alert').textContent).toContain('in a minute');
      });
    });

    it('shows logoutTimeout - modalTimeout minutes when greater than one minute', () => {
      renderIdleModal((1000 * 60 * 5) + 10, 10);
      act(() => {
        jest.advanceTimersByTime(11);
        expect(screen.getByRole('alert').textContent).toContain('in 5 minutes');
      });
    });
  });
});
