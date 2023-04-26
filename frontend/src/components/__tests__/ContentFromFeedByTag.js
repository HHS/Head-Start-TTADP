import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import ContentFromFeedByTag from '../ContentFromFeedByTag';

const DEFAULT_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
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

describe('ContentFromFeedByTag', () => {
  afterEach(() => fetchMock.restore());

  const renderContentFromFeed = (tag = 'tag', content = DEFAULT_RESPONSE, selector = null) => {
    fetchMock.get(`/api/feeds/item?tag=${tag}`, content);
    render(<ContentFromFeedByTag tagName={tag} contentSelector={selector} />);
  };

  it('renders a feed', async () => {
    act(() => {
      renderContentFromFeed();
    });

    expect(await screen.findByText('Create and manage goals and objectives from the RTR')).toBeInTheDocument();
  });

  it('renders an extract from a feed', async () => {
    act(() => {
      renderContentFromFeed(
        'tag',
        DEFAULT_RESPONSE,
        '[data-linked-resource-id="8028231"]',
      );
    });

    expect(await screen.findByText('Create and manage goals and objectives from the RTR')).toBeInTheDocument();
  });

  it('handles an error', async () => {
    act(() => {
      renderContentFromFeed('test', 500);
    });

    await waitFor(() => {
      const readOnly = document.querySelector('.ttahub-single-feed-item--by-tag');
      expect(readOnly).toBeTruthy();
    });
  });

  it('renders a feed with no content', async () => {
    const response = `<?xml version="1.0" encoding="UTF-8"?>
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
      <summary type="html"></summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:03:16Z</dc:date>
    </entry></feed>`;

    act(() => {
      renderContentFromFeed('tag', response);
    });

    await waitFor(() => {
      const readOnly = document.querySelector('.ttahub-single-feed-item--by-tag');
      expect(readOnly).toBeTruthy();
    });
  });
});
