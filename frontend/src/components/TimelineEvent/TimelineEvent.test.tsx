import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TIMELINE_EVENT_TYPES } from '@ttahub/common';
import type { RecipientTimelineEvent } from '@ttahub/common/src/recipientTimeline';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import TimelineEvent from './index';

const event: RecipientTimelineEvent = {
  source: 'communicationLog',
  sourceId: 1,
  date: '2026-07-07',
  eventType: 'Email communication',
  title: 'Email communication',
  subtitle: 'General check-in',
  durationHours: 0.25,
  byline: { label: 'By', values: ['Isabella Baker, GS'] },
  indicators: ['multiRecipient'],
  tags: [{ label: 'Monitoring', flagged: true }],
  details: [
    { label: 'Notes', items: [{ text: 'First line\nSecond line' }] },
    { label: 'Supporting attachments', items: [{ text: 'Attachment', link: '/api/files/1' }] },
  ],
  links: [{ label: 'View communication log', to: '/communication/1' }],
};

const renderEvent = (overrides: Partial<RecipientTimelineEvent> = {}, defaultExpanded = false) =>
  render(
    <MemoryRouter>
      <TimelineEvent event={{ ...event, ...overrides }} defaultExpanded={defaultExpanded} />
    </MemoryRouter>
  );

describe('TimelineEvent', () => {
  it.each(TIMELINE_EVENT_TYPES)('supports the %s presentation', (eventType) => {
    renderEvent({ eventType, title: eventType });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(eventType);
    expect(screen.getByText('July 7, 2026')).toHaveAttribute('datetime', '2026-07-07');
    expect(screen.getByText('0.25 hour')).toBeVisible();
    expect(screen.getByText('By Isabella Baker, GS')).toBeVisible();
    expect(screen.getByText('Monitoring')).toBeVisible();
    expect(screen.getByText('Flagged')).toHaveClass('usa-sr-only');
    expect(screen.getByText('Multi-recipient communication.')).toHaveClass('usa-sr-only');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('toggles with Enter and Space, exposes state and keeps focus on the button', () => {
    renderEvent();
    userEvent.tab();
    const toggle = screen.getByRole('button', { name: /View details for Email communication/ });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(panel).not.toBeVisible();
    userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    expect(screen.getByRole('link', { name: 'Attachment' })).toHaveAttribute(
      'href',
      '/api/files/1'
    );
    userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it('keeps each instance independent even when the same source is shown twice', () => {
    render(
      <MemoryRouter>
        <TimelineEvent event={event} />
        <TimelineEvent event={event} />
      </MemoryRouter>
    );
    const [first, second] = screen.getAllByRole('button');
    expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));
    userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports sparse events without empty controls or metadata', () => {
    renderEvent({
      subtitle: null,
      byline: null,
      durationHours: null,
      tags: [],
      indicators: [],
      details: [{ label: 'Empty', items: [] }],
      links: [],
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent(/^Email communication$/);
    expect(screen.queryByText(/hours?/)).not.toBeInTheDocument();
  });

  it.each([
    [0, '0 hours'],
    [1, '1 hour'],
    [2.5, '2.5 hours'],
  ])('preserves duration %s', (durationHours, expected) => {
    renderEvent({ durationHours: durationHours as number });
    expect(screen.getByText(expected)).toBeVisible();
  });

  it('renders multiple byline values and details without interpreting HTML', () => {
    const text = `<script>alert("hello")</script>${'long-content'.repeat(100)}`;
    renderEvent(
      {
        byline: { label: 'Trainers', values: ['Trainer One, GS', 'Trainer Two, ECS'] },
        subtitle: text,
        details: [{ label: 'Session objective', items: [{ text }, { text: 'Another objective' }] }],
      },
      true
    );
    expect(screen.getByText('Trainers: Trainer One, GS; Trainer Two, ECS')).toBeVisible();
    expect(screen.getAllByText(text)).toHaveLength(2);
    expect(screen.getByText('Another objective')).toBeVisible();
    expect(document.querySelector('article script')).toBeNull();
  });

  it('routes internal source links without collapsing the event', () => {
    render(
      <MemoryRouter>
        <TimelineEvent event={event} defaultExpanded />
        <Route path="/communication/1">
          <p>Source page</p>
        </Route>
      </MemoryRouter>
    );
    userEvent.click(screen.getByRole('link', { name: 'View communication log' }));
    expect(screen.getByText('Source page')).toBeVisible();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports link-only events and announces external source links', () => {
    renderEvent(
      {
        details: [],
        links: [{ label: 'View report', to: 'https://example.org/report', external: true }],
      },
      true
    );
    const link = screen.getByRole('link', { name: 'View report (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//evil.example',
    '/\\evil.example',
    'java\nscript:alert(1)',
    'http:\\\\evil.example\\path',
    'https://example.com/foo bar',
  ])('does not create unsafe links for %s', (to) => {
    renderEvent(
      {
        details: [{ label: 'Notes', items: [{ text: 'Unsafe attachment', link: to }] }],
        links: [{ label: 'Unsafe source', to }],
      },
      true
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Unsafe source')).toBeVisible();
    expect(screen.getByText('Unsafe attachment')).toBeVisible();
  });

  it('handles invalid dates and omits the final connector', () => {
    render(
      <MemoryRouter>
        <TimelineEvent event={{ ...event, date: 'invalid' }} isLast />
      </MemoryRouter>
    );
    expect(screen.getByText('Date unavailable')).toBeVisible();
    expect(within(screen.getByRole('article')).getByRole('heading')).toBeVisible();
    expect(document.querySelector('.ttahub-timeline-event__connector')).toBeNull();
  });
});
