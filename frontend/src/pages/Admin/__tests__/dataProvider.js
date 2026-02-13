import fetchMock from 'fetch-mock'
import dataProvider from '../dataProvider'

describe('dataProvider', () => {
  afterEach(() => fetchMock.restore())
  it('getOne', async () => {
    fetchMock.get('/api/admin/butter/1', { id: 1, name: 'butter' })
    await dataProvider.getOne('butter', { id: 1 })

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter/1')
  })
  it('deleteMany', async () => {
    fetchMock.delete('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D', { id: 1, name: 'butter' })
    await dataProvider.deleteMany('butter', { ids: [1, 2] })

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D')
  })
})
