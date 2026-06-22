import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationCard from '../NotificationCard';

describe('NotificationCard', () => {
  const baseNotification = {
    id: 1,
    type: 'changesRequested',
    text: 'Please review the latest updates',
    link: '/notifications/1',
    label: 'Open notification',
    displayId: 'R01',
    viewedAt: null,
    archivedAt: null,
  };

  const renderCard = (notification = {}) =>
    render(
      <MemoryRouter>
        <NotificationCard notification={{ ...baseNotification, ...notification }} />
      </MemoryRouter>
    );

  it('shows unread dot when viewedAt is null', () => {
    renderCard({ viewedAt: null });

    expect(screen.getByText('Unread notification')).toBeInTheDocument();
  });

  it('does not show unread dot when viewedAt is set', () => {
    renderCard({ viewedAt: '2026-06-10T00:00:00.000Z' });

    expect(screen.queryByText('Unread notification')).toBeNull();
  });

  it('renders notification text', () => {
    renderCard();

    expect(screen.getByText('Please review the latest updates')).toBeVisible();
  });

  it('renders displayId or empty string fallback', () => {
    const { rerender } = renderCard();

    expect(screen.getByText('R01')).toBeVisible();

    rerender(
      <MemoryRouter>
        <NotificationCard notification={{ ...baseNotification, displayId: '' }} />
      </MemoryRouter>
    );

    const displayIdElement = document.querySelector('.notification-card__display-id');
    expect(displayIdElement).toBeVisible();
    expect(displayIdElement).toHaveTextContent('');
  });

  it('renders CTA link when notification.link is present', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Open notification' })).toHaveAttribute(
      'href',
      '/notifications/1'
    );
  });

  it('does not render CTA when link is absent', () => {
    renderCard({ link: null, label: null });

    expect(screen.queryByRole('link', { name: 'Open notification' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View' })).toBeNull();
  });
});
