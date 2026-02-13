export const convertToResponse = (reports, isAlerts = false, count = reports.length) =>
  reports.reduce(
    (previous, current) => {
      const { activityRecipients, ...report } = current
      const recipients = activityRecipients.map((recipient) => ({
        ...recipient,
        activityReportId: report.id,
      }))

      return {
        [isAlerts ? 'alerts' : 'rows']: [...previous[isAlerts ? 'alerts' : 'rows'], report],
        recipients: [...previous.recipients, ...recipients],
        [isAlerts ? 'alertsCount' : 'count']: count,
        topics: [],
      }
    },
    {
      [isAlerts ? 'alertsCount' : 'count']: count,
      [isAlerts ? 'alerts' : 'rows']: [],
      recipients: [],
      topics: [],
    }
  )

export const withText = (text) => (content, node) => {
  const hasText = (n) => n.textContent === text
  const nodeHasText = hasText(node)
  const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child))

  return nodeHasText && childrenDontHaveText
}

function mockProperty(obj, property, value) {
  const { [property]: originalProperty } = obj
  // eslint-disable-next-line no-param-reassign
  delete obj[property]
  beforeAll(() => {
    Object.defineProperty(obj, property, {
      configurable: true,
      writable: true,
      value,
    })
  })
  afterAll(() => {
    // eslint-disable-next-line no-param-reassign
    obj[property] = originalProperty
  })
}

export function mockDocumentProperty(property, value) {
  mockProperty(document, property, value)
}

export function mockNavigatorProperty(property, value) {
  mockProperty(navigator, property, value)
}

export function mockWindowProperty(property, value) {
  mockProperty(window, property, value)
}

