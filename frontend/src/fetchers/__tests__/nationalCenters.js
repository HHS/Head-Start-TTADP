import fetchMock from 'fetch-mock'
import join from 'url-join'
import { getNationalCenters } from '../nationalCenters'

const nationalCentersUrl = join('/', 'api', 'national-center')

describe('getNationalCenters', () => {
  it('should return the national centers', async () => {
    fetchMock.get(nationalCentersUrl, [
      {
        id: 1,
        name: 'National Center 1',
        mapsTo: 1,
      },
    ])

    const nationalCenters = await getNationalCenters()

    expect(nationalCenters).toEqual([
      {
        id: 1,
        name: 'National Center 1',
        mapsTo: 1,
      },
    ])
  })
})
