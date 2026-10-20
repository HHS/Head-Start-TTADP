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

  describe('with unsafe referrer', () => {
    it('does not render the back link or crash on a malformed percent-encoding', () => {
      renderWhatsNewPage({ initialEntries: ['/whats-new?referrer=%E0%A4%A'] });
      expect(screen.queryByTestId('back-link-icon')).toBe(null);
      expect(screen.getByRole('heading', { name: "What's New" })).toBeVisible();
    });

    it('does not render the back link for an absolute URL referrer', () => {
      renderWhatsNewPage({
        initialEntries: ['/whats-new?referrer=https%3A%2F%2Fevil.example%2Fphish'],
      });
      expect(screen.queryByTestId('back-link-icon')).toBe(null);
    });

    it('does not render the back link for a protocol-relative referrer', () => {
      renderWhatsNewPage({ initialEntries: ['/whats-new?referrer=%2F%2Fevil.example'] });
      expect(screen.queryByTestId('back-link-icon')).toBe(null);
    });

    it('does not render the back link for a backslash-prefixed referrer', () => {
      renderWhatsNewPage({ initialEntries: ['/whats-new?referrer=%2F%5Cevil.example'] });
      expect(screen.queryByTestId('back-link-icon')).toBe(null);
    });

    it('does not render the back link for a non-path referrer', () => {
      renderWhatsNewPage({ initialEntries: ['/whats-new?referrer=javascript%3Aalert(1)'] });
      expect(screen.queryByTestId('back-link-icon')).toBe(null);
    });
  });
});
