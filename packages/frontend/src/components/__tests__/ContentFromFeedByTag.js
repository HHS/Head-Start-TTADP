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

  const renderContentFromFeed = (
    tag = 'tag',
    content = DEFAULT_RESPONSE,
    selector = null,
    openLinksInNewTab = false,
  ) => {
    fetchMock.get(`/api/feeds/item?tag=${tag}`, content);
    // eslint-disable-next-line max-len
    render(<ContentFromFeedByTag tagName={tag} contentSelector={selector} openLinksInNewTab={openLinksInNewTab} />);
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

  it('properly formats support type response (as an example)', async () => {
    const supportTypeResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Tag ttahub-tta-support-type</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id>
  <entry>
    <title>OHS guidance on TTA support types</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/184516720/OHS+guidance+on+TTA+support+types" />
    <category term="objectives" />
    <category term="goals" />
    <category term="ar" />
    <category term="guidance" />
    <category term="userguide" />
    <category term="ttahub-tta-support-type" />
    <author>
      <name>User Author</name>
    </author>
    <id>tag:acf-ohs.atlassian.net,2009:page-184516720-11</id>
    <updated>2024-09-13T15:11:34Z</updated>
    <published>2024-09-13T15:11:34Z</published>
    <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
        Page
            &lt;b&gt;edited&lt;/b&gt; by
                    &lt;a  &gt;User Author&lt;/a&gt;
            &lt;/p&gt;
        &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
        &lt;p&gt;Support types are assigned at the objective level for each AR or TR. &lt;/p&gt;&lt;p /&gt;&lt;h2 id="OHSguidanceonTTAsupporttypes-TTAsupporttype"&gt;&lt;strong&gt;TTA support type&lt;/strong&gt;&lt;/h2&gt;&lt;p&gt;TTA support types describe the content of the TTA session and what that content was intended to support the recipient to accomplish. While the support types do build upon each other, there is no expectation that every goal will start with “Introducing” and end with “Maintaining”. Specialists should use the support types to describe the highest level of support offered during the session. When selecting support types consider how the content supports the recipient with:&lt;/p&gt;&lt;h3 id="OHSguidanceonTTAsupporttypes-Introducing"&gt;&lt;strong&gt;Introducing&lt;/strong&gt;&lt;/h3&gt;&lt;p&gt;Introducing and assessing knowledge and/or awareness of concepts, subject matter, and practices.&lt;/p&gt;&lt;p&gt;Use this type for TTA activities that include content such as:&lt;/p&gt;&lt;ul&gt;&lt;li&gt;&lt;p&gt;introducing concepts or new practices&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;assessing participant knowledge&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;needs assessments&lt;/p&gt;&lt;/li&gt;&lt;/ul&gt;&lt;h3 id="OHSguidanceonTTAsupporttypes-Planning"&gt;&lt;strong&gt;Planning&lt;/strong&gt;&lt;/h3&gt;&lt;p&gt;Planning to initiate new/revised services and systems.&lt;/p&gt;&lt;p&gt;Use this type for TTA activities that include content that involves participants developing a plan such as a coaching plan, staff wellness plan, corrective action plan, etc.&lt;/p&gt;&lt;h3 id="OHSguidanceonTTAsupporttypes-Implementing"&gt;&lt;strong&gt;Implementing&lt;/strong&gt;&lt;/h3&gt;&lt;p&gt;Implementing new/revised services and systems.&lt;/p&gt;&lt;p&gt;Use this type for TTA activities that include content such as:&lt;/p&gt;&lt;ul&gt;&lt;li&gt;&lt;p&gt;developing or revising policies and procedures to address a service/system&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;training for staff to implement a new initiative&lt;/p&gt;&lt;/li&gt;&lt;/ul&gt;&lt;h3 id="OHSguidanceonTTAsupporttypes-Maintaining"&gt;&lt;strong&gt;Maintaining&lt;/strong&gt;&lt;/h3&gt;&lt;p&gt;Maintaining and monitoring services and systems and ensuring ongoing quality improvement.&lt;/p&gt;&lt;p&gt;Use this type for TTA activities that include content such as:&lt;/p&gt;&lt;ul&gt;&lt;li&gt;&lt;p&gt;reviewing data to identify needed course corrections&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;reviewing ongoing monitoring data&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;conducting ongoing monitoring&lt;/p&gt;&lt;/li&gt;&lt;li&gt;&lt;p&gt;reviewing progress on program goals&lt;/p&gt;&lt;/li&gt;&lt;/ul&gt;&lt;hr/&gt;&lt;h2 style="text-align: center;" id="OHSguidanceonTTAsupporttypes-Needmorehelp?"&gt;Need more help?&lt;/h2&gt;&lt;p style="text-align: center;"&gt;If you can’t find an answer, &lt;a class="external-link" href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a" rel="nofollow"&gt;contact support&lt;/a&gt;.&lt;/p&gt;
    &lt;/div&gt;
        &lt;div style="padding: 10px 0;"&gt;
       &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/184516720/OHS+guidance+on+TTA+support+types"&gt;email.notification.view.online&lt;/a&gt;
              &amp;middot;
       &lt;a href="https://acf-ohs.atlassian.net/wiki/pages/diffpagesbyversion.action?pageId=184516720&amp;revisedVersion=11&amp;originalVersion=10"&gt;View Changes Online&lt;/a&gt;       
                  &lt;/div&gt;
&lt;/div&gt;</summary>
    <dc:creator>User Author</dc:creator>
    <dc:date>2024-09-13T15:11:34Z</dc:date>
  </entry>
</feed>`;

    act(() => {
      renderContentFromFeed(
        'tag',
        supportTypeResponse,
        null,
        true,
      );
    });

    const article = document.querySelector('.ttahub-feed-article-content');
    expect(article).not.toBeNull();
    const lists = article.querySelectorAll('ul');
    lists.forEach((list) => {
      expect(list).toHaveClass('usa-list');
    });

    const tables = article.querySelectorAll('table');
    tables.forEach((table) => {
      expect(table).toHaveClass('usa-table');
    });

    const paragraphs = article.querySelectorAll('p');
    paragraphs.forEach((paragraph) => {
      expect(paragraph).toHaveClass('usa-prose');
    });

    const links = article.querySelectorAll('a');
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
