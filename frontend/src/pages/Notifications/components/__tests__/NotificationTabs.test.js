import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationTabs from '../NotificationTabs';

describe('NotificationTabs', () => {
  const renderTabs = (path = '/notifications', isArchive = false) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <NotificationTabs isArchive={isArchive} />
      </MemoryRouter>
    );

  it('renders Active and Archive links', () => {
    renderTabs();

    expect(screen.getByRole('link', { name: 'Active' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Archived' })).toBeVisible();
  });

  it('marks Active as current page on /notifications', () => {
    renderTabs('/notifications', false);

    expect(screen.getByRole('link', { name: 'Active' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Archived' })).not.toHaveAttribute('aria-current');
  });

  it('marks Archived as current page on /notifications/archive', () => {
    renderTabs('/notifications/archive', true);

    expect(screen.getByRole('link', { name: 'Archived' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Active' })).not.toHaveAttribute('aria-current');
  });

  it('applies usa-button--active class to the active tab', () => {
    renderTabs('/notifications/archive', true);

    expect(screen.getByRole('link', { name: 'Archived' })).toHaveClass(
      'ttahub-tabs--tabs_link--active'
    );
    expect(screen.getByRole('link', { name: 'Active' })).not.toHaveClass(
      'ttahub-tabs--tabs_link--active'
    );
  });
});
