import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnHeader, { getClassNamesFor } from '../ColumnHeader';

describe('ActivityReportsTable ColumnHeader', () => {
  describe('getClassNamesFor', () => {
    it('returns empty string when sortBy does not match', () => {
      expect(getClassNamesFor('shoes', 'hats', 'asc')).toBe('');
    });

    it('returns asc when sortBy matches and sortDirection is asc', () => {
      expect(getClassNamesFor('shoes', 'shoes', 'asc')).toBe('asc');
    });

    it('returns desc when sortBy matches and sortDirection is desc', () => {
      expect(getClassNamesFor('shoes', 'shoes', 'desc')).toBe('desc');
    });
  });

  const renderColumnHeader = (onUpdateSort = jest.fn(), sortDirection = 'asc') => {
    const name = 'fanciest shoes';
    render(
      <div>
        <table>
          <thead>
            <tr>
              <ColumnHeader
                onUpdateSort={onUpdateSort}
                displayName={name}
                name="shoes"
                sortBy="shoes"
                sortDirection={sortDirection}
              />
            </tr>
          </thead>
        </table>
      </div>,
    );
  };

  it('renders and calls on update sort', async () => {
    const onUpdateSort = jest.fn();
    renderColumnHeader(onUpdateSort);

    const shoes = await screen.findByText('fanciest shoes');

    await act(async () => userEvent.click(shoes));
    expect(onUpdateSort).toHaveBeenCalledWith('shoes');
  });

  it('sorts on keypress', async () => {
    const onUpdateSort = jest.fn();
    renderColumnHeader(onUpdateSort, 'desc');

    const shoes = await screen.findByText('fanciest shoes');

    await act(async () => userEvent.type(shoes, '{enter}'));
    expect(onUpdateSort).toHaveBeenCalledTimes(2);
  });

  it('displays an unsortable column', async () => {
    const onUpdateSort = jest.fn();
    renderColumnHeader(onUpdateSort, '');

    const shoes = await screen.findByRole('columnheader', { name: /fanciest shoes/i });
    expect(shoes).toHaveAttribute('aria-sort', 'none');
  });
});
