import { CardGroup, Card } from '@trussworks/react-uswds';
import React, { useState, useEffect } from 'react';

export default function FeedTest() {
  const [feed, setFeed] = useState();

  useEffect(() => {
    async function fetchFeed() {
      const res = await fetch('/api/feeds');
      const data = await res.text();
      setFeed(data);
    }

    if (feed === undefined) {
      fetchFeed();
    }
  }, [feed]);

  const dom = feed ? new window.DOMParser().parseFromString(feed, 'text/xml') : null;

  if (!dom) {
    return 'Loading...';
  }

  const entries = dom.querySelectorAll('entry');

  return (
    <div>
      <h1>Feed Test</h1>
      <CardGroup>
        {Array.from(entries).map((entry) => (
          <Card
            gridLayout={{ tablet: { col: 6 } }}
            key={entry.querySelector('id').textContent}
            className="padding-1"
          >
            <h2 className="margin-0 padding-2">
              {entry.querySelector('title').innerHTML}
            </h2>
            <div
              className="usa-prose padding-2"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: entry.querySelector('summary').textContent }}
            />
          </Card>
        ))}
      </CardGroup>
    </div>
  );
}
