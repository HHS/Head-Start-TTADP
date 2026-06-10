import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { mockRSSData, mockWindowProperty } from '../../../testHelpers';
import WhatsNewPage from '../index';

jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = (input) => (input ? actualMoment(input) : actualMoment('2025-06-01'));
  Object.assign(mockMoment, actualMoment);
  return mockMoment;
});

describe('WhatsNewPage', () => {
  const getItem = jest.fn();
  const setItem = jest.fn();

  mockWindowProperty('localStorage', { getItem, setItem });

  const renderWhatsNewPage = ({
    notifications = { whatsNew: mockRSSData() },
    initialEntries = ['/whats-new'],
  } = {}) => {
    const history = createMemoryHistory({ initialEntries });

    return render(
      <Router history={history}>
        <WhatsNewPage notifications={notifications} />
      </Router>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without referrer', () => {
    it('renders the page', async () => {
      renderWhatsNewPage();
      expect(screen.queryByText('Back')).toBe(null);
    });

    it('does not crash without notifications', async () => {
      renderWhatsNewPage({ notifications: null });
      expect(screen.getByRole('heading', { name: "What's New" })).toBeVisible();
    });
  });

  describe('with referrer', () => {
    const initialEntries = ['/whats-new?referrer=%2Ftest'];

    it('renders the page', async () => {
      renderWhatsNewPage({ initialEntries });
      expect(screen.getByTestId('back-link-icon')).toBeVisible();
      expect(setItem).toHaveBeenCalled();
    });

    it('shows the proper headings', async () => {
      renderWhatsNewPage({ initialEntries });

      const headings = ['March 2023', 'February 2023', 'December 2022', 'November 2022'];

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
