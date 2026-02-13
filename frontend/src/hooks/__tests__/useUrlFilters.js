import '@testing-library/jest-dom'
import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import useUrlFilters from '../useUrlFilters'

const UrlFilters = () => {
  const [filters] = useUrlFilters('test')

  return <pre id="filters">{JSON.stringify(filters)}</pre>
}

const renderUrlFilters = () =>
  render(
    <MemoryRouter initialEntries={['/dashboards/regional-dashboard/activity-reports?topic.in[]=Behavioral%20%2F%20Mental%20Health%20%2F%20Trauma']}>
      <UrlFilters />
    </MemoryRouter>
  )

describe('useUrlFilters', () => {
  it('saves state to local storage', async () => {
    renderUrlFilters()

    const filters = JSON.parse(document.querySelector('#filters').textContent)
    expect(filters.length).toBe(1)
    expect(filters[0].topic).toBe('topic')
    expect(filters[0].condition).toBe('is')
    expect(JSON.stringify(filters[0].query)).toBe(JSON.stringify(['Behavioral / Mental Health / Trauma']))
  })
})
