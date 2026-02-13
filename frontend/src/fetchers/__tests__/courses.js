import fetchMock from 'fetch-mock'
import { getCourses } from '../courses'

describe('Courses fetcher', () => {
  beforeEach(() => fetchMock.reset())

  it('fetches Courses', async () => {
    fetchMock.get('/api/courses', [])
    await getCourses()

    expect(fetchMock.called()).toBeTruthy()
  })
})
