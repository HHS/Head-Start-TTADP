import '@testing-library/jest-dom'
import React, { createRef } from 'react'
import { render, waitFor, act, screen } from '@testing-library/react'
import BarGraph from '../BarGraph'

const TEST_DATA = [
  {
    category: 'one',
    count: 1,
  },
  {
    category: 'two / two and a half',
    count: 2,
  },
  {
    category: 'three is the number than comes after two and with that we think about it',
    count: 0,
  },
]

const renderBarGraph = (data = TEST_DATA) => {
  act(() => {
    render(<BarGraph data={data} widgetRef={createRef()} />)
  })
}

describe('Bar Graph', () => {
  it('handles null data', () => {
    renderBarGraph(null)
    expect(document.querySelector('svg')).toBe(null)
  })
  it('is shown', async () => {
    renderBarGraph()

    await waitFor(() => expect(document.querySelector('svg')).not.toBe(null))

    const point1 = document.querySelector('g.ytick')
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe('one')

    const point2 = document.querySelector('g.xtick')
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe('0')
  })

  it('shows no results found', async () => {
    renderBarGraph([])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no results found\./i })).toBeDefined()
      expect(screen.getByText('Try removing or changing the selected filters.')).toBeDefined()
      expect(screen.getByText('Get help using filters')).toBeDefined()
    })
  })
})
