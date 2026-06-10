import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationList from '../NotificationList';

describe('NotificationList', () => {
  const renderList = (props) =>
    render(
      <MemoryRouter>
        <NotificationList isArchive={false} notifications={[]} {...props} />
      </MemoryRouter>
    );

  it('shows error alert when error is set', () => {
    renderList({ error: 'boom' });

    expect(screen.getByText('Error loading notifications')).toBeVisible();
  });

  it('shows empty state for active when no notifications', () => {
    renderList({ notifications: [] });

    expect(screen.getByText('No active notifications right now.')).toBeVisible();
  });

  it('shows empty state for archive when no notifications and isArchive=true', () => {
    renderList({ notifications: [], isArchive: true });

    expect(screen.getByText('No archived notifications yet.')).toBeVisible();
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
