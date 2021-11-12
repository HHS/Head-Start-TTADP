import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnHeader from '../ColumnHeader';

describe('ActivityReportsTable ColumnHeader', () => {
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
});
