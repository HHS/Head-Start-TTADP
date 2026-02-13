import axios from 'axios'
import getCachedResponse from '../lib/cache'

const CONFLUENCE_BASE = 'https://acf-ohs.atlassian.net/wiki/createrssfeed.action'

const FEED_URLS = {
  whatsNew: `${CONFLUENCE_BASE}?types=blogpost&spaces=conf_all&title=Whats+New&labelString=whatsnew&excludedSpaceKeys%3D&sort=modified&maxResults=10&timeSpan=90&showContent=true&confirm=Create+RSS+Feed&os_authType=basic`,
  singleByTag: (tag: string) =>
    `${CONFLUENCE_BASE}?types=page&types=blogpost&spaces=conf_all&title=Tag+${tag}&labelString=${tag}&excludedSpaceKeys%3D&sort=modified&maxResults=1&timeSpan=365&showContent=true&confirm=Create+RSS+Feed&os_authType=basic`,
  classGuidance: `${CONFLUENCE_BASE}?types=page&spaces=OHSTTA&title=Confluence+RSS+Feed&labelString=ttahub-class-thresholds&excludedSpaceKeys%3D&sort=modified&maxResults=10&timeSpan=5&showContent=true&confirm=Create+RSS+Feed&os_authType=basic`,
}

export async function fetchFeed(feedAddress: string) {
  const { data } = await axios.get(feedAddress)
  return data
}

export async function getWhatsNewFeedData() {
  const callback = () => fetchFeed(FEED_URLS.whatsNew)

  return getCachedResponse(FEED_URLS.whatsNew, callback)
}

export async function getSingleFeedData(tag: string) {
  const callback = () => fetchFeed(FEED_URLS.singleByTag(tag))

  return getCachedResponse(FEED_URLS.singleByTag(tag), callback)
}
