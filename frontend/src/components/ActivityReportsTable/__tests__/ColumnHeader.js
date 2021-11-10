import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnHeader from '../ColumnHeader';

describe('ActivityReportsTable ColumnHeader', () => {
  it('renders and calls on update sort', async () => {
    const onUpdateSort = jest.fn();
    const name = 'fanciest shoes';
    const sortDirection = 'asc';

    render(
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
      </table>,
    );

    const shoes = await screen.findByText('fanciest shoes');

    userEvent.click(shoes);
    expect(onUpdateSort).toHaveBeenCalledWith('shoes');
  });
});
