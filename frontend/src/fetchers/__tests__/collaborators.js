import join from 'url-join'
import fetchMock from 'fetch-mock'
import { getCollaborators } from '../collaborators'

describe('Collaborators Fetcher', () => {
  afterEach(() => fetchMock.restore())

  describe('getCollaborators', () => {
    it('fetches collaborators for a given region', async () => {
      const region = 1
      const mockResponse = [{ id: 1, name: 'John Doe' }]
      fetchMock.get(join('/api/users/collaborators', `?region=${region}`), mockResponse)

      const collaborators = await getCollaborators(region)

      expect(fetchMock.called()).toBeTruthy()
      expect(collaborators).toEqual(mockResponse)
    })
  })
})
