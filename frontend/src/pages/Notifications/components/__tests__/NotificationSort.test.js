import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import NotificationSort from '../NotificationSort';

describe('NotificationSort', () => {
  const options = [
    { key: 'action_needed-asc', label: 'Action needed (oldest first)' },
    { key: 'type-desc', label: 'Notification type (Z-A)' },
  ];

  const renderSort = (value = 'action_needed-asc', onChange = jest.fn()) => {
    const history = createMemoryHistory({
      initialEntries: ['/notifications'],
    });

    render(
      <Router history={history}>
        <NotificationSort onChange={onChange} options={options} value={value} />
      </Router>
    );

    return { history, onChange };
  };

  it('renders a dropdown with the provided options', () => {
    renderSort();

    expect(screen.getByLabelText('Sort by')).toBeVisible();
    expect(screen.getByRole('option', { name: 'Action needed (oldest first)' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Notification type (Z-A)' })).toBeVisible();
  });

  it('shows the current value as selected', () => {
    renderSort('type-desc');

    expect(screen.getByLabelText('Sort by')).toHaveValue('type-desc');
  });

  it('calls onChange and updates URL when selection changes', () => {
    const onChange = jest.fn();
    const { history } = renderSort('action_needed-asc', onChange);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'type-desc' } });

    expect(onChange).toHaveBeenCalledWith('type-desc', {
      sortBy: 'updatedAt',
      direction: 'DESC',
    });
    expect(history.location.pathname).toBe('/notifications');
    expect(history.location.search).toBe('?sortBy=updatedAt&direction=DESC');
  });
});
