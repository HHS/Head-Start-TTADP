import fetchMock from 'fetch-mock'
import join from 'url-join'
import { getNotifications, getSingleFeedItemByTag } from '../feed'

const feedUrl = join('/', 'api', 'feeds')

describe('notifications fetcher', () => {
  afterEach(() => fetchMock.reset())
  it('getNotifications', async () => {
    const whatsNewUrl = join(feedUrl, 'whats-new')
    const response = '<html><some-weird-xml-tag attr="guid" /></html>'
    fetchMock.get(whatsNewUrl, response)
    const results = await getNotifications()
    expect(results).toEqual(response)
  })

  it('getSingleFeedItemByTag', async () => {
    const getSingleFeedItemByTagUrl = join(feedUrl, 'item', '?tag=tag')
    const response = '<html><some-weird-xml-tag attr="guid" /></html>'
    fetchMock.get(getSingleFeedItemByTagUrl, response)
    const results = await getSingleFeedItemByTag('tag')
    expect(results).toEqual(response)
  })
})
