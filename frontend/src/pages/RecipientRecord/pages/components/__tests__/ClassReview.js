/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { mockRSSData } from '../../../../../testHelpers';
import { GrantDataProvider } from '../../GrantDataContext';
import ClassReview from '../ClassReview';

const grantNumber = '1';
const regionId = 1;
const recipientId = 1;

const apiUrl = `/api/monitoring/class/${recipientId}/region/${regionId}/grant/${grantNumber}`;

const renderClassReview = () =>
  render(
    <GrantDataProvider>
      <ClassReview grantNumber={grantNumber} regionId={regionId} recipientId={recipientId} />
    </GrantDataProvider>
  );

const testThreshold = async (area, score, expectedText, received = '05/01/2023') => {
  fetchMock.getOnce(apiUrl, {
    received,
    ES: area === 'ES' ? score : 0,
    CO: area === 'CO' ? score : 0,
    IS: area === 'IS' ? score : 0,
  });

  renderClassReview();
  expect(await screen.findByTestId(`class-${area.toLowerCase()}`)).toHaveTextContent(expectedText);
};

describe('ClassReview', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  afterAll(() => {
    fetchMock.restore();
  });

  describe('thresholds drawer', () => {
    const confluenceFeed = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>CLASS thresholds</title>
          <summary type="html">&lt;div class="feed"&gt;
            &lt;p&gt;Page &lt;b&gt;edited&lt;/b&gt; by &lt;a&gt;User Author&lt;/a&gt;&lt;/p&gt;
            &lt;div&gt;&lt;p&gt;&lt;strong&gt;Quality thresholds&lt;/strong&gt;&lt;/p&gt;&lt;/div&gt;
            &lt;div&gt;
              &lt;a href="https://example.com/page"&gt;email.notification.view.online&lt;/a&gt;
              &amp;middot;
              &lt;a href="https://example.com/diff"&gt;View Changes Online&lt;/a&gt;
            &lt;/div&gt;
          &lt;/div&gt;</summary>
        </entry>
      </feed>`;

    it('renders the whole feed entry so the Confluence footer links stay hidden', async () => {
      fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', confluenceFeed);
      fetchMock.getOnce(apiUrl, { received: '05/01/2023', ES: 6, CO: 6, IS: 6 });

      renderClassReview();

      await screen.findByText('Quality thresholds');
      const footerLink = screen.getByText('View Changes Online');
      // FeedArticle.scss hides `.feed div:last-child`, which only applies when the
      // footer is rendered inside its original `.feed` wrapper
      const footer = footerLink.closest('div');
      expect(footer.parentElement).toHaveClass('feed');
      expect(footer.parentElement.lastElementChild).toBe(footer);
    });
  });

  describe('emotional support', () => {
    beforeEach(() => {
      fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', mockRSSData());
    });
    afterEach(() => {
      fetchMock.restore();
    });

    describe('emotional support', () => {
      it('above all thresholds', () => testThreshold('ES', 6, 'Above all thresholds'));
      it('below quality', () => testThreshold('ES', 5.1, 'Below quality'));
      it('below competitive', () => testThreshold('ES', 5.1, 'Below quality'));
    });

    describe('classroom organization', () => {
      it('above all thresholds', () => testThreshold('CO', 6, 'Above all thresholds'));
      it('below quality', () => testThreshold('CO', 5.1, 'Below quality'));
      it('below competitive', () => testThreshold('CO', 4.9, 'Below competitive'));
    });

    describe('instructional support', () => {
      it('above all thresholds', () => testThreshold('IS', 3.1, 'Above all thresholds'));
      it('below quality - after 2025-08-01', () => testThreshold('IS', 2.5, 'Below quality'));
      it('below quality - between 2020-11-09 and 2025-07-31', () =>
        testThreshold('IS', 2.4, 'Below quality'));
      it('below competitive - after 2027-08-01', () =>
        testThreshold('IS', 2.4, 'Below competitive', '08/02/2027'));
      it('below competitive - between 2020-11-09 and 2025-07-31', () =>
        testThreshold('IS', 2.2, 'Below competitive'));
    });
  });
});
