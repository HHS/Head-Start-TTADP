import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationList from '../NotificationList';

jest.mock('../../../../fetchers/notifications', () => ({
  viewNotification: jest.fn().mockResolvedValue({}),
}));

describe('NotificationList', () => {
  const renderList = (props, onArchive = jest.fn()) =>
    render(
      <MemoryRouter>
        <NotificationList notifications={[]} onArchive={onArchive} {...props} />
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

  it('shows archived copy in empty state when isArchive is true', () => {
    renderList({ notifications: [], isArchive: true });

    expect(screen.getByText("You don't have any archived notifications.")).toBeVisible();
  });

  it('shows link to preferences in empty state', () => {
    renderList({ notifications: [] });

    expect(screen.getByRole('link', { name: 'Set notification preferences' })).toHaveAttribute(
      'href',
      '/account/notifications'
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
          actionable: false,
        },
        {
          id: 2,
          type: 'systemPlannedOutage',
          text: 'Second notification',
          displayId: 'R02',
          actionable: false,
        },
      ],
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('forwards onArchive to each card - clicking dismiss invokes the prop', () => {
    const onArchive = jest.fn();
    renderList(
      {
        notifications: [
          {
            id: 42,
            type: 'changesRequested',
            text: 'A notification',
            displayId: 'R01',
            actionable: false,
          },
        ],
      },
      onArchive
    );

    const dismissButtons = screen.getAllByRole('button', { name: /Dismiss/i });
    fireEvent.click(dismissButtons[0]);

    expect(onArchive).toHaveBeenCalledWith(42);
  });
});
