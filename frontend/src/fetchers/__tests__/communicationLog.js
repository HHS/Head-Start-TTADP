import fetchMock from 'fetch-mock'
import join from 'url-join'
import {
  getCommunicationLogById,
  getCommunicationLogsByRecipientId,
  updateCommunicationLogById,
  deleteCommunicationLogById,
  createCommunicationLogByRecipientId,
  getCommunicationLogs,
  createRegionalCommunicationLog,
  getAdditionalCommunicationLogData,
} from '../communicationLog'

describe('communcation log fetchers', () => {
  afterEach(() => fetchMock.restore())

  it('getAdditionalCommunicationLogData', async () => {
    const regionId = 1
    const url = join('api', 'communication-logs', 'region', String(regionId), 'additional-data')
    const data = { test: 'test' }
    fetchMock.getOnce(url, data)
    await getAdditionalCommunicationLogData(regionId)
    expect(fetchMock.lastUrl()).toContain(url)
  })

  it('getCommunicationLogById', async () => {
    const regionId = 1
    const logId = 2
    const url = join('api', 'communication-logs', 'region', regionId.toString(10), 'log', logId.toString(10))
    const data = { test: 'test' }
    fetchMock.getOnce(url, data)
    await getCommunicationLogById(regionId, logId)
    expect(fetchMock.lastUrl()).toContain(url)
  })

  it('getCommunicationLogsByRecipientId (json)', async () => {
    const regionId = 1
    const recipientId = 2
    const url = join('api', 'communication-logs', 'region', regionId.toString(10), 'recipient', recipientId.toString(10))
    const data = { test: 'test' }
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&`, data)
    await getCommunicationLogsByRecipientId(regionId, recipientId, 'communicationDate', 'desc', 0)
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).toContain('format=json')
    expect(fetchMock.lastUrl()).toContain('limit=10')
  })

  it('getCommunicationLogsByRecipientId (csv)', async () => {
    const regionId = 1
    const recipientId = 2
    const url = join('api', 'communication-logs', 'region', regionId.toString(10), 'recipient', recipientId.toString(10))
    const data = new Blob(['test'])
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=csv&`, data)
    await getCommunicationLogsByRecipientId(regionId, recipientId, 'communicationDate', 'desc', 0, 10, [], 'csv')
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).toContain('format=csv')
    expect(fetchMock.lastUrl()).toContain('limit=10')
  })

  it('getCommunicationLogsByRecipientId (no limit)', async () => {
    const regionId = 1
    const recipientId = 2
    const url = join('api', 'communication-logs', 'region', regionId.toString(10), 'recipient', recipientId.toString(10))
    const data = { test: 'test' }
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&format=json&`, data)
    await getCommunicationLogsByRecipientId(regionId, recipientId, 'communicationDate', 'desc', 0, null)
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).not.toContain('limit=')
  })

  it('getCommunicationLogs (json)', async () => {
    const url = join('api', 'communication-logs', 'region')
    const data = { test: 'test' }
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&`, data)
    await getCommunicationLogs('communicationDate', 'desc', 0)
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).toContain('format=json')
    expect(fetchMock.lastUrl()).toContain('limit=10')
  })

  it('getCommunicationLogs (csv)', async () => {
    const url = join('api', 'communication-logs', 'region')
    const data = new Blob(['test'])
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=csv&`, data)
    await getCommunicationLogs('communicationDate', 'desc', 0, 10, [], 'csv')
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).toContain('format=csv')
    expect(fetchMock.lastUrl()).toContain('limit=10')
  })

  it('getCommunicationLogs (no limit)', async () => {
    const url = join('api', 'communication-logs', 'region')
    const data = { test: 'test' }
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&format=json&`, data)
    await getCommunicationLogs('communicationDate', 'desc', 0, null)
    expect(fetchMock.lastUrl()).toContain(url)
    expect(fetchMock.lastUrl()).not.toContain('limit=')
  })

  it('updateCommunicationLogById', async () => {
    const logId = 1
    const url = join('api', 'communication-logs', 'log', logId.toString(10))
    const data = { test: 'test' }
    fetchMock.putOnce(url, data)
    await updateCommunicationLogById(logId, data)
    expect(fetchMock.lastUrl()).toContain(url)
  })

  it('deleteCommunicationLogById', async () => {
    const logId = 1
    const url = join('api', 'communication-logs', 'log', String(logId))
    const data = { test: 'test' }
    fetchMock.deleteOnce(url, data)
    await deleteCommunicationLogById(logId)
    expect(fetchMock.lastUrl()).toContain(url)
  })

  it('createRegionalCommunicationLog', async () => {
    const regionId = 1
    const url = join('api', 'communication-logs', 'region', String(regionId))
    const data = { test: 'test' }
    fetchMock.postOnce(url, data)
    await createRegionalCommunicationLog(regionId, data)
    expect(fetchMock.lastUrl()).toContain(url)
  })

  it('createCommunicationLogByRecipientId', async () => {
    const regionId = 1
    const recipientId = 2
    const url = join('api', 'communication-logs', 'region', regionId.toString(10), 'recipient', recipientId.toString(10))
    const data = { test: 'test' }
    fetchMock.postOnce(url, data)
    await createCommunicationLogByRecipientId(regionId, recipientId, data)
    expect(fetchMock.lastUrl()).toContain(url)
  })
})
