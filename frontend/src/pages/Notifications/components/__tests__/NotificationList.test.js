import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationList from '../NotificationList';

describe('NotificationList', () => {
  const renderList = (props) =>
    render(
      <MemoryRouter>
        <NotificationList notifications={[]} {...props} />
      </MemoryRouter>
    );

  it('shows error alert when error is set', () => {
    renderList({ error: 'boom' });

    expect(screen.getByText('Error loading notifications')).toBeVisible();
  });

  it('shows empty state when no notifications', () => {
    renderList({ notifications: [] });

    expect(screen.getByText("You're all caught up!")).toBeVisible();
    expect(screen.getByText("You don't have any new notifications.")).toBeVisible();
  });

  it('shows link to preferences in empty state', () => {
    renderList({ notifications: [] });

    expect(screen.getByRole('link', { name: 'Set notification preferences' })).toHaveAttribute(
      'href',
      '/notifications/preferences'
    );
  });

  it('renders a card for each notification', () => {
    renderList({
      notifications: [
        {
          id: 1,
          type: 'changesRequested',
          text: 'First notification',
          displayId: 'R01',
        },
        {
          id: 2,
          type: 'systemPlannedOutage',
          text: 'Second notification',
          displayId: 'R02',
        },
      ],
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
