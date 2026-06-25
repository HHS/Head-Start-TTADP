import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as notificationsFetcher from '../../../../fetchers/notifications';
import NotificationCard from '../NotificationCard';

jest.mock('../../../../fetchers/notifications', () => ({
  viewNotification: jest.fn().mockResolvedValue({}),
}));

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
    actionable: false,
  };

  const renderCard = (overrides = {}, onArchive = jest.fn()) =>
    render(
      <MemoryRouter>
        <NotificationCard
          notification={{ ...baseNotification, ...overrides }}
          onArchive={onArchive}
        />
      </MemoryRouter>
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

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
    const onArchive = jest.fn();
    const { rerender } = renderCard({}, onArchive);

    expect(screen.getByText('R01')).toBeVisible();

    rerender(
      <MemoryRouter>
        <NotificationCard
          notification={{ ...baseNotification, displayId: '' }}
          onArchive={onArchive}
        />
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

  describe('dismiss button', () => {
    it('renders dismiss button when actionable is false', () => {
      renderCard({ actionable: false });

      // There are two dismiss areas (mobile + desktop); each renders a button
      const buttons = screen.getAllByRole('button', { name: /Dismiss/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render dismiss button when actionable is true', () => {
      renderCard({ actionable: true });

      expect(screen.queryByRole('button', { name: /Dismiss/i })).toBeNull();
    });

    it('calls onArchive with the notification id when dismiss is clicked', () => {
      const onArchive = jest.fn();
      renderCard({ actionable: false }, onArchive);

      const buttons = screen.getAllByRole('button', { name: /Dismiss/i });
      fireEvent.click(buttons[0]);

      expect(onArchive).toHaveBeenCalledWith(1);
    });
  });

  describe('CTA link', () => {
    it('applies outline class to the link when actionable is false', () => {
      renderCard({ actionable: false });

      const link = screen.getByRole('link', { name: 'Open notification' });
      expect(link.className).toContain('usa-button--outline');
    });

    it('does not apply outline class to the link when actionable is true', () => {
      renderCard({ actionable: true });

      const link = screen.getByRole('link', { name: 'Open notification' });
      expect(link.className).not.toContain('usa-button--outline');
    });

    it('calls viewNotification with the stringified id on link click', () => {
      renderCard({ actionable: false });

      fireEvent.click(screen.getByRole('link', { name: 'Open notification' }));

      expect(notificationsFetcher.viewNotification).toHaveBeenCalledWith('1');
    });
  });
});
