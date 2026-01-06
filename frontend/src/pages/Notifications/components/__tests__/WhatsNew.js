import React from 'react';
import { act, render, screen } from '@testing-library/react';
import WhatsNew, { formatWhatsNew } from '../WhatsNew';
import { mockRSSData, mockWindowProperty } from '../../../../testHelpers';
import { parseFeedIntoDom } from '../../../../utils';

jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = (input) => (input ? actualMoment(input) : actualMoment('2025-06-01'));
  Object.assign(mockMoment, actualMoment);
  return mockMoment;
});

describe('formatWhatsNew', () => {
  describe('with localStorage', () => {
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => JSON.stringify(['1', '2'])),
    });

    it('returns the formatted articles', () => {
      const articles = formatWhatsNew(mockRSSData());
      expect(articles).toMatchSnapshot();
    });
  });

  describe('without localStorage', () => {
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => null),
    });

    it('returns the formatted articles', () => {
      const articles = formatWhatsNew(mockRSSData());
      expect(articles).toMatchSnapshot();
    });

    it('handles an empty dom', () => {
      const articles = formatWhatsNew(null);
      expect(articles).toBeNull();
    });
  });

  describe('with localStorage error', () => {
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => {
        throw new Error('error');
      }),
    });

    it('returns the formatted articles', () => {
      const articles = formatWhatsNew(mockRSSData());
      expect(articles).toMatchSnapshot();
    });
  });
});

describe('parseFeedIntoDom', () => {
  it('parses a feed', () => {
    const parsed = parseFeedIntoDom(mockRSSData());
    expect(parsed).toBeTruthy();

    expect(parsed.querySelectorAll('parsererror').length).toBe(0);
  });

  it('returns null if the feed is invalid', () => {
    const parsed = parseFeedIntoDom('invalid');
    expect(parsed).toBeNull();
  });

  it('returns null if the feed is null', () => {
    const parsed = parseFeedIntoDom(null);
    expect(parsed).toBeNull();
  });

  it('returns null if the parser throws an error', () => {
    const parsed = parseFeedIntoDom(1000);
    expect(parsed).toBeNull();
  });
});

describe('WhatsNew', () => {
  const renderWhatsNew = (data) => {
    act(() => {
      render(<WhatsNew data={data} />);
    });
  };

  describe('with localStorage setItem throwing an error', () => {
    const setItem = jest.fn(() => {
      throw new Error('error');
    });
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => JSON.stringify(['1', '2'])),
      setItem,
    });

    it('renders the component', () => {
      renderWhatsNew(mockRSSData());
      expect(screen.getByText('What\'s new')).toBeInTheDocument();
    });
  });

  describe('with localStorage', () => {
    const setItem = jest.fn();
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => JSON.stringify(['1', '2'])),
      setItem,
    });

    it('renders the component with null data', () => {
      renderWhatsNew(null);
      expect(screen.getByText('What\'s new')).toBeInTheDocument();
    });

    it('renders the component with data but the entry has no id', async () => {
      const data = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <title>Whats New</title>
        <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
        <subtitle>Confluence Syndication Feed</subtitle>
        <id>https://acf-ohs.atlassian.net/wiki</id>
      <entry>
      <title>Manage recipient goals and objectives from the Recipient's TTA Record (RTR)</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117244126" />
      <category term="november2022" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <updated>2023-03-22T21:03:16Z</updated>
      <published>2023-03-22T21:03:16Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;added&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;&lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8028231" data-linked-resource-id="8028231" data-linked-resource-version="28" data-linked-resource-type="page"&gt;Create and manage goals and objectives from the RTR&lt;/a&gt; and view the number of goals by status.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117244126"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:03:16Z</dc:date>
    </entry></feed>`;

      renderWhatsNew(data);
      expect(screen.getByText('What\'s new')).toBeInTheDocument();
      expect(await screen.findByText('Manage recipient goals and objectives from the Recipient\'s TTA Record (RTR)')).toBeInTheDocument();
      expect(await screen.findByText('November 2022')).toBeInTheDocument();
      expect(await screen.findByText('Create and manage goals and objectives from the RTR')).toBeInTheDocument();
      expect(await screen.findByText('and view the number of goals by status.')).toBeInTheDocument();
      expect(await screen.findByText('View Online')).toBeInTheDocument();
    });
  });
});
