import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import Notifications from '../index';
import { mockRSSData, mockWindowProperty } from '../../../testHelpers';

jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = (input) => (input ? actualMoment(input) : actualMoment('2025-06-01'));
  Object.assign(mockMoment, actualMoment);
  return mockMoment;
});

describe('Notifications', () => {
  const history = createMemoryHistory();
  const renderNotifications = (data = { whatsNew: mockRSSData() }) => render(
    <Router history={history}>
      <Notifications notifications={data} />
    </Router>,
  );

  const getItem = jest.fn();
  const setItem = jest.fn();

  mockWindowProperty('localStorage', { getItem, setItem });

  describe('without referrer', () => {
    mockWindowProperty('location', { search: '' });

    it('renders the page', async () => {
      renderNotifications();
      expect(await screen.findByText('Notifications')).toBeVisible();
      expect(await screen.findByText('What\'s new')).toBeVisible();
      expect(screen.queryByText('Back')).toBe(null);
    });
  });

  describe('with referrer', () => {
    mockWindowProperty('location', { search: '?referrer=/test' });

    it('renders the page', async () => {
      renderNotifications();
      expect(await screen.findByText('Notifications')).toBeVisible();
      expect(await screen.findByText('What\'s new')).toBeVisible();
      expect(screen.getByTestId('back-link-icon')).toBeVisible();

      expect(setItem).toHaveBeenCalled();
    });

    it('shows the proper headings', async () => {
      renderNotifications();
      expect(await screen.findByText('Notifications')).toBeVisible();

      const headings = [
        'March 2023',
        'February 2023',
        'December 2022',
        'November 2022',
      ];

      headings.forEach((heading) => {
        expect(screen.getByText(heading)).toBeVisible();
      });

      const articles = document.querySelectorAll('article');
      expect(articles.length).toBe(13);

      Array.from(articles).forEach((article) => {
        expect(article).toBeVisible();
        const title = article.querySelector('.ttahub-feed-article-title');
        expect(title).not.toBe(null);
        expect(title.textContent).toBeTruthy();
      });
    });
  });
});
