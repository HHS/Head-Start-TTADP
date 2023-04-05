import axios from 'axios';
import getCachedResponse from '../lib/cache';

const FEED_URLS = {
  whatsNew: 'https://acf-ohs.atlassian.net/wiki/createrssfeed.action?types=blogpost&spaces=conf_all&title=Whats+New&labelString=whatsnew&excludedSpaceKeys%3D&sort=modified&maxResults=25&timeSpan=90&showContent=true&confirm=Create+RSS+Feed&os_authType=basic',
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
