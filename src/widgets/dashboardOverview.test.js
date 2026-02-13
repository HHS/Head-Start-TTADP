import dashboardOverview from './dashboardOverview'
import overview from './overview'

describe('dashboardOverview', () => {
  it('exports the overview function', () => {
    expect(dashboardOverview).toBe(overview)
  })
})
