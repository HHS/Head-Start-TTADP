import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { SUPPORT_LINK } from '../../../Constants';
import UserContext from '../../../UserContext';
import NewHome from '../NewHome';

const USER_GUIDE_LINK = 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/';

function renderHome(user: { name?: string | null } = { name: 'Annika Lewis' }) {
  const history = createMemoryHistory({ initialEntries: ['/'] });
  const result = render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <NewHome />
      </UserContext.Provider>
    </Router>
  );

  return { ...result, history };
}

describe('New Home page', () => {
  test('renders the Home title, personalized H1, and five reusable cards', async () => {
    const { container } = renderHome();

    await waitFor(() => expect(document.title).toBe('Home'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcome to the TTA Hub, Annika Lewis'
    );
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(container.querySelectorAll('.ttahub-widget-card')).toHaveLength(5);
  });

  test.each([
    ['Manage account', 'View profile and My Groups', 'Manage account', '/account'],
    [
      'Notifications',
      'Set up and take action on TTA Hub tasks and messages.',
      'View notifications',
      '/notifications',
    ],
    ["What's new", 'Stay up to date with new TTA Hub features.', 'View updates', '/whats-new'],
    ['User guide', 'Technical documents and help articles.', 'View user guide', USER_GUIDE_LINK],
    ['Contact support', 'Request support for the TTA Hub.', 'Contact support', SUPPORT_LINK],
  ])('renders exact copy and destination for %s', (title, description, label, href) => {
    renderHome();
    const heading = screen.getByRole('heading', { level: 2, name: title });
    const card = heading.closest('.ttahub-widget-card');

    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText(description)).toBeVisible();
    expect(within(card as HTMLElement).getByRole('link', { name: label })).toHaveAttribute(
      'href',
      href
    );
  });

  test('internal links support keyboard activation in document order', () => {
    const { history } = renderHome();
    const expected = [
      ['Manage account', '/account'],
      ['View notifications', '/notifications'],
      ['View updates', '/whats-new'],
    ];

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Manage account',
      'View notifications',
      'View updates',
      'View user guide',
      'Contact support',
    ]);

    expected.forEach(([label, destination]) => {
      const link = screen.getByRole('link', { name: label });
      link.focus();
      expect(link).toHaveFocus();
      userEvent.keyboard('{Enter}');
      expect(history.location.pathname).toBe(destination);
    });
  });

  test('external links stay in the current tab without new-tab copy', () => {
    renderHome();

    ['View user guide', 'Contact support'].forEach((label) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
      expect(link).not.toHaveAccessibleName(/new (window|tab)/i);
    });
  });

  test.each([{}, { name: undefined }, { name: null }, { name: '' }, { name: '   ' }])(
    'uses the fallback heading when the name is blank or missing',
    (user) => {
      renderHome(user);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        /^Welcome to the TTA Hub$/
      );
    }
  );

  test('uses the fallback heading when user context is unavailable', () => {
    render(
      <Router history={createMemoryHistory()}>
        <NewHome />
      </Router>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Welcome to the TTA Hub$/);
  });

  test('wraps a long name and renders name markup as ordinary text', () => {
    const longName = '<img src=x onerror=alert(1)> A very long authenticated user name';
    renderHome({ name: longName });
    const heading = screen.getByRole('heading', { level: 1 });

    expect(heading).toHaveClass('text-wrap', 'maxw-full');
    expect(heading).toHaveStyle({ overflowWrap: 'anywhere' });
    expect(heading).toHaveTextContent(`Welcome to the TTA Hub, ${longName}`);
    expect(heading.querySelector('img')).not.toBeInTheDocument();
  });

  test('uses one column below desktop and two equal columns at desktop', () => {
    renderHome();
    const layout = screen.getByTestId('home-page-links');
    const columns = Array.from(layout.children);

    expect(layout).toHaveClass('grid-row', 'grid-gap-3');
    expect(screen.getByRole('region', { name: 'TTA Hub shortcuts' })).toBe(layout);
    expect(columns).toHaveLength(5);
    columns.forEach((column) => {
      expect(column).toHaveClass('grid-col-12', 'desktop:grid-col-6', 'margin-bottom-3');
      expect(column.querySelector('.ttahub-widget-card')).toHaveClass('height-full');
      expect(within(column as HTMLElement).getByRole('link')).toHaveClass('maxw-full', 'text-wrap');
      const text = within(column as HTMLElement).getByRole('heading', { level: 2 }).parentElement;
      expect(text).toHaveClass('minw-0', 'maxw-full');
      expect(text).toHaveStyle({ overflowWrap: 'anywhere' });
      expect(text?.parentElement).toHaveClass('display-block', 'tablet:display-flex');
    });
  });

  test('keeps all static shortcuts available without requesting content or adding request states', () => {
    const fetch = jest.spyOn(window, 'fetch').mockRejectedValue(new Error('Service unavailable'));
    try {
      renderHome();
      expect(screen.getAllByRole('link')).toHaveLength(5);
      expect(fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(/loading|no notifications|retry/i)).not.toBeInTheDocument();
    } finally {
      fetch.mockRestore();
    }
  });

  test('exposes semantic text and links while hiding decorative icons', () => {
    const { container } = renderHome();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(5);
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(5);
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