export function mockRSSData() {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id>
    <entry>
      <title>"Report text" filter to find text in ARs</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115245168" />
      <category term="february2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-115245168-7</id>
      <updated>2023-03-28T22:26:35Z</updated>
      <published>2023-03-28T22:26:35Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
               - "updated with changes made by Patrice on the Whats New page"
          &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Filter by a word, phrase, or sentence and find the Activity Reports where it is used. Visit the knowledge-based articles to learn more about &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/86278145/Filtering+the+Regional+TTA+Dashboard+for+reports+with+specific+text" data-linked-resource-id="86278145" data-linked-resource-version="11" data-linked-resource-type="page"&gt;filtering the Regional TTA Dashboard &lt;/a&gt;or &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/79953921/Filtering+for+Activity+Reports+%28ARs%29+with+specific+text" data-linked-resource-id="79953921" data-linked-resource-version="10" data-linked-resource-type="page"&gt;filtering Activity Reports (ARs)&lt;/a&gt;.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115245168"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-28T22:26:35Z</dc:date>
    </entry>
    <entry>
      <title>Site alerts to keep you informed</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115048567/Site+alerts+to+keep+you+informed" />
      <category term="february2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-115048567-7</id>
      <updated>2023-03-28T22:24:46Z</updated>
      <published>2023-03-28T22:24:46Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
               - "updated with Patrice's changes in the Whats New page"
          &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Site alerts display critical, time-sensitive warnings or directions across every page in the TTA Hub. The TTA Hub team controls how long displays are seen. Learn more about &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/101449729/Alerts+and+messages+in+the+TTA+Hub" data-linked-resource-id="101449729" data-linked-resource-version="4" data-linked-resource-type="page"&gt;alerts and messages&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;&lt;p /&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115048567/Site+alerts+to+keep+you+informed"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-28T22:24:46Z</dc:date>
    </entry>
    <entry>
      <title>Display an AR's submitted date</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115146838/Display+an+AR%27s+submitted+date" />
      <category term="february2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-115146838-9</id>
      <updated>2023-03-28T22:23:41Z</updated>
      <published>2023-03-28T22:23:41Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
               - "updated with changes from Patrice in the Whats New page"
          &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Supporting managers' requests to display when an AR was submitted for approval. Displays on an approved AR and when exporting ARs to CSV. Learn more about the submitted date on the &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/99975260/What+s+new#February-2023---5-features" rel="nofollow"&gt;What’s New&lt;/a&gt; page.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115146838/Display+an+AR%27s+submitted+date"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-28T22:23:41Z</dc:date>
    </entry>
    <entry>
      <title>Celebrate TTA Hub’s two-year anniversary!</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/13/110264579" />
      <category term="march2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-110264579-6</id>
      <updated>2023-03-28T22:20:55Z</updated>
      <published>2023-03-28T22:20:55Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
               - "updated with changes made by Patrice in the Whats New page"
          &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Each user’s &lt;a class="external-link" href="https://ttahub.ohs.acf.hhs.gov/" rel="nofollow"&gt;landing page &lt;/a&gt;displays TTA that was reported since TTA Hub launched in March 2021.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/13/110264579"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-28T22:20:55Z</dc:date>
    </entry>
    <entry>
      <title>Create groups of recipients</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115146811/Create+groups+of+recipients" />
      <category term="march2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-115146811-8</id>
      <updated>2023-03-28T22:17:45Z</updated>
      <published>2023-03-28T22:17:45Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
               - "updated with changes from Patrice in the What's New page"
          &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Use “My groups” to create a recipient group and filter Activity Reports without selecting recipients individually. Learn more about &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115146811/Create+groups+of+recipients"&gt;creating groups&lt;/a&gt; and using the filter in the TTA Hub user guide.&lt;/p&gt;&lt;p /&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/115146811/Create+groups+of+recipients"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-28T22:17:45Z</dc:date>
    </entry>
    <entry>
      <title>Set future dates in ARs to plan future TTA visits</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211265/Set+future+dates+in+ARs+to+plan+future+TTA+visits" />
      <category term="whatsnew" />
      <category term="december2022" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117211265-3</id>
      <updated>2023-03-22T22:25:01Z</updated>
      <published>2023-03-22T22:25:01Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Use the calendar widget or manually enter future dates for the “start date” and “end date” fields in the AR.  Learn more about using the date fields when &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8028189/Entering+a+new+TTA+activity+report" data-linked-resource-id="8028189" data-linked-resource-version="53" data-linked-resource-type="page"&gt;entering a new TTA activity report&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211265/Set+future+dates+in+ARs+to+plan+future+TTA+visits"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T22:25:01Z</dc:date>
    </entry>
    <entry>
      <title>View goals in the AR by creation date</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117244030/View+goals+in+the+AR+by+creation+date" />
      <category term="whatsnew" />
      <category term="december2022" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117244030-3</id>
      <updated>2023-03-22T22:21:38Z</updated>
      <published>2023-03-22T22:21:38Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;See your goals in the same order that they were added to a recipient’s profile. Learn more about &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/38240289/Selecting+goals+in+an+activity+report" data-linked-resource-id="38240289" data-linked-resource-version="27" data-linked-resource-type="page"&gt;selecting goals in an AR&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117244030/View+goals+in+the+AR+by+creation+date"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T22:21:38Z</dc:date>
    </entry>
    <entry>
      <title>Manage follow-up with the anticipated completion date</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211299/Manage+follow-up+with+the+anticipated+completion+date" />
      <category term="november2022" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117211299-2</id>
      <updated>2023-03-22T22:01:51Z</updated>
      <published>2023-03-22T22:01:51Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Set an anticipated completion date for &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/38666241/Goal+summary" data-linked-resource-id="38666241" data-linked-resource-version="15" data-linked-resource-type="page"&gt;recipient goals&lt;/a&gt; and &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/38240539/Next+steps" data-linked-resource-id="38240539" data-linked-resource-version="9" data-linked-resource-type="page"&gt;next steps&lt;/a&gt; when &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8028189/Entering+a+new+TTA+activity+report" data-linked-resource-id="8028189" data-linked-resource-version="53" data-linked-resource-type="page"&gt;entering a new AR&lt;/a&gt; or &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8028231" data-linked-resource-id="8028231" data-linked-resource-version="28" data-linked-resource-type="page"&gt;managing recipient goals&lt;/a&gt;.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211299/Manage+follow-up+with+the+anticipated+completion+date"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T22:01:51Z</dc:date>
    </entry>
    <entry>
      <title>New "TTA type" filter for the Activity Reports page and Regional Dashboard</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/114491576" />
      <category term="february2023" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-114491576-8</id>
      <updated>2023-03-22T21:57:22Z</updated>
      <published>2023-03-22T21:57:22Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Filter data in the Activity Reports page or Regional TTA Dashboard by selecting “Training”, “Technical Assistance”, or both in the TTA type filter. Learn more about using &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8159323/Filtering" data-linked-resource-id="8159323" data-linked-resource-version="28" data-linked-resource-type="page"&gt;filters&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/20/114491576"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:57:22Z</dc:date>
    </entry>
    <entry>
      <title>New "Participants" filter added to the Regional Dashboard</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211381" />
      <category term="november2022" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117211381-2</id>
      <updated>2023-03-22T21:51:57Z</updated>
      <published>2023-03-22T21:51:57Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;edited&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Filter the activity reports page and regional dashboard by AR participants. Learn more about using &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/8159323/Filtering" data-linked-resource-id="8159323" data-linked-resource-version="28" data-linked-resource-type="page"&gt;filters&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117211381"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:51:57Z</dc:date>
    </entry>
    <entry>
      <title>New quick links to the user guide and support form</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117047745/New+quick+links+to+the+user+guide+and+support+form" />
      <category term="november2022" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117047745-1</id>
      <updated>2023-03-22T21:26:10Z</updated>
      <published>2023-03-22T21:26:10Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;added&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Access the &lt;a rel="nofollow"&gt;user guide&lt;/a&gt; or &lt;a class="external-link" href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a" rel="nofollow"&gt;contact support&lt;/a&gt; directly from your profile menu in the TTA Hub.&lt;/p&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117047745/New+quick+links+to+the+user+guide+and+support+form"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:26:10Z</dc:date>
    </entry>
    <entry>
      <title>New profile menu to manage your TTA Hub account</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117539066/New+profile+menu+to+manage+your+TTA+Hub+account" />
      <category term="whatsnew" />
      <category term="november2022" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117539066-1</id>
      <updated>2023-03-22T21:21:45Z</updated>
      <published>2023-03-22T21:21:45Z</published>
      <summary type="html">&lt;div class="feed"&gt;    &lt;p&gt;
          Blog post
              &lt;b&gt;added&lt;/b&gt; by
                      &lt;a      href="/wiki/people/625eecc2b8be7c006a447dc5"
    &gt;Anonymous Hub User&lt;/a&gt;
              &lt;/p&gt;
          &lt;div style="border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px;"&gt;
          &lt;p&gt;Review your profile information, &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/37486933/Verifying+your+email+address" data-linked-resource-id="37486933" data-linked-resource-version="10" data-linked-resource-type="page"&gt;verify your email&lt;/a&gt;, and &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/37748771/Managing+your+email+preferences" data-linked-resource-id="37748771" data-linked-resource-version="14" data-linked-resource-type="page"&gt;manage email preferences&lt;/a&gt; by subscribing/unsubscribing to TTA Hub-related emails. Learn more about &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/pages/37748737/Managing+your+TTA+Hub+account" data-linked-resource-id="37748737" data-linked-resource-version="11" data-linked-resource-type="page"&gt;managing your TTA Hub account&lt;/a&gt; in the TTA Hub user guide.&lt;/p&gt;&lt;p /&gt;
      &lt;/div&gt;
          &lt;div style="padding: 10px 0;"&gt;
         &lt;a href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117539066/New+profile+menu+to+manage+your+TTA+Hub+account"&gt;View Online&lt;/a&gt;
                    &lt;/div&gt;
  &lt;/div&gt;</summary>
      <dc:creator>Anonymous Hub User</dc:creator>
      <dc:date>2023-03-22T21:21:45Z</dc:date>
    </entry>
    <entry>
      <title>Manage recipient goals and objectives from the Recipient’s TTA Record (RTR)</title>
      <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/blog/2023/03/22/117244126" />
      <category term="november2022" />
      <category term="whatsnew" />
      <author>
        <name>Anonymous Hub User</name>
      </author>
      <id>tag:acf-ohs.atlassian.net,2009:blogpost-117244126-1</id>
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
    </entry>
  </feed>  
  `
}
