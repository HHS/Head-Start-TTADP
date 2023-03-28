import axios from 'axios';
import getCachedResponse from '../lib/cache';

const FEED_URLS = {
  whatsNew: 'https://acf-ohs.atlassian.net/wiki/createrssfeed.action?types=page&pageSubTypes=comment&spaces=conf_all&title=Confluence+RSS+Feed&labelString=releasenotes&excludedSpaceKeys%3D&sort=modified&maxResults=10&timeSpan=5&showContent=true&confirm=Create+RSS+Feed&os_authType=basic',
};

export async function fetchFeed(feedAddress: string) {
  const { data } = await axios.get(feedAddress);
  return data;
}

export async function getWhatsNewFeedData() {
  const callback = () => fetchFeed(FEED_URLS.whatsNew);

  return getCachedResponse(
    FEED_URLS.whatsNew,
    callback,
    {
      EX: 60,
    },
  );
}
